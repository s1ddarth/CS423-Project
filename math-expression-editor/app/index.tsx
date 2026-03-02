import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HandwritingCanvas } from '@/components/HandwritingCanvas';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { styles } from './index.styles';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      
      {/* Latex panel */}
      <View style={styles.row}>
        <ThemedView style={styles.latexPanel}>
          <ThemedText type="subtitle" style={styles.panelTitle}>
            LaTeX Preview
          </ThemedText>
          <ThemedText style={{ color: 'gray' }}>
            Rendered output goes here
          </ThemedText>
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
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
