import { Canvas, Path, Skia, SkPath } from '@shopify/react-native-skia';
import React, { useRef, useState } from 'react';
import { Button, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

/**
 * HandwritingCanvas component for drawing ink strokes and selection rectangles.
 * Supports two modes: 'pen' for drawing strokes, 'select' for drawing selection boxes.
 */
export function HandwritingCanvas({ style }: { style?: object }) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  
  // Array of committed ink strokes (SkPath objects)
  const [paths, setPaths] = useState<SkPath[]>([]);
  // Current stroke being drawn (state copy for rendering)
  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
  const currentPathRef = useRef<SkPath | null>(null); // ref to mutable path being built to avoid stale closures
  
  // Current tool mode: 'pen' draws ink, 'select' draws selection boxes
  const [tool, setTool] = useState<'pen' | 'select'>('pen');
  
  // Selection box path (drawn in red when in 'select' mode)
  const [selectPath, setSelectPath] = useState<SkPath | null>(null);
  const selectPathRef = useRef<SkPath | null>(null);


  // Pan gesture handler for drawing strokes or selection boxes
  const pan = Gesture.Pan()
    .minDistance(0) 
    .runOnJS(true)
    .onBegin((e) => {
      // Create a new Skia path and initialize with a tiny segment (M x y L x y)
      const p = Skia.Path.Make();
      p.moveTo(e.x, e.y);
      p.lineTo(e.x, e.y);
      
      if (tool === 'pen') {
        currentPathRef.current = p;
        setCurrentPath(p.copy());
      } else {
        selectPathRef.current = p;
        setSelectPath(p.copy());
      }
    })
    .onUpdate((e) => {
      // Extending our stroke or selection box
      if (tool === 'pen'){
        const p = currentPathRef.current;
        if (!p) return;
        p.lineTo(e.x, e.y); 
        setCurrentPath(p.copy());  
      }
      else {
        // Select mode: extend the selection box outline
        const p = selectPath;
        if (!p) return;
        p.lineTo(e.x, e.y);
        setSelectPath(p.copy());
      }
    })
    .onEnd(() => {
      if (tool === 'pen'){
        // Commit the completed stroke to the paths array
        const p = currentPathRef.current;
        if (p) {
          setPaths((prev) => [...prev, p]);
        }
        // Clear the current stroke
        currentPathRef.current = null;
        setCurrentPath(null);
      }
      else {
        // TODO: handle selection 
        setSelectPath(null);
        selectPathRef.current = null;
      }
    });

  return (
    <>
    {/* Tool selection buttons */}
    <Button title="Pen" onPress={() => setTool('pen')} />
    <Button title="Select" onPress={() => setTool('select')} />
    
    {/* Gesture detector wraps the canvas to capture touch input */}
    <GestureDetector gesture={pan}>
      <View style={[styles.canvas, style]} onLayout={(e) => setLayout(e.nativeEvent.layout)}>
        {/* Only render Skia canvas once layout is known */}
        {layout.width > 0 && layout.height > 0 && (
          <Canvas style={StyleSheet.absoluteFill}>
            {/* Render all committed ink strokes in black */}
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
            
            {/* Render the current in-progress stroke (if pen mode) */}
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
            
            {/* Render the selection outline in red*/}
            {selectPath ? (
              <Path
                path={selectPath}
                style="stroke"
                strokeWidth={3}
                strokeJoin="round"
                strokeCap="round"
                color="#f60000"
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