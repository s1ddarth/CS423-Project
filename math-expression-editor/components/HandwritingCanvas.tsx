import { Canvas, PaintStyle, Path, Skia, SkPath, StrokeCap, StrokeJoin } from '@shopify/react-native-skia';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

/*
  BACKEND_URL:
  The endpoint for the handwriting recognition backend.
  Update this to your Mac's current IP (ipconfig getifaddr en0) when it changes.
  This is the only line you need to touch when switching networks.
*/
const BACKEND_URL = 'http://10.201.0.55:8000/recognize/upload';

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
  const dx = a.x - b.x; // horizontal difference
  const dy = a.y - b.y; // vertical difference
  return dx * dx + dy * dy; // squared distance
}

/*
  pointToSegDist2:
  Returns squared distance from point p to a line segment a->b.
  This is how we check if a scribble is close to a stroke segment.
*/
function pointToSegDist2(p: Pt, a: Pt, b: Pt) {

  // Vector from a to b
  const abx = b.x - a.x;
  const aby = b.y - a.y;

  // Vector from a to p
  const apx = p.x - a.x;
  const apy = p.y - a.y;

  const abLen2 = abx * abx + aby * aby;

  // If segment is basically a single point
  if (abLen2 === 0) return dist2(p, a);

  // Project p onto segment a->b
  let t = (apx * abx + apy * aby) / abLen2;

  // Clamp projection so it stays within the segment
  t = Math.max(0, Math.min(1, t));

  // Compute closest point on segment
  const cx = a.x + t * abx;
  const cy = a.y + t * aby;

  return dist2(p, { x: cx, y: cy });
}

/*
  strokeHitTest:
  Checks if point p is within eraserRadius of any part of a stroke.
  If true, that stroke should be erased.
*/
function strokeHitTest(strokePts: Pt[], p: Pt, radius: number) {

  const r2 = radius * radius; // squared radius

  // Check every segment in stroke
  for (let i = 1; i < strokePts.length; i++) {
    if (pointToSegDist2(p, strokePts[i - 1], strokePts[i]) <= r2) {
      return true;
    }
  }

  // Also check individual points (extra safety)
  for (const pt of strokePts) {
    if (dist2(p, pt) <= r2) {
      return true;
    }
  }

  return false;
}

/*
  detectScribble:
  Determines if a gesture should be treated as an erase scribble.

  A scribble must:
  - Stay within a relatively small region
  - Have high total movement (dense motion)
  - Have many sharp direction changes
*/
function detectScribble(pts: Pt[]) {

  // Not enough data to classify
  if (pts.length < 14) return false;

  let minX = pts[0].x;
  let maxX = pts[0].x;
  let minY = pts[0].y;
  let maxY = pts[0].y;

  let pathLen = 0;

  // Compute bounding box and total path length
  for (let i = 1; i < pts.length; i++) {

    pathLen += dist(pts[i - 1], pts[i]);

    minX = Math.min(minX, pts[i].x);
    maxX = Math.max(maxX, pts[i].x);
    minY = Math.min(minY, pts[i].y);
    maxY = Math.max(maxY, pts[i].y);
  }

  const boxW = maxX - minX;
  const boxH = maxY - minY;

  // If movement spreads too far, it's likely writing not scribble
  if (boxW > 180 || boxH > 180) return false;

  const dense = pathLen > 520;

  let turns = 0;

  // Count sharp direction changes
  for (let i = 2; i < pts.length; i++) {

    const a = pts[i - 2];
    const b = pts[i - 1];
    const c = pts[i];

    const v1x = b.x - a.x;
    const v1y = b.y - a.y;
    const v2x = c.x - b.x;
    const v2y = c.y - b.y;

    const n1 = Math.hypot(v1x, v1y);
    const n2 = Math.hypot(v2x, v2y);

    if (n1 < 2 || n2 < 2) continue;

    const cos = (v1x * v2x + v1y * v2y) / (n1 * n2);

    if (cos < 0.5) turns++;
  }

  return dense && turns >= 6;
}

/*
  classifySwipe:
  Returns "undo" | "redo" | null.

  Four guards eliminate false positives from normal writing strokes:
    1. Net horizontal span >= 90px         — eliminates short strokes
    2. Vertical drift < 40% of horizontal  — eliminates diagonal letters
    3. Arc/displacement ratio < 1.4        — eliminates curves like 'c', 'u'
    4. Point density < 0.45 pts/px         — eliminates slow deliberate lines

  Left swipe → undo, right swipe → redo.
*/
function classifySwipe(pts: Pt[]): 'undo' | 'redo' | null {

  // Not enough points to classify
  if (pts.length < 5) return null;

  const netDx    = pts[pts.length - 1].x - pts[0].x;
  const netDy    = pts[pts.length - 1].y - pts[0].y;
  const absNetDx = Math.abs(netDx);

  // Guard 1: must travel far enough horizontally
  if (absNetDx < 90) return null;

  // Guard 2: must not drift too far vertically
  if (Math.abs(netDy) > absNetDx * 0.4) return null;

  let arcLen = 0;
  for (let i = 1; i < pts.length; i++) arcLen += dist(pts[i - 1], pts[i]);

  // Guard 3: arc must be close to a straight line
  if (arcLen > absNetDx * 1.4) return null;

  // Guard 4: must be a fast gesture, not a slow deliberate stroke
  if (pts.length / arcLen > 0.45) return null;

  return netDx < 0 ? 'undo' : 'redo';
}

export function HandwritingCanvas({
  style,
  strokeColor = '#111',
  strokeWidth = 3,
  onRecognize, // triggers upon receiving latex from backend
}: {
  style?: object;
  strokeColor?: string;
  strokeWidth?: number;
  onRecognize?: (latex: string) => void;
}) {
  "use no memo"; // disable React Compiler — it rebuilds Gesture.Pan() mid-stroke
                 // which fires a second onBegin and resets the active stroke

  const [layout, setLayout] = useState({ width: 0, height: 0 });

  // Stores SkPath objects for rendering
  const [paths, setPaths] = useState<SkPath[]>([]);

  // Stores raw point arrays aligned with paths
  const [pathsPts, setPathsPts] = useState<Pt[][]>([]);

  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
  const currentPathRef = useRef<SkPath | null>(null);

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

  // Tracks raw points of current gesture
  const pointsRef = useRef<Pt[]>([]);

  // Tracks raw points of current lasso gesture
  const selectPtsRef = useRef<Pt[]>([]);

  // True once gesture is classified as scribble
  const isErasingRef = useRef(false);

  // Controls how forgiving erase is
  const eraserRadius = 20;

  // ── Undo / redo ────────────────────────────────────────────────────────────

  // Parallel stacks — each entry is a full canvas snapshot
  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);

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
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
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
    if (!undoStack.current.length) return;
    const prev = undoStack.current.pop()!;
    redoStack.current.push({
      paths: [...pathsRef.current],
      pts:   pathsPtsRef.current.map(a => [...a]),
    });
    applyEntry(prev);
    syncButtons();
  }, [applyEntry]);

  /*
    redo:
    Pops the redo stack, pushes current state to undo, restores next state.
  */
  const redo = useCallback(() => {
    if (!redoStack.current.length) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push({
      paths: [...pathsRef.current],
      pts:   pathsPtsRef.current.map(a => [...a]),
    });
    applyEntry(next);
    syncButtons();
  }, [applyEntry]);

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
    selectPathRef.current  = null;
    setSelectPath(null);
    selectPtsRef.current   = [];
    pointsRef.current      = [];
    isErasingRef.current   = false;
  };

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

          // Detect scribble → switch to erase mode
          if (!isErasingRef.current && detectScribble(pointsRef.current)) {
            isErasingRef.current   = true;
            currentPathRef.current = null;
            setCurrentPath(null);
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

          // Classify the gesture — fast horizontal swipe triggers undo/redo
          const swipe = classifySwipe(pts);
          if (swipe === 'undo') {
            undoRef.current();
            setCurrentPath(null);
            pointsRef.current = [];
            return;
          }
          if (swipe === 'redo') {
            redoRef.current();
            setCurrentPath(null);
            pointsRef.current = [];
            return;
          }

          // Normal stroke — push history then commit
          const p = currentPathRef.current;
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
        }
      });
  } // panRef built once

  return (
    <>
      <View style={styles.toolRow}>
        <Pressable
          onPress={() => { setTool('pen'); toolRef.current = 'pen'; setHasChosenTool(true); }}
          style={[styles.toolButton, hasChosenTool && tool === 'pen' && styles.toolButtonActive]}
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
          onPress={() => { setTool('select'); toolRef.current = 'select'; setHasChosenTool(true); }}
          style={[styles.toolButton, hasChosenTool && tool === 'select' && styles.toolButtonActive]}
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
});