import { Canvas, PaintStyle, Path, Skia, SkPath, StrokeCap, StrokeJoin } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

type Pt = { x: number; y: number };

/*
  HistoryEntry:
  Snapshot of canvas state for undo/redo.
  Stores both SkPath[] and Pt[][] together so the eraser
  still has geometry data after an undo.
*/
type HistoryEntry = { paths: SkPath[]; pts: Pt[][] };

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function dist2(a: Pt, b: Pt) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
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

export function HandwritingCanvas({
  style,
  strokeColor = '#111',
  strokeWidth = 3,
  onRecognize, // triggers upon recieving latex from backend
}: {
  style?: object;
  strokeColor?: string;
  strokeWidth?: number;
  onRecognize?: (latex: string) => void;
}) {

  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const [paths, setPaths] = useState<SkPath[]>([]);
  const [pathsPts, setPathsPts] = useState<Pt[][]>([]);

  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
  const currentPathRef = useRef<SkPath | null>(null);

  const [tool, setTool] = useState<'pen' | 'select'>('pen');
  const [hasChosenTool, setHasChosenTool] = useState(false);

  const [selectPath, setSelectPath] = useState<SkPath | null>(null);
  const selectPathRef = useRef<SkPath | null>(null);

  // Refs ensure erase logic always uses latest arrays
  const pathsRef = useRef<SkPath[]>([]);
  const pathsPtsRef = useRef<Pt[][]>([]);

  // Tool ref so the gesture (built once) always sees the current tool value
  const toolRef = useRef<'pen' | 'select'>('pen');
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  const pointsRef = useRef<Pt[]>([]);
  const selectPtsRef = useRef<Pt[]>([]);

  // True once gesture is classified as scribble
  const isErasingRef = useRef(false);

  // Controls how forgiving erase is
  const eraserRadius = 20;

  /*
    eraseAt:
    Removes strokes that are close to point p.
    Called repeatedly while scribbling.
  */
  const eraseAt = (p: Pt) => {
    const prevPaths = pathsRef.current;
    const prevPts = pathsPtsRef.current;

    const keepIdx: number[] = [];

    for (let i = 0; i < prevPts.length; i++) {
      if (!strokeHitTest(prevPts[i], p, eraserRadius)) {
        keepIdx.push(i);
      }
    }

    const newPaths = keepIdx.map((i) => prevPaths[i]);
    const newPts = keepIdx.map((i) => prevPts[i]);

    // Update refs immediately so next erase call sees updated data
    pathsRef.current = newPaths;
    pathsPtsRef.current = newPts;

    setPaths(newPaths);
    setPathsPts(newPts);
  };


  // Pan gesture handler for drawing strokes or selection boxes
  const pan = Gesture.Pan()
    .minDistance(0)
    .runOnJS(true)
    .onBegin((e) => {
      const p = Skia.Path.Make();
      p.moveTo(e.x, e.y);
      p.lineTo(e.x, e.y);

      // Initialize new gesture tracking
      pointsRef.current = [{ x: e.x, y: e.y }];
      isErasingRef.current = false;

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

        // Detect scribble
        if (!isErasingRef.current && detectScribble(pointsRef.current)) {
          isErasingRef.current = true;
          currentPathRef.current = null;
          setCurrentPath(null);
        }

        // If scribbling, erase instead of drawing
        if (isErasingRef.current) {
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
          isErasingRef.current = false;
          pointsRef.current = [];
          currentPathRef.current = null;
          setCurrentPath(null);
          return;
        }

        const p = currentPathRef.current;
        if (p) {
          const newPaths = [...pathsRef.current, p];
          const newPts = [...pathsPtsRef.current, [...pointsRef.current]];

          pathsRef.current = newPaths;
          pathsPtsRef.current = newPts;

          setPaths(newPaths);
          setPathsPts(newPts);
        }

        pointsRef.current = [];
        currentPathRef.current = null;
        setCurrentPath(null);
      } else { // we gotta close the selection path n send it over to backend now
        const lassoPts = selectPtsRef.current;

        // omit short shapes
        if (lassoPts.length >= 3) {

          // close it
          const sp = selectPathRef.current;
          if (sp) {
            sp.close();
            setSelectPath(sp.copy());
          }

          // make it a box 
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

            // all this is to re-render the strokes to a surface that we can send to the backend
            const surface = Skia.Surface.Make(capW, capH);

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

              const image = surface.makeImageSnapshot();
              const base64 = image.encodeToBase64();

              (async () => {
                try {
                  const tempPath = FileSystem.cacheDirectory + 'lasso_capture.png';
                  await FileSystem.writeAsStringAsync(tempPath, base64, {
                    encoding: FileSystem.EncodingType.Base64,
                  });

                  const formData = new FormData();
                  formData.append('image', {
                    uri: tempPath,
                    name: 'selection.png',
                    type: 'image/png',
                  } as any);

                  const res = await fetch('http://10.55.222.169:8000/recognize/upload', { // or whatever the ip is of ur backend
                    method: 'POST',
                    body: formData,
                  });

                  const json = await res.json();
                  console.log('LaTeX:', json.latex);
                  console.log('JSON:', json);
                  onRecognize?.(json.latex); // sends it over to index.tsx
                } catch (err) {
                  console.error('Recognition failed:', err); // TODO: error message
                }
              })();
            }
          }
        }

        // Clear lasso after a short delay so user sees the closed shape
        setTimeout(() => {
          setSelectPath(null);
          selectPathRef.current = null;
          selectPtsRef.current = [];
        }, 400);
      }
    });

  const clearAll = () => {
    pathsRef.current = [];
    pathsPtsRef.current = [];
    setPaths([]);
    setPathsPts([]);
    currentPathRef.current = null;
    setCurrentPath(null);
    selectPathRef.current = null;
    setSelectPath(null);
    selectPtsRef.current = [];
    pointsRef.current = [];
    isErasingRef.current = false;
  };

  return (
    <>
      <View style={styles.toolRow}>
        <Pressable
          onPress={() => {
            setTool('pen');
            setHasChosenTool(true);
          }}
          style={[
            styles.toolButton,
            hasChosenTool && tool === 'pen' && styles.toolButtonActive,
          ]}
        >
          <Text style={styles.toolButtonLabel}>Pen</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setTool('select');
            setHasChosenTool(true);
          }}
          style={[
            styles.toolButton,
            hasChosenTool && tool === 'select' && styles.toolButtonActive,
          ]}
        >
          <Text style={styles.toolButtonLabel}>Select</Text>
        </Pressable>

        <Pressable onPress={clearAll} style={[styles.toolButton, styles.clearButton]}>
          <Text style={styles.toolButtonLabel}>Clear</Text>
        </Pressable>
      </View>
      <GestureDetector gesture={pan}>
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
    backgroundColor: '#E0E0E0',
  },
  toolButtonLabel: {
    color: '#111',
    fontWeight: '500',
  },
});