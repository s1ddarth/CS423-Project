import { Canvas, PaintStyle, Path, Skia, SkPath, StrokeCap, StrokeJoin } from '@shopify/react-native-skia';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { PDollarRecognizer, Point } from '../recognizer/pdollar';
import { ArrowPoint, ArrowRecognizer } from '../recognizer/pdollar-arrows';

// const BASE_URL = 'http://localhost:8000';
const BASE_URL = 'http://10.0.0.81:8000';

const BACKEND_URL = `${BASE_URL}/recognize/upload`;

/*
  How long to wait after the last stroke lifts before running arrow recognition.
  If the user puts their finger down again within this window the new stroke
  joins the same gesture rather than starting a new one.
*/
const GESTURE_TIMEOUT_MS = 500;

/*
  Pt represents a raw finger coordinate.
  We added this because SkPath does not expose its internal geometry.
  To erase strokes, we need access to the actual x/y points.
*/
type Pt = { x: number; y: number };

/*
  HistoryEntry:
  Snapshot of canvas state for undo/redo.
  Stores both SkPath[] and Pt[][] together so the eraser
  still has geometry data after an undo.
*/
type HistoryEntry = { paths: SkPath[]; pts: Pt[][] };

/*
  dist:
  Returns actual Euclidean distance between two points.
  Used when calculating total scribble path length.
*/
function dist(a: Pt, b: Pt) {
  // sqrt((dx)^2 + (dy)^2)
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/*
  dist2:
  Same as dist but without square root.
  Used when we only compare distances (faster).
*/
function dist2(a: Pt, b: Pt) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function convertToArrowPDollar(strokes: Pt[][]) {
  const pts: any[] = [];

  strokes.forEach((stroke, strokeId) => {
    stroke.forEach((p) => {
      pts.push(new ArrowPoint(p.x, p.y, strokeId));
    });
  });

  return pts;
}

function pointToSegDist2(p: Pt, a: Pt, b: Pt) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;

  const apx = p.x - a.x;
  const apy = p.y - a.y;

  const abLen2 = abx * abx + aby * aby;

  if (abLen2 === 0) return dist2(p, a);

  let t = (apx * abx + apy * aby) / abLen2;
  t = Math.max(0, Math.min(1, t));

  const cx = a.x + t * abx;
  const cy = a.y + t * aby;

  return dist2(p, { x: cx, y: cy });
}

function strokeHitTest(strokePts: Pt[], p: Pt, radius: number) {
  const r2 = radius * radius;

  for (let i = 1; i < strokePts.length; i++) {
    if (pointToSegDist2(p, strokePts[i - 1], strokePts[i]) <= r2) {
      return true;
    }
  }

  for (const pt of strokePts) {
    if (dist2(p, pt) <= r2) {
      return true;
    }
  }

  return false;
}



/*
  hasArrowhead detects a direction reversal measured over a window of points
  rather than adjacent pairs (touchscreen data is too smooth for that).
  Only used in the debug log — remove along with the log once tuning is done.
*/
function hasArrowhead(pts: Pt[]): boolean {
  if (pts.length < 6) return false;

  const W             = Math.max(2, Math.floor(pts.length / 8));
  const THRESHOLD_COS = Math.cos((20 * Math.PI) / 180);

  let sharpestCos = 1.0;
  let kinkCount   = 0;

  for (let i = W; i < pts.length - W; i++) {
    const ax = pts[i].x - pts[i - W].x;
    const ay = pts[i].y - pts[i - W].y;
    const bx = pts[i + W].x - pts[i].x;
    const by = pts[i + W].y - pts[i].y;
    const na = Math.hypot(ax, ay);
    const nb = Math.hypot(bx, by);
    if (na < 4 || nb < 4) continue;
    const cosAngle = (ax * bx + ay * by) / (na * nb);
    if (cosAngle < sharpestCos) sharpestCos = cosAngle;
    if (cosAngle < THRESHOLD_COS) kinkCount++;
  }

  if (sharpestCos >= THRESHOLD_COS) return false;
  if (kinkCount > 4 * W) return false;
  return true;
}

export function HandwritingCanvas({
  style,
  strokeColor = '#111',
  strokeWidth = 3,
  onRecognize, // triggers upon receiving latex from backend
  onUndo,
  onRedo,
  onClearAll,
}: {
  style?: object;
  strokeColor?: string;
  strokeWidth?: number;
  onRecognize?: (latex: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onClearAll?: () => void;
}) {
  "use no memo"; // disable React Compiler — it rebuilds Gesture.Pan() mid-stroke
                 // which fires a second onBegin and resets the active stroke

  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const [paths, setPaths] = useState<SkPath[]>([]);
  const [pathsPts, setPathsPts] = useState<Pt[][]>([]);

  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
  const currentPathRef = useRef<SkPath | null>(null);

  const [pendingPaths, setPendingPaths] = useState<SkPath[]>([]);

  const [tool, setTool] = useState<'pen' | 'select'>('pen');

  const [selectPath, setSelectPath] = useState<SkPath | null>(null);
  const selectPathRef = useRef<SkPath | null>(null);

  // Refs ensure erase logic always uses latest arrays.
  // NOTE: these are NOT assigned from state on every render (that was the
  // original bug — it clobbered mid-stroke writes). They are only written
  // by the functions that own them.
  const pathsRef    = useRef<SkPath[]>([]);
  const pathsPtsRef = useRef<Pt[][]>([]);

  // Tool ref so the gesture (built once) always sees the current tool value
  const toolRef = useRef<'pen' | 'select'>('pen');

  const pointsRef    = useRef<Pt[]>([]);
  const selectPtsRef = useRef<Pt[]>([]);

  // True once gesture is classified as scribble
  const isErasingRef = useRef(false);

  // Controls how forgiving erase is
  const eraserRadius = 20;

  const arrowRecognizerRef = useRef<any>(new ArrowRecognizer());
  const scribbleRecognizerRef = useRef<any>(new PDollarRecognizer());
  // Arrow gesture buffer
  const gestureStrokesRef = useRef<Pt[][]>([]);
  const pendingPathsRef   = useRef<SkPath[]>([]);
  const gestureTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Undo / redo ────────────────────────────────────────────────────────────

  // Parallel stacks — each entry is a full canvas snapshot
  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);

  // Stack to store both canvas strokes and LaTeX actions
  const actionStackRef     = useRef<Array<'canvas' | 'latex'>>([]);
  const redoActionStackRef = useRef<Array<'canvas' | 'latex'>>([]);

  // Drive the enabled/disabled state of the toolbar buttons
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // One history snapshot per erase gesture (not per erased stroke)
  const eraseSnapshotTaken = useRef(false);

  /*
    syncButtons:
    Reads the stack lengths and updates the button state.
    Called after every push/pop so the toolbar stays in sync.
  */
  const syncButtons = () => {
    setCanUndo(actionStackRef.current.length > 0);
    setCanRedo(redoActionStackRef.current.length > 0);
  };

  /*
    pushHistory:
    Snapshots the current canvas onto the undo stack and clears redo.
    Call this BEFORE every destructive change (new stroke, erase, clear).
  */
  const pushHistory = useCallback(() => {
    undoStack.current.push({
      paths: [...pathsRef.current],
      pts:   pathsPtsRef.current.map(a => [...a]),
    });
    redoStack.current = [];
    actionStackRef.current.push('canvas');
    redoActionStackRef.current = [];
    syncButtons();
  }, []);

  /*
    applyEntry:
    Restores both refs and state from a history snapshot.
    Used by both undo and redo.
  */
  const applyEntry = useCallback((entry: HistoryEntry) => {
    pathsRef.current    = entry.paths;
    pathsPtsRef.current = entry.pts;
    setPaths([...entry.paths]);
    setPathsPts(entry.pts.map(a => [...a]));
  }, []);

  /*
    undo:
    Pops the undo stack, pushes current state to redo, restores previous state.
  */
  const undo = useCallback(() => {
    if (!actionStackRef.current.length) return;

    const kind = actionStackRef.current.pop()!;

    if (kind === 'canvas') {
      if (!undoStack.current.length) {
        syncButtons();
        return;
      }
      const prev = undoStack.current.pop()!;
      redoStack.current.push({
        paths: [...pathsRef.current],
        pts:   pathsPtsRef.current.map(a => [...a]),
      });
      applyEntry(prev);
    } else {
      onUndo?.();
    }

    redoActionStackRef.current.push(kind);
    syncButtons();
  }, [applyEntry, onUndo]);

  /*
    redo:
    Pops the redo stack, pushes current state to undo, restores next state.
  */
  const redo = useCallback(() => {
    if (!redoActionStackRef.current.length) return;

    const kind = redoActionStackRef.current.pop()!;

    if (kind === 'canvas') {
      if (!redoStack.current.length) {
        syncButtons();
        return;
      }
      const next = redoStack.current.pop()!;
      undoStack.current.push({
        paths: [...pathsRef.current],
        pts:   pathsPtsRef.current.map(a => [...a]),
      });
      applyEntry(next);
    } 
    else onRedo?.();

    actionStackRef.current.push(kind);
    syncButtons();
  }, [applyEntry, onRedo]);

  // Stable refs so the gesture object (built once at mount) always calls
  // the latest versions of undo/redo/pushHistory without needing to rebuild.
  const undoRef        = useRef(undo);
  const redoRef        = useRef(redo);
  const pushHistoryRef = useRef(pushHistory);
  undoRef.current        = undo;
  redoRef.current        = redo;
  pushHistoryRef.current = pushHistory;

  /*
    eraseAt:
    Removes strokes that are close to point p.
    Called repeatedly while scribbling.
  */
  const eraseAt = (p: Pt) => {
    const prevPaths = pathsRef.current;
    const prevPts   = pathsPtsRef.current;

    const keepIdx: number[] = [];

    for (let i = 0; i < prevPts.length; i++) {
      if (!strokeHitTest(prevPts[i], p, eraserRadius)) {
        keepIdx.push(i);
      }
    }

    const newPaths = keepIdx.map((i) => prevPaths[i]);
    const newPts   = keepIdx.map((i) => prevPts[i]);

    // Update refs immediately so next erase call sees updated data
    pathsRef.current    = newPaths;
    pathsPtsRef.current = newPts;

    setPaths(newPaths);
    setPathsPts(newPts);
  };

  /*
    clearAll:
    Wipes the canvas. Pushes to history first so it can be undone.
  */
  const clearAll = () => {
    if (!pathsRef.current.length) return;
    pushHistoryRef.current();
    pathsRef.current    = [];
    pathsPtsRef.current = [];

    setPaths([]);
    setPathsPts([]);

    currentPathRef.current = null;
    setCurrentPath(null);
    // After clearing, always return to pen mode
    setTool('pen');
    toolRef.current        = 'pen';
    selectPathRef.current  = null;
    setSelectPath(null);
    selectPtsRef.current   = [];
    pointsRef.current      = [];
    isErasingRef.current   = false;
    if (gestureTimerRef.current !== null) {
      clearTimeout(gestureTimerRef.current);
      gestureTimerRef.current = null;
    }
    gestureStrokesRef.current = [];
    pendingPathsRef.current   = [];
    setPendingPaths([]);
    onClearAll?.();
  };

  /*
    finalizeArrowGesture fires when the gesture timer expires.
    Runs the arrow recognizer on buffered strokes:
    arrow-left triggers undo, arrow-right triggers redo, no match
    commits all held strokes to canvas as individual history entries.
  */
  const finalizeArrowGesture = useCallback(() => {
    const strokes = gestureStrokesRef.current;
    const pending = pendingPathsRef.current;
    gestureStrokesRef.current = [];
    pendingPathsRef.current   = [];
    gestureTimerRef.current   = null;

    if (strokes.length === 0) return;

    setPendingPaths([]);

    const result = arrowRecognizerRef.current.Recognize(convertToArrowPDollar(strokes));
    // Debug line to fix arrows to remove wavy and irregular lines as arrow gestures
    // console.log('[Arrow] $P result:', result.Name, '| score:', result.Score.toFixed(3), '| strokes:', strokes.length);

    if (result.Name === 'arrow-left') {
      undoRef.current();
      return;
    }

    if (result.Name === 'arrow-right') {
      redoRef.current();
      return;
    }

    // No arrow match — commit each held stroke as its own history entry
    for (let i = 0; i < strokes.length; i++) {
      pushHistoryRef.current();
      const newPaths = [...pathsRef.current, pending[i]];
      const newPts   = [...pathsPtsRef.current, [...strokes[i]]];
      pathsRef.current    = newPaths;
      pathsPtsRef.current = newPts;
      setPaths([...newPaths]);
      setPathsPts(newPts.map(a => [...a]));
    }
  }, []);

  const finalizeArrowGestureRef = useRef(finalizeArrowGesture);
  finalizeArrowGestureRef.current = finalizeArrowGesture;

  /*
    Pan gesture — built once via useRef so React Compiler can never
    reconstruct it mid-stroke (which caused phantom onBegin events).
    All mutable values are read through refs inside the callbacks.
  */
  const panRef = useRef<ReturnType<typeof Gesture.Pan> | null>(null);
  if (panRef.current === null) {
    panRef.current = Gesture.Pan()
      .minDistance(0)
      .runOnJS(true)

      .onBegin((e) => {
        const p = Skia.Path.Make();
        p.moveTo(e.x, e.y);
        p.lineTo(e.x, e.y);

        // Initialize new gesture tracking
        pointsRef.current          = [{ x: e.x, y: e.y }];
        isErasingRef.current       = false;
        eraseSnapshotTaken.current = false;

        if (toolRef.current === 'pen') {
          // Cancel the pending timer — new stroke may extend the same arrow gesture
          if (gestureTimerRef.current !== null) {
            clearTimeout(gestureTimerRef.current);
            gestureTimerRef.current = null;
          }
          currentPathRef.current = p;
          setCurrentPath(p.copy());
        } else {
          selectPtsRef.current  = [{ x: e.x, y: e.y }];
          selectPathRef.current = p;
          setSelectPath(p.copy());
        }
      })

      .onUpdate((e) => {
        if (toolRef.current === 'pen') {
          const pt = { x: e.x, y: e.y };
          pointsRef.current.push(pt);

          const spanX = Math.max(...pointsRef.current.map(p => p.x)) - Math.min(...pointsRef.current.map(p => p.x));
          const spanY = Math.max(...pointsRef.current.map(p => p.y)) - Math.min(...pointsRef.current.map(p => p.y));
          const looksHorizontal = spanX > 75 && spanX > spanY * 2.5;

          // Only run $P every 8 points to avoid lag — recognition still works fine
          if (!isErasingRef.current && !looksHorizontal && pointsRef.current.length % 8 === 0) {
          const pdollarPts = pointsRef.current.map((p) => new Point(p.x, p.y, 0));
          const scribbleResult = scribbleRecognizerRef.current.Recognize(pdollarPts);
          if (scribbleResult.Name === 'scribble') {
            isErasingRef.current   = true;
            currentPathRef.current = null;
            setCurrentPath(null);

            if (gestureTimerRef.current !== null) {
              clearTimeout(gestureTimerRef.current);
              gestureTimerRef.current   = null;
              gestureStrokesRef.current = [];
              if (pendingPathsRef.current.length > 0) {
                pendingPathsRef.current = [];
                setPendingPaths([]);
              }
            }
          }
        }

          // If scribbling, erase instead of drawing.
          // Take one history snapshot for the whole gesture, not per stroke.
          if (isErasingRef.current) {
            if (!eraseSnapshotTaken.current) {
              pushHistoryRef.current();
              eraseSnapshotTaken.current = true;
            }
            eraseAt(pt);
            const pts = pointsRef.current;
            for (let i = Math.max(0, pts.length - 10); i < pts.length; i++) {
              eraseAt(pts[i]);
            }
            return;
          }

          // Normal pen drawing
          const p = currentPathRef.current;
          if (!p) return;
          p.lineTo(e.x, e.y);
          setCurrentPath(p.copy());

        } else {
          const p = selectPathRef.current;
          if (!p) return;
          selectPtsRef.current.push({ x: e.x, y: e.y });
          p.lineTo(e.x, e.y);
          setSelectPath(p.copy());
        }
      })

      .onEnd(() => {
        if (toolRef.current === 'pen') {

          // If scribble, do not commit stroke
          if (isErasingRef.current) {
            isErasingRef.current       = false;
            eraseSnapshotTaken.current = false;
            pointsRef.current          = [];
            currentPathRef.current     = null;
            setCurrentPath(null);
            return;
          }

          const pts = pointsRef.current;
          const p   = currentPathRef.current;

          if (p && pts.length > 1) {
            const committed = p.copy();

            // ── Arrow gate ────────────────────────────────────────────────
            // Thresholds derived from real iPad data — see decision log in git.
            // Remove the console.log once gate tuning is complete.
            const xs   = pts.map(pt => pt.x);
            const ys   = pts.map(pt => pt.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const w    = maxX - minX;
            const h    = Math.max(...ys) - Math.min(...ys);

            const netDx               = Math.abs(pts[pts.length - 1].x - pts[0].x);
            const netDisplacementRatio = w > 0 ? netDx / w : 0;

            let arcLen = 0;
            for (let i = 1; i < pts.length; i++) arcLen += dist(pts[i - 1], pts[i]);
            const chordLen   = dist(pts[0], pts[pts.length - 1]);
            const arcToChord = chordLen > 0 ? arcLen / chordLen : 99;

            const endX          = pts[pts.length - 1].x;
            const goesLeft      = endX < pts[0].x;
            const tipX          = goesLeft ? minX : maxX;
            const comeBackRatio = w > 0 ? Math.abs(endX - tipX) / w : 0;

            // Left: real arrows return 0-28% from tip; writing strokes return 30%+
            // Right: real arrows return 0-24%; writing strokes return 26%+
            const comeBackOK = goesLeft ? (comeBackRatio < 0.28) : (comeBackRatio < 0.24);

            // Count significant vertical direction reversals using stepped windows to
            // avoid noise. Real arrows cross cleanly (0-3). Wavy lines oscillate (5+).
            // yRevs==4 is allowed only when a direction change (arrowhead) is detected —
            // that distinguishes a deliberate arrow from a wide wavy writing stroke.
            const arrowhead = hasArrowhead(pts);
            const step = Math.max(2, Math.floor(pts.length / 15));
            let yRevs  = 0;
            let prevDy = 0;
            for (let i = step; i < pts.length; i += step) {
              const dy = pts[i].y - pts[i - step].y;
              if (Math.abs(dy) < 3) continue;
              if (prevDy > 0 && dy < 0) yRevs++;
              if (prevDy < 0 && dy > 0) yRevs++;
              prevDy = dy;
            }
            const notWavy = yRevs <= 3 || (yRevs === 4 && arrowhead);

            const looksLikeArrow = w > 75
              && w > h
              && netDisplacementRatio > 0.4
              && arcToChord < 3.5
              && comeBackOK
              && notWavy;
            
            // Logs to see the arrows if they go haywire
            
            // console.log('[ARROW GATE]',
            //   'w='         + w.toFixed(0),
            //   'h='         + h.toFixed(0),
            //   'wh='        + (w / h).toFixed(2),
            //   'netDisp='   + netDisplacementRatio.toFixed(2),
            //   'arc2chord=' + arcToChord.toFixed(2),
            //   'cb='        + comeBackRatio.toFixed(3),
            //   'yRevs='     + yRevs,
            //   'arrowhead=' + arrowhead,
            //   '=>'         + (looksLikeArrow ? 'PASS' : 'FAIL')
            // );

            if (looksLikeArrow) {
              gestureStrokesRef.current.push([...pts]);
              pendingPathsRef.current.push(committed);
              setPendingPaths([...pendingPathsRef.current]);

              pointsRef.current      = [];
              currentPathRef.current = null;
              setCurrentPath(null);

              if (gestureTimerRef.current !== null) clearTimeout(gestureTimerRef.current);
              gestureTimerRef.current = setTimeout(() => {
                finalizeArrowGestureRef.current();
              }, GESTURE_TIMEOUT_MS);
              return;
            }

            // Normal stroke — flush any held arrow strokes first so ordering stays correct
            if (pendingPathsRef.current.length > 0) {
              if (gestureTimerRef.current !== null) {
                clearTimeout(gestureTimerRef.current);
                gestureTimerRef.current = null;
              }
              const heldStrokes = gestureStrokesRef.current;
              const heldPaths   = pendingPathsRef.current;
              gestureStrokesRef.current = [];
              pendingPathsRef.current   = [];
              setPendingPaths([]);
              for (let i = 0; i < heldStrokes.length; i++) {
                pushHistoryRef.current();
                const np  = [...pathsRef.current, heldPaths[i]];
                const npt = [...pathsPtsRef.current, [...heldStrokes[i]]];
                pathsRef.current    = np;
                pathsPtsRef.current = npt;
              }
            }

            pushHistoryRef.current();
            const newPaths = [...pathsRef.current, committed];
            const newPts   = [...pathsPtsRef.current, [...pts]];
            pathsRef.current    = newPaths;
            pathsPtsRef.current = newPts;
            setPaths(newPaths);
            setPathsPts(newPts);

            pointsRef.current      = [];
            currentPathRef.current = null;
            setCurrentPath(null);

            if (gestureTimerRef.current !== null) clearTimeout(gestureTimerRef.current);
            gestureTimerRef.current = setTimeout(() => {
              finalizeArrowGestureRef.current();
            }, GESTURE_TIMEOUT_MS);
            return;
          }

          // Normal stroke — push history then commit
          if (p) {
            pushHistoryRef.current();
            const newPaths = [...pathsRef.current, p];
            const newPts   = [...pathsPtsRef.current, [...pts]];
            pathsRef.current    = newPaths;
            pathsPtsRef.current = newPts;
            setPaths(newPaths);
            setPathsPts(newPts);
          }

          pointsRef.current      = [];
          currentPathRef.current = null;
          setCurrentPath(null);

        } else {
          // Close the selection path and send it to the backend
          const lassoPts = selectPtsRef.current;

          // Omit short shapes
          if (lassoPts.length >= 3) {

            // Close it
            const sp = selectPathRef.current;
            if (sp) {
              sp.close();
              setSelectPath(sp.copy());
            }

            // Compute bounding box of the lasso region
            let minX = lassoPts[0].x, maxX = lassoPts[0].x;
            let minY = lassoPts[0].y, maxY = lassoPts[0].y;
            for (const pt of lassoPts) {
              minX = Math.min(minX, pt.x);
              maxX = Math.max(maxX, pt.x);
              minY = Math.min(minY, pt.y);
              maxY = Math.max(maxY, pt.y);
            }

            const capW = Math.ceil(maxX - minX);
            const capH = Math.ceil(maxY - minY);

            if (capW > 0 && capH > 0) {

              // Re-render the strokes to an offscreen surface for the backend
              const surface = Skia.Surface.Make(capW, capH);

              if (surface) {
                const offCanvas = surface.getCanvas();
                offCanvas.drawColor(Skia.Color('white'));

                // Shift origin so the lasso region fills the surface
                offCanvas.translate(-minX, -minY);

                const paint = Skia.Paint();
                paint.setStyle(PaintStyle.Stroke);
                paint.setStrokeWidth(strokeWidth);
                paint.setStrokeCap(StrokeCap.Round);
                paint.setStrokeJoin(StrokeJoin.Round);
                paint.setColor(Skia.Color(strokeColor));

                for (const path of pathsRef.current) {
                  offCanvas.drawPath(path, paint);
                }

                const image  = surface.makeImageSnapshot();
                const base64 = image.encodeToBase64();

                (async () => {
                  try {
                    // Send as a data URI — avoids FileSystem and Blob,
                    // both of which have issues in the Hermes/RN environment.
                    const formData = new FormData();
                    formData.append('image', {
                      uri: `data:image/png;base64,${base64}`,
                      name: 'selection.png',
                      type: 'image/png',
                    } as any);

                    const res = await fetch(BACKEND_URL, {
                      method: 'POST',
                      body: formData,
                    });

                    const json = await res.json();
                    console.log('LaTeX:', json.latex);
                    onRecognize?.(json.latex); // sends it over to index.tsx
                    // LaTeX recognition is a separate logical action
                    actionStackRef.current.push('latex');
                    redoActionStackRef.current = [];
                    syncButtons();
                  } catch (err) {
                    console.error('Recognition failed:', err); // TODO: error message in UI
                  }
                })();
              }
            }
          }

          // Clear lasso after a short delay so user sees the closed shape
          setTimeout(() => {
            setSelectPath(null);
            selectPathRef.current = null;
            selectPtsRef.current  = [];
          }, 400);

          // After a completed selection, return to pen mode
          setTool('pen');
          toolRef.current = 'pen';
        }
      });
  } // panRef built once

  return (
    <>
      <View style={styles.toolRow}>
        <Pressable
          onPress={() => { setTool('pen'); toolRef.current = 'pen'; }}
          style={[styles.toolButton, tool === 'pen' && styles.toolButtonActive]}
        >
          <Text
            style={[
              styles.toolButtonLabel,
              tool === 'pen' && styles.toolButtonLabelActive,
            ]}
          >
            Pen
          </Text>
        </Pressable>

        <Pressable
          onPress={() => { setTool('select'); toolRef.current = 'select'; }}
          style={[styles.toolButton, tool === 'select' && styles.toolButtonActive]}
        >
          <Text
            style={[
              styles.toolButtonLabel,
              tool === 'select' && styles.toolButtonLabelActive,
            ]}
          >
            Select
          </Text>
        </Pressable>

        <Pressable
          onPress={undo}
          disabled={!canUndo}
          style={[styles.toolButton, styles.historyButton, !canUndo && styles.toolButtonDisabled]}
        >
          <Text style={styles.toolButtonLabel}>Undo</Text>
        </Pressable>

        <Pressable
          onPress={redo}
          disabled={!canRedo}
          style={[styles.toolButton, styles.historyButton, !canRedo && styles.toolButtonDisabled]}
        >
          <Text style={styles.toolButtonLabel}>Redo</Text>
        </Pressable>

        <Pressable onPress={clearAll} style={[styles.toolButton, styles.clearButton]}>
          <Text style={styles.toolButtonLabel}>Clear</Text>
        </Pressable>
      </View>

      <GestureDetector gesture={panRef.current}>
        <View style={[styles.canvas, style]} onLayout={(e) => setLayout(e.nativeEvent.layout)}>
          {layout.width > 0 && layout.height > 0 && (
            <Canvas style={StyleSheet.absoluteFill}>
              {paths.map((d, i) => (
                <Path
                  key={i}
                  path={d}
                  style="stroke"
                  strokeWidth={strokeWidth}
                  strokeJoin="round"
                  strokeCap="round"
                  color={strokeColor}
                />
              ))}

              {currentPath && (
                <Path
                  path={currentPath}
                  style="stroke"
                  strokeWidth={strokeWidth}
                  strokeJoin="round"
                  strokeCap="round"
                  color={strokeColor}
                />
              )}

              {/* Grey preview of strokes held in the arrow gesture buffer */}
              {pendingPaths.map((d, i) => (
                <Path
                  key={`pending-${i}`}
                  path={d}
                  style="stroke"
                  strokeWidth={strokeWidth}
                  strokeJoin="round"
                  strokeCap="round"
                  color="#aaaaaa"
                />
              ))}

              {selectPath && (
                <Path
                  path={selectPath}
                  style="stroke"
                  strokeWidth={3}
                  strokeJoin="round"
                  strokeCap="round"
                  color="#f60000"
                />
              )}
            </Canvas>
          )}
        </View>
      </GestureDetector>
      <Text style={styles.hint}>
        draw right arrow for undo, left arrow for redo{"\n"}scribble to erase
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: '#fff', borderRadius: 8 },
  toolRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  toolButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#C0C0C0',
  },
  clearButton: {
    backgroundColor: '#f5b5b5',
  },
  toolButtonActive: {
    backgroundColor: '#007AFF',
  },
  toolButtonDisabled: {
    opacity: 0.35,
  },
  historyButton: {
    backgroundColor: '#b8cce4',
  },
  toolButtonLabel: {
    color: '#111',
    fontWeight: '500',
  },
  toolButtonLabelActive: {
    color: '#fff',
  },
  hint: {
    textAlign: 'center',
    color: '#888',
    fontSize: 11,
    marginTop: 6,
  },
});