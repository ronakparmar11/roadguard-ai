import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    padding: 24,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  captureButton: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#facc15',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 999,
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 16,
    color: '#0f172a',
  },
  overlayCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 96,
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    borderRadius: 16,
    padding: 12,
    maxHeight: '40%',
  },
  header: {
    fontSize: 18,
    fontWeight: '800',
    color: '#e5e7eb',
  },
  label: {
    color: '#cbd5e1',
  },
  error: {
    color: '#f87171',
  },
  detectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f2937',
  },
  detectionLabel: {
    color: '#e5e7eb',
    fontSize: 16,
  },
  detectionConfidence: {
    color: '#93c5fd',
    fontVariant: ['tabular-nums'],
  },
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#facc15',
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  boxLabel: {
    color: '#e5e7eb',
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
});
