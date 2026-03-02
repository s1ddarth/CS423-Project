import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  latexPanel: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    justifyContent: 'flex-start',
  },
  canvasPanel: {
    flex: 1,
    padding: 16,
    minWidth: 0,
  },
  panelTitle: {
    marginBottom: 8,
  },
  canvas: {
    flex: 1,
    minHeight: 120,
  },
});
