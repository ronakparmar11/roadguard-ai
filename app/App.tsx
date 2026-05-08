import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { styles } from './styles';

type Detection = {
  label: string;
  confidence: number;
  box?: number[];
};

const SERVER_URL = "http://localhost:8000" //nebius ip

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  const hasPermission = useMemo(() => permission?.granted, [permission]);

  const handleCaptureAndSend = async () => {
    if (!cameraRef.current || isSending || !isCameraReady) return;
    setError(null);
    setIsSending(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        skipProcessing: true,
      });

      const manipulated = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 640 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );

      if (manipulated.width && manipulated.height) {
        setFrameSize({ width: manipulated.width, height: manipulated.height });
      } else {
        setFrameSize(null);
      }

      const formData = new FormData();
      formData.append('file', {
        uri: manipulated.uri,
        name: 'frame.jpg',
        type: 'image/jpeg',
      } as any);

      const response = await fetch(`${SERVER_URL}/detect`, {
        method: 'POST',
        headers: { 
          Accept: 'application/json',
          "x-api-key": "<api-key>", //api-key generated using uuid.uuid4()
         },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const json = await response.json();
      setDetections(json.detections ?? []);
    } catch (err) {
      setError((err as Error).message);
      setDetections([]);
    } finally {
      setIsSending(false);
    }
  };

  const scaledDetections = useMemo(() => {
    if (!frameSize || previewSize.width === 0 || previewSize.height === 0) return [];
    const scaleX = previewSize.width / frameSize.width;
    const scaleY = previewSize.height / frameSize.height;

    return detections
      .filter((d) => d.box)
      .map((d) => {
        const [x1, y1, x2, y2] = d.box as number[];
        return {
          ...d,
          box: [x1 * scaleX, y1 * scaleY, x2 * scaleX, y2 * scaleY] as number[],
        };
      });
  }, [detections, frameSize, previewSize.height, previewSize.width]);

  if (!permission) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.label}>Requesting camera permissions…</Text>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.label}>Camera permission is required.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View
        style={styles.cameraContainer}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setPreviewSize({ width, height });
        }}
      >
        <CameraView
          ref={cameraRef}
          facing="back"
          style={styles.camera}
          onCameraReady={() => setIsCameraReady(true)}
        />
        {scaledDetections.map((det, idx) => {
          const [x1, y1, x2, y2] = det.box as number[];
          return (
            <View
              key={`${det.label}-${idx}`}
              style={[
                styles.box,
                {
                  left: x1,
                  top: y1,
                  width: x2 - x1,
                  height: y2 - y1,
                },
              ]}
            >
              <Text style={styles.boxLabel}>
                {det.label} {(det.confidence * 100).toFixed(0)}%
              </Text>
            </View>
          );
        })}

        <View style={styles.overlayCard}>
          <Text style={styles.header}>Detections</Text>
          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : detections.length === 0 ? (
            <Text style={styles.label}>Tap Detect to run YOLO on the current frame.</Text>
          ) : (
            <FlatList
              data={detections}
              keyExtractor={(_, idx) => idx.toString()}
              renderItem={({ item }) => (
                <View style={styles.detectionRow}>
                  <Text style={styles.detectionLabel}>{item.label}</Text>
                  <Text style={styles.detectionConfidence}>{(item.confidence * 100).toFixed(1)}%</Text>
                </View>
              )}
            />
          )}
        </View>

        <TouchableOpacity
          style={[styles.captureButton, isSending && styles.captureButtonDisabled]}
          onPress={handleCaptureAndSend}
          disabled={isSending || !isCameraReady}
        >
          {isSending ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.buttonText}>Detect</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
