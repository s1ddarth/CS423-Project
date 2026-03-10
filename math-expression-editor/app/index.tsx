import { useState } from 'react';
import { Pressable, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import { HandwritingCanvas } from '@/components/HandwritingCanvas';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { styles } from './index.styles';

// right now were using katex to render alte
function stripMathDelimiters(latex: string): string {
  // cleaning up latex output because katex doesnt like regular latex wrappers
  const s = latex.trim();
  if (s.startsWith('\\[') && s.endsWith('\\]')) return s.slice(2, -2).trim();
  if (s.startsWith('\\(') && s.endsWith('\\)')) return s.slice(2, -2).trim();
  if (s.startsWith('$$') && s.endsWith('$$')) return s.slice(2, -2).trim();
  if (s.startsWith('$') && s.endsWith('$')) return s.slice(1, -1).trim();
  return s;
}

function buildKatexHtml(latex: string) {
  const escaped = stripMathDelimiters(latex).replace(/\\/g, '\\\\').replace(/`/g, '\\`');
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
  <style>
    body { margin: 0; padding: 12px; display: flex; align-items: center; justify-content: center; background: transparent; }
    #math { font-size: 1.4em; }
    .katex-error { color: #c00; font-size: 0.9em; word-break: break-all; }
  </style>
</head>
<body>
  <div id="math"></div>
  <script>
    try {
      katex.render(\`${escaped}\`, document.getElementById('math'), { displayMode: true, throwOnError: false });
    } catch (e) {
      document.getElementById('math').textContent = e.message;
    }
  </script>
</body>
</html>`;
}

export default function HomeScreen() {
  const [latex, setLatex] = useState<string | null>(null);
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      
      {/* Latex panel */}
      <View style={styles.row}>
        <ThemedView style={styles.latexPanel}>
          <View style={styles.latexHeaderRow}>
            <ThemedText type="subtitle" style={styles.panelTitle}>
              LaTeX Preview
            </ThemedText>
            <Pressable
              onPress={() => setLatex(null)}
              style={styles.latexClearButton}
            >
              <Text style={styles.latexClearLabel}>Clear</Text>
            </Pressable>
          </View>
          {latex ? (
            <WebView
              style={styles.katexView}
              source={{ html: buildKatexHtml(latex) }}
              scrollEnabled={false}
              originWhitelist={['*']}
            />
          ) : (
            <ThemedText style={{ color: 'gray' }}>
            Rendered output goes here
            </ThemedText>
          )}
        </ThemedView>

        {/* Canvas */}
        <View style={styles.canvasPanel}>
          <ThemedText type="subtitle" style={styles.panelTitle}>
            Handwriting
          </ThemedText>
          <HandwritingCanvas
          strokeColor="black"
          strokeWidth={3}
          style={styles.canvas}
          onRecognize={(newLatex) => {
            const clean = stripMathDelimiters(newLatex);
            setLatex((prev) => (prev ? `${prev} \\\\ ${clean}` : clean));
          }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}