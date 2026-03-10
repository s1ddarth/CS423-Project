import { Canvas, PaintStyle, Path, Skia, SkPath, StrokeCap, StrokeJoin } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { PDollarRecognizer, Point } from '../recognizer/pdollar';

type Pt = { x: number; y: number };

function dist2(a: Pt, b: Pt) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function convertToPDollar(strokes: Pt[][]) {
  const pts: any[] = [];

  strokes.forEach((stroke, strokeId) => {
    stroke.forEach((p) => {
      pts.push(new Point(p.x, p.y, strokeId));
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
  const recognizerRef = useRef(new PDollarRecognizer());

  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const [paths, setPaths] = useState<SkPath[]>([]);
  const [pathsPts, setPathsPts] = useState<Pt[][]>([]);

  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
  const currentPathRef = useRef<SkPath | null>(null);

  const [tool, setTool] = useState<'pen' | 'select'>('pen');
  const [hasChosenTool, setHasChosenTool] = useState(false);

  const [selectPath, setSelectPath] = useState<SkPath | null>(null);
  const selectPathRef = useRef<SkPath | null>(null);

  const pathsRef = useRef<SkPath[]>([]);
  const pathsPtsRef = useRef<Pt[][]>([]);
  pathsRef.current = paths;
  pathsPtsRef.current = pathsPts;

  const pointsRef = useRef<Pt[]>([]);
  const selectPtsRef = useRef<Pt[]>([]);

  const eraserRadius = 28;
  //const gestureThreshold = 0.55;
  //const scribbleThreshold = 0.55;

  function strokeBounds(stroke: Pt[]) {
    let minX = stroke[0].x;
    let maxX = stroke[0].x;
    let minY = stroke[0].y;
    let maxY = stroke[0].y;

    for (const p of stroke) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    return { minX, maxX, minY, maxY };
  }

  const eraseAt = (p: Pt) => {
    const prevPaths = pathsRef.current;
    const prevPts = pathsPtsRef.current;

    const keepIdx: number[] = [];

    for (let i = 0; i < prevPts.length; i++) {
      const stroke = prevPts[i];

      if (strokeHitTest(stroke, p, eraserRadius)) {
        continue;
      }

      const b = strokeBounds(stroke);

      if (
        p.x >= b.minX - eraserRadius &&
        p.x <= b.maxX + eraserRadius &&
        p.y >= b.minY - eraserRadius &&
        p.y <= b.maxY + eraserRadius
      ) {
        continue;
      }

      keepIdx.push(i);
    }

    const newPaths = keepIdx.map((i) => prevPaths[i]);
    const newPts = keepIdx.map((i) => prevPts[i]);

    pathsRef.current = newPaths;
    pathsPtsRef.current = newPts;

    setPaths(newPaths);
    setPathsPts(newPts);
  };

  const eraseAlongStroke = (stroke: Pt[]) => {
    for (let i = 0; i < stroke.length; i++) {
      eraseAt(stroke[i]);
    }
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .runOnJS(true)
    .onBegin((e) => {
      const p = Skia.Path.Make();
      p.moveTo(e.x, e.y);
      p.lineTo(e.x, e.y);

      pointsRef.current = [{ x: e.x, y: e.y }];

      if (tool === 'pen') {
        currentPathRef.current = p;
        setCurrentPath(p.copy());
      } else {
        selectPtsRef.current = [{ x: e.x, y: e.y }];
        selectPathRef.current = p;
        setSelectPath(p.copy());
      }
    })
    .onUpdate((e) => {
      if (tool === 'pen') {
        const pt = { x: e.x, y: e.y };
        pointsRef.current.push(pt);

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
      if (tool === 'pen') {
        const strokePts = [...pointsRef.current];
        const p = currentPathRef.current;

        if (strokePts.length > 1) {
          const pts = convertToPDollar([strokePts]);
          const result = recognizerRef.current.Recognize(pts);

          console.log('Name:', result.Name);
          console.log('Score:', result.Score);

          if (result.Name === 'scribble') {
            eraseAlongStroke(strokePts);
            pointsRef.current = [];
            currentPathRef.current = null;
            setCurrentPath(null);
            return;
          }
        }

        if (p) {
          const newPaths = [...pathsRef.current, p];
          const newPts = [...pathsPtsRef.current, strokePts];

          pathsRef.current = newPaths;
          pathsPtsRef.current = newPts;

          setPaths(newPaths);
          setPathsPts(newPts);
        }

        pointsRef.current = [];
        currentPathRef.current = null;
        setCurrentPath(null);
      } else {
        const lassoPts = [...selectPtsRef.current];

        if (lassoPts.length >= 3) {
          const gesturePts = convertToPDollar([lassoPts]);
          const gestureResult = recognizerRef.current.Recognize(gesturePts);

          console.log('Select gesture:', gestureResult.Name);
          console.log('Select score:', gestureResult.Score);

          const isCircle =
          gestureResult.Name === 'circle'

          if (isCircle) {
            const sp = selectPathRef.current;
            if (sp) {
              sp.close();
              setSelectPath(sp.copy());
            }

            let minX = lassoPts[0].x;
            let maxX = lassoPts[0].x;
            let minY = lassoPts[0].y;
            let maxY = lassoPts[0].y;

            for (const pt of lassoPts) {
              minX = Math.min(minX, pt.x);
              maxX = Math.max(maxX, pt.x);
              minY = Math.min(minY, pt.y);
              maxY = Math.max(maxY, pt.y);
            }

            const capW = Math.ceil(maxX - minX);
            const capH = Math.ceil(maxY - minY);

            if (capW > 0 && capH > 0) {
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
                    formData.append(
                      'image',
                      {
                        uri: tempPath,
                        name: 'selection.png',
                        type: 'image/png',
                      } as any
                    );

                    const res = await fetch('http://127.0.0.1:8000/recognize/upload', {
                      method: 'POST',
                      body: formData,
                    });

                    const json = await res.json();
                    console.log('LaTeX:', json.latex);
                    onRecognize?.(json.latex);
                  } catch (err) {
                    console.error('Recognition failed:', err);
                  }
                })();
              }
            }
          }
        }

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
  };

  return (
    <>
      <View style={styles.toolRow}>
        <Pressable
          onPress={() => {
            setTool('pen');
            setHasChosenTool(true);
          }}
          style={[styles.toolButton, hasChosenTool && tool === 'pen' && styles.toolButtonActive]}
        >
          <Text style={styles.toolButtonLabel}>Pen</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setTool('select');
            setHasChosenTool(true);
          }}
          style={[styles.toolButton, hasChosenTool && tool === 'select' && styles.toolButtonActive]}
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
  toolRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 },
  toolButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, backgroundColor: '#C0C0C0' },
  clearButton: { backgroundColor: '#f5b5b5' },
  toolButtonActive: { backgroundColor: '#E0E0E0' },
  toolButtonLabel: { color: '#111', fontWeight: '500' },
});