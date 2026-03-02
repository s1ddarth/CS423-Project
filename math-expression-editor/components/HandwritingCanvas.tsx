import { Canvas, Path, Skia, SkPath } from '@shopify/react-native-skia';
import React, { useRef, useState } from 'react';
import { Button, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

/*
  Pt represents a raw finger coordinate.
  We added this because SkPath does not expose its internal geometry.
  To erase strokes, we need access to the actual x/y points.
*/
type Pt = { x: number; y: number };

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

export function HandwritingCanvas({
  style,
  strokeColor = '#111',
  strokeWidth = 3,
}: {
  style?: object;
  strokeColor?: string;
  strokeWidth?: number;
}) {

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

  // Refs ensure erase logic always uses latest arrays
  const pathsRef = useRef<SkPath[]>([]);
  const pathsPtsRef = useRef<Pt[][]>([]);
  pathsRef.current = paths;
  pathsPtsRef.current = pathsPts;

  // Tracks raw points of current gesture
  const pointsRef = useRef<Pt[]>([]);

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


      // Initialize new gesture tracking
      pointsRef.current = [{ x: e.x, y: e.y }];
      isErasingRef.current = false;

      if (tool === 'pen') {
        currentPathRef.current = p;
        setCurrentPath(p.copy());
      } else {
        selectPathRef.current = p;
        setSelectPath(p.copy());
      }
    })


    .onUpdate((e) => {

      if (tool === 'pen') {

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

      if (tool === 'pen') {

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

        p.lineTo(e.x, e.y);
        setCurrentPath(p.copy());

      } else {

        const p = selectPathRef.current;
        if (!p) return;


        p.lineTo(e.x, e.y);
        setSelectPath(p.copy());
      }
    })


    .onEnd(() => {

      if (tool === 'pen') {

        // If scribble, do not commit stroke
        if (isErasingRef.current) {
          isErasingRef.current = false;
          pointsRef.current = [];
          currentPathRef.current = null;
          setCurrentPath(null);
          return;
        }


      if (tool === 'pen') {

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

          const newPaths = [...pathsRef.current, p];
          const newPts = [...pathsPtsRef.current, [...pointsRef.current]];

          pathsRef.current = newPaths;
          pathsPtsRef.current = newPts;

          setPaths(newPaths);
          setPathsPts(newPts);
        }

        pointsRef.current = [];

        pointsRef.current = [];
        currentPathRef.current = null;
        setCurrentPath(null);

      } else {

      } else {
        setSelectPath(null);
        selectPathRef.current = null;
      }
    });

  return (
    <>
      <Button title="Pen" onPress={() => setTool('pen')} />
      <Button title="Select" onPress={() => setTool('select')} />

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
      <Button title="Pen" onPress={() => setTool('pen')} />
      <Button title="Select" onPress={() => setTool('select')} />

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
});