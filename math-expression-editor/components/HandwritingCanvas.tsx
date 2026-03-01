import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Path } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export function HandwritingCanvas({ style }: { style?: object }) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const pointsRef = useRef<{ x: number; y: number }[]>([]);

  const pan = Gesture.Pan()
    .minDistance(0)
    .runOnJS(true)
    .onStart((e) => {
      pointsRef.current = [{ x: e.x, y: e.y }];
      setCurrentPath(`M ${e.x} ${e.y}`);
    })
    .onUpdate((e) => {
      pointsRef.current.push({ x: e.x, y: e.y });
      const pts = pointsRef.current;
      setCurrentPath(`M ${pts[0].x} ${pts[0].y} L ${pts.slice(1).map((p) => `${p.x} ${p.y}`).join(' L ')}`);
    })
    .onEnd(() => {
      if (pointsRef.current.length > 0) {
        const pts = pointsRef.current;
        const d = `M ${pts[0].x} ${pts[0].y} L ${pts.slice(1).map((p) => `${p.x} ${p.y}`).join(' L ')}`;
        setPaths((prev) => [...prev, d]);
      }
      pointsRef.current = [];
      setCurrentPath('');
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.canvas, style]} onLayout={(e) => setLayout(e.nativeEvent.layout)}>
        {layout.width > 0 && layout.height > 0 && (
          <Canvas style={StyleSheet.absoluteFill}>
            {paths.map((d, i) => (
              <Path
                key={i}
                path={d}
                style="stroke"
                strokeWidth={3}
                strokeJoin="round"
                strokeCap="round"
                color="#111"
              />
            ))}
            {currentPath ? (
              <Path
                path={currentPath}
                style="stroke"
                strokeWidth={3}
                strokeJoin="round"
                strokeCap="round"
                color="#111"
              />
            ) : null}
          </Canvas>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: '#fff', borderRadius: 8 },
});
