import { Canvas, Path, Skia, SkPath } from '@shopify/react-native-skia';
import React, { useRef, useState } from 'react';
import { Button, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export function HandwritingCanvas({ style }: { style?: object }) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [paths, setPaths] = useState<SkPath[]>([]);
  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
  const currentPathRef = useRef<SkPath | null>(null);
  const [tool, setTool] = useState<'pen' | 'select'>('pen');
  const selectPath = useRef<SkPath | null>(null);


  const pan = Gesture.Pan()
    .minDistance(0)
    .runOnJS(true)
    .onBegin((e) => {
      if tool === 'pen' {
        const p = Skia.Path.Make();
        p.moveTo(e.x, e.y);
        p.lineTo(e.x, e.y);
        currentPathRef.current = p;
        setCurrentPath(p.copy());
      } else {
        
      }
    })
    .onUpdate((e) => {
      const p = currentPathRef.current;
      if (!p) return;
      p.lineTo(e.x, e.y);
      setCurrentPath(p.copy());
    })
    .onEnd(() => {
      const p = currentPathRef.current;
      if (p) {
        setPaths((prev) => [...prev, p]);
      }
      currentPathRef.current = null;
      setCurrentPath(null);
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
    </>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: '#fff', borderRadius: 8 },
});