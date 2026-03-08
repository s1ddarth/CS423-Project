import { Canvas, PaintStyle, Path, Skia, SkPath, StrokeCap, StrokeJoin } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useCallback, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

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

/*
  pointToSegDist2:
  Returns squared distance from point p to a line segment a->b.
  This is how we check if a scribble is close to a stroke segment.
*/
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

/*
  strokeHitTest:
  Checks if point p is within eraserRadius of any part of a stroke.
  If true, that stroke should be erased.
*/
function strokeHitTest(strokePts: Pt[], p: Pt, radius: number) {
  const r2 = radius * radius;
  for (let i = 1; i < strokePts.length; i++) {
    if (pointToSegDist2(p, strokePts[i - 1], strokePts[i]) <= r2) return true;
  }
  for (const pt of strokePts) {
    if (dist2(p, pt) <= r2) return true;
  }
  return false;
}

/*
  detectScribble:
  Determines if a gesture should be treated as an erase scribble.
  A scribble must stay within a small region, have high total movement,
  and have many sharp direction changes.
*/
function detectScribble(pts: Pt[]) {
  if (pts.length < 14) return false;

  let minX = pts[0].x, maxX = pts[0].x;
  let minY = pts[0].y, maxY = pts[0].y;
  let pathLen = 0;

  for (let i = 1; i < pts.length; i++) {
    pathLen += dist(pts[i - 1], pts[i]);
    minX = Math.min(minX, pts[i].x);
    maxX = Math.max(maxX, pts[i].x);
    minY = Math.min(minY, pts[i].y);
    maxY = Math.max(maxY, pts[i].y);
  }

  if (maxX - minX > 180 || maxY - minY > 180) return false;

  const dense = pathLen > 520;

  let turns = 0;
  for (let i = 2; i < pts.length; i++) {
    const v1x = pts[i - 1].x - pts[i - 2].x, v1y = pts[i - 1].y - pts[i - 2].y;
    const v2x = pts[i].x - pts[i - 1].x,     v2y = pts[i].y - pts[i - 1].y;
    const n1 = Math.hypot(v1x, v1y), n2 = Math.hypot(v2x, v2y);
    if (n1 < 2 || n2 < 2) continue;
    if ((v1x * v2x + v1y * v2y) / (n1 * n2) < 0.5) turns++;
  }

  return dense && turns >= 6;
}

/*
  classifySwipe:
  Returns "undo" | "redo" | null.
  Four guards eliminate false positives from normal writing strokes:
    1. Net horizontal span >= 90px          — eliminates short strokes
    2. Vertical drift < 40% of horizontal  — eliminates diagonal letters
    3. Arc/displacement ratio < 1.4        — eliminates curves like 'c', 'u'
    4. Point density < 0.45 pts/px         — eliminates slow deliberate lines
*/
function classifySwipe(pts: Pt[]): 'undo' | 'redo' | null {
  if (pts.length < 5) return null;

  const netDx    = pts[pts.length - 1].x - pts[0].x;
  const netDy    = pts[pts.length - 1].y - pts[0].y;
  const absNetDx = Math.abs(netDx);

  if (absNetDx < 90) return null;
  if (Math.abs(netDy) > absNetDx * 0.4) return null;

  let arcLen = 0;
  for (let i = 1; i < pts.length; i++) arcLen += dist(pts[i - 1], pts[i]);

  if (arcLen > absNetDx * 1.4) return null;
  if (pts.length / arcLen > 0.45) return null;

  return netDx < 0 ? 'undo' : 'redo';
}

/*
  useGestureFlash:
  Animated label that fades in/out over the canvas when a NUI gesture fires.
*/
function useGestureFlash() {
  const opacity = useRef(new Animated.Value(0)).current;
  const [label, setLabel] = useState('');

  const flash = useCallback((text: string) => {
    setLabel(text);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 80,  useNativeDriver: true }),
      Animated.delay(380),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [opacity]);

  return { opacity, label, flash };
}

export function HandwritingCanvas({
  style,
  strokeColor = '#111',
  strokeWidth = 3,
  onRecognize,
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
  const [hasChosenTool, setHasChosenTool] = useState(false);

  const [selectPath, setSelectPath] = useState<SkPath | null>(null);
  const selectPathRef = useRef<SkPath | null>(null);

  // Refs ensure erase/gesture logic always uses latest arrays.
  // NOTE: these are NOT assigned from state on every render (that was the
  // original bug — it clobbered mid-stroke writes). They are only written
  // by the functions that own them.
  const pathsRef    = useRef<SkPath[]>([]);
  const pathsPtsRef = useRef<Pt[][]>([]);

  // Tool ref so the gesture (built once) always sees current tool
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

  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // One history snapshot per erase gesture (not per erased stroke)
  const eraseSnapshotTaken = useRef(false);

  const syncButtons = () => {
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  };

  /*
    pushHistory:
    Snapshots the current canvas onto the undo stack.
    Call this BEFORE every destructive change.
  */
  const pushHistory = useCallback(() => {
    undoStack.current.push({
      paths: [...pathsRef.current],
      pts:   pathsPtsRef.current.map(a => [...a]),
    });
    redoStack.current = [];
    syncButtons();
  }, []);

  const applyEntry = useCallback((entry: HistoryEntry) => {
    pathsRef.current    = entry.paths;
    pathsPtsRef.current = entry.pts;
    setPaths([...entry.paths]);
    setPathsPts(entry.pts.map(a => [...a]));
  }, []);

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

  // Flash feedback for NUI gestures
  const { opacity: flashOpacity, label: flashLabel, flash } = useGestureFlash();

  // Stable refs so the gesture (built once) always calls latest versions
  const undoRef        = useRef(undo);
  const redoRef        = useRef(redo);
  const pushHistoryRef = useRef(pushHistory);
  const flashRef       = useRef(flash);
  undoRef.current        = undo;
  redoRef.current        = redo;
  pushHistoryRef.current = pushHistory;
  flashRef.current       = flash;

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
      if (!strokeHitTest(prevPts[i], p, eraserRadius)) keepIdx.push(i);
    }

    const newPaths = keepIdx.map((i) => prevPaths[i]);
    const newPts   = keepIdx.map((i) => prevPts[i]);

    // Update refs immediately so next eraseAt call sees updated data
    pathsRef.current    = newPaths;
    pathsPtsRef.current = newPts;

    setPaths(newPaths);
    setPathsPts(newPts);
  };

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

          // Erase mode — take one history snapshot for the whole gesture
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

          // Scribble erase finished — discard the in-progress path
          if (isErasingRef.current) {
            isErasingRef.current       = false;
            eraseSnapshotTaken.current = false;
            pointsRef.current          = [];
            currentPathRef.current     = null;
            setCurrentPath(null);
            return;
          }

          const pts = pointsRef.current;

          // Swipe left → undo, swipe right → redo
          const swipe = classifySwipe(pts);
          if (swipe === 'undo') {
            undoRef.current();
            setCurrentPath(null);
            flashRef.current('↩  Undo');
            pointsRef.current = [];
            return;
          }
          if (swipe === 'redo') {
            redoRef.current();
            setCurrentPath(null);
            flashRef.current('↪  Redo');
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
          // Close the selection path and send to backend
          const lassoPts = selectPtsRef.current;

          // CHECKPOINT 1 — did the lasso gesture collect enough points?
          console.log('[Lasso] onEnd — lasso points collected:', lassoPts.length, '| strokes on canvas:', pathsRef.current.length);

          if (lassoPts.length >= 3) {
            const sp = selectPathRef.current;
            if (sp) {
              sp.close();
              setSelectPath(sp.copy());
            }

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

            // CHECKPOINT 2 — is the capture region a valid size?
            console.log('[Lasso] capture box:', capW, 'x', capH, '| region:', { minX, minY, maxX, maxY });

            if (capW > 0 && capH > 0) {
              const surface = Skia.Surface.Make(capW, capH);

              // CHECKPOINT 3 — did Skia create the offscreen surface?
              console.log('[Lasso] Skia surface created:', !!surface);

              if (surface) {
                const offCanvas = surface.getCanvas();
                offCanvas.drawColor(Skia.Color('white'));
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

                // CHECKPOINT 4 — did we get a non-empty base64 image?
                console.log('[Lasso] base64 image length:', base64.length, base64.length < 200 ? '⚠️ suspiciously small — may be blank' : '✅ looks good');

                (async () => {
                  try {
                    const formData = new FormData();
                    formData.append('image', {
                      uri: `data:image/png;base64,${base64}`,
                      name: 'selection.png',
                      type: 'image/png',
                    } as any);
                
                    const res = await fetch('http://10.201.231.92:8000/recognize/upload', {
                      method: 'POST',
                      body: formData,
                    });

                    // CHECKPOINT 6 — what did the backend reply?
                    console.log('[Lasso] backend HTTP status:', res.status);

                    const json = await res.json();
                    console.log('[Lasso] ✅ LaTeX received:', json.latex);
                    console.log('[Lasso] full response:', JSON.stringify(json));

                    // CHECKPOINT 7 — is onRecognize wired up?
                    console.log('[Lasso] calling onRecognize, handler present:', !!onRecognize);
                    onRecognize?.(json.latex);
                  } catch (err) {
                    // CHECKPOINT 8 — what exactly failed?
                    console.error('[Lasso] ❌ failed at fetch/parse:', err);
                  }
                })();
              } else {
                console.error('[Lasso] ❌ Skia.Surface.Make returned null — capW:', capW, 'capH:', capH);
              }
            } else {
              console.warn('[Lasso] ⚠️ capture box too small, skipping — capW:', capW, 'capH:', capH);
            }
          } else {
            console.warn('[Lasso] ⚠️ not enough lasso points (need >= 3, got', lassoPts.length, ')');
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
          <Text style={styles.toolButtonLabel}>Pen</Text>
        </Pressable>

        <Pressable
          onPress={() => { setTool('select'); toolRef.current = 'select'; setHasChosenTool(true); }}
          style={[styles.toolButton, hasChosenTool && tool === 'select' && styles.toolButtonActive]}
        >
          <Text style={styles.toolButtonLabel}>Select</Text>
        </Pressable>

        <Pressable
          onPress={() => { undo(); flash('↩  Undo'); }}
          disabled={!canUndo}
          style={[styles.toolButton, styles.historyButton, !canUndo && styles.toolButtonDisabled]}
        >
          <Text style={styles.toolButtonLabel}>↩ Undo</Text>
        </Pressable>

        <Pressable
          onPress={() => { redo(); flash('↪  Redo'); }}
          disabled={!canRedo}
          style={[styles.toolButton, styles.historyButton, !canRedo && styles.toolButtonDisabled]}
        >
          <Text style={styles.toolButtonLabel}>↪ Redo</Text>
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

          {/* NUI gesture feedback */}
          <Animated.View
            style={[styles.flashOverlay, { opacity: flashOpacity }]}
            pointerEvents="none"
          >
            <Text style={styles.flashText}>{flashLabel}</Text>
          </Animated.View>
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
    backgroundColor: '#E0E0E0',
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
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'rgba(0,0,0,0.13)',
    letterSpacing: 1,
  },
});
