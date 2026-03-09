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
  latexHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  latexClearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f5b5b5',
  },
  latexClearLabel: {
    color: '#111',
    fontWeight: '500',
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
  katexView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
