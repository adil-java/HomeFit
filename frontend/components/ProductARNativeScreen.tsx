import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Viro3DObject,
  ViroAmbientLight,
  ViroARPlane,
  ViroARScene,
  ViroARSceneNavigator,
  ViroClickStateTypes,
  ViroMaterials,
  ViroQuad,
} from '@reactvision/react-viro';
import { Ionicons } from '@expo/vector-icons';
import ErrorBoundary from '@/components/ErrorBoundary';
import { logger } from '@/utils/logger';

type Viro3DPoint = [number, number, number];

interface ControlFunctions {
  rotateLeft: () => void;
  rotateRight: () => void;
  moveUp: () => void;
  moveDown: () => void;
  moveLeft: () => void;
  moveRight: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fixPosition: () => void;
  resetModel: () => void;
}

ViroMaterials.createMaterials({
  QuadMaterial: {
    lightingModel: 'Constant',
    diffuseColor: '#888',
  },
});

function ProductARScene({
  modelUrl,
  controlFunctions,
}: {
  modelUrl: string;
  controlFunctions: React.MutableRefObject<ControlFunctions>;
}) {
  const [position, setPosition] = useState<Viro3DPoint | null>(null);
  const [rotation, setRotation] = useState<Viro3DPoint>([0, 0, 0]);
  const [scale, setScale] = useState<Viro3DPoint>([1, 1, 1]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPositionFixed, setIsPositionFixed] = useState(false);
  const [hasModelError, setHasModelError] = useState(false);

  const rotateLeft = () => setRotation((prev) => [prev[0], prev[1] - 12, prev[2]]);
  const rotateRight = () => setRotation((prev) => [prev[0], prev[1] + 12, prev[2]]);
  const zoomIn = () => setScale((prev) => [prev[0] * 1.12, prev[1] * 1.12, prev[2] * 1.12]);
  const zoomOut = () =>
    setScale((prev) => [
      Math.max(0.12, prev[0] * 0.88),
      Math.max(0.12, prev[1] * 0.88),
      Math.max(0.12, prev[2] * 0.88),
    ]);
  const moveUp = () =>
    setPosition((prev) => (prev ? [prev[0], prev[1] + 0.06, prev[2]] : [0, 0.06, 0]));
  const moveDown = () =>
    setPosition((prev) => (prev ? [prev[0], prev[1] - 0.06, prev[2]] : [0, -0.06, 0]));
  const moveLeft = () =>
    setPosition((prev) => (prev ? [prev[0] - 0.06, prev[1], prev[2]] : [-0.06, 0, 0]));
  const moveRight = () =>
    setPosition((prev) => (prev ? [prev[0] + 0.06, prev[1], prev[2]] : [0.06, 0, 0]));
  const fixPosition = () => setIsPositionFixed((prev) => !prev);
  const resetModel = () => {
    setRotation([0, 0, 0]);
    setScale([1, 1, 1]);
    setPosition(null);
    setIsPositionFixed(false);
  };

  useEffect(() => {
    controlFunctions.current = {
      rotateLeft,
      rotateRight,
      moveUp,
      moveDown,
      moveLeft,
      moveRight,
      zoomIn,
      zoomOut,
      fixPosition,
      resetModel,
    };
  }, []);

  if (hasModelError) {
    return (
      <ViroARScene>
        <ViroAmbientLight color="white" />
        <ViroQuad position={[0, 0, -1]} width={2} height={1} materials={['QuadMaterial']} />
      </ViroARScene>
    );
  }

  return (
    <ViroARScene>
      <ViroAmbientLight color="white" />
      <ViroARPlane>
        <Viro3DObject
          visible={!!position && !isLoading}
          source={{ uri: modelUrl }}
          position={position ?? [0, 0, 0]}
          rotation={rotation}
          scale={scale}
          type="GLB"
          dragType={!isPositionFixed ? 'FixedToWorld' : undefined}
          onDrag={(dragToPos) => {
            if (!isPositionFixed) {
              setPosition(dragToPos as Viro3DPoint);
            }
          }}
          onLoadEnd={() => setIsLoading(false)}
          onError={(error) => {
            logger.error('[AR] 3D model failed to load:', error);
            setIsLoading(false);
            setHasModelError(true);
          }}
        />

        <ViroQuad
          visible={!position || isLoading}
          position={[0, 0, 0]}
          width={1}
          height={1}
          rotation={[-90, 0, 0]}
          materials={['QuadMaterial']}
          onClickState={(state, clickPosition) => {
            if (state === ViroClickStateTypes.CLICKED && !isLoading) {
              setPosition(clickPosition as Viro3DPoint);
            }
          }}
        />
      </ViroARPlane>
    </ViroARScene>
  );
}

type ControlButton = { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; active?: boolean };

export default function ProductARNativeScreen({ modelUrl }: { modelUrl: string }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [mode, setMode] = useState<'adjust' | 'move'>('adjust');
  const [isPositionFixed, setIsPositionFixed] = useState(false);
  const controlFunctions = useRef<ControlFunctions>({} as ControlFunctions);

  // Show the camera at its own 3:4 shape (like the phone's camera app). Filling
  // a tall 20:9 screen crops the sides of the camera image, which is why the AR
  // view looked zoomed in. On short screens it falls back to the space left.
  const headerHeight = insets.top + 52;
  const controlsHeight = 76 + Math.max(insets.bottom, 12);
  const arHeight = Math.min(Math.round((width * 4) / 3), height - headerHeight - controlsHeight);

  if (!modelUrl) {
    Alert.alert('Model Not Available', 'No 3D model is available for this product.');
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>3D Preview Unavailable</Text>
        <Text style={styles.errorText}>No model URL was provided for AR preview.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const call = (fn: keyof ControlFunctions) => () => controlFunctions.current[fn]?.();

  const adjustButtons: ControlButton[] = [
    { icon: 'arrow-undo-outline', label: 'Rotate left', onPress: call('rotateLeft') },
    { icon: 'arrow-redo-outline', label: 'Rotate right', onPress: call('rotateRight') },
    { icon: 'remove', label: 'Smaller', onPress: call('zoomOut') },
    { icon: 'add', label: 'Bigger', onPress: call('zoomIn') },
    {
      icon: isPositionFixed ? 'lock-closed' : 'lock-open-outline',
      label: isPositionFixed ? 'Unlock position' : 'Lock position',
      active: isPositionFixed,
      onPress: () => {
        controlFunctions.current.fixPosition?.();
        setIsPositionFixed((prev) => !prev);
      },
    },
    { icon: 'move-outline', label: 'Move', onPress: () => setMode('move') },
    {
      icon: 'refresh',
      label: 'Reset',
      onPress: () => {
        controlFunctions.current.resetModel?.();
        setIsPositionFixed(false);
      },
    },
  ];

  const moveButtons: ControlButton[] = [
    { icon: 'chevron-back', label: 'Done moving', onPress: () => setMode('adjust') },
    { icon: 'arrow-back', label: 'Move left', onPress: call('moveLeft') },
    { icon: 'arrow-up', label: 'Move up', onPress: call('moveUp') },
    { icon: 'arrow-down', label: 'Move down', onPress: call('moveDown') },
    { icon: 'arrow-forward', label: 'Move right', onPress: call('moveRight') },
  ];

  const buttons = mode === 'adjust' ? adjustButtons : moveButtons;

  return (
    <ErrorBoundary
      fallback={
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>AR Preview Unavailable</Text>
          <Text style={styles.errorText}>Unable to load AR preview on this device.</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top, height: headerHeight }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton} hitSlop={10} accessibilityLabel="Close AR">
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.hint} numberOfLines={2}>
            Point at the floor, tap the grey area to place. Drag to move.
          </Text>
        </View>

        <View style={{ width, height: arHeight, overflow: 'hidden' }}>
          <ViroARSceneNavigator
            autofocus
            initialScene={{
              scene: () => <ProductARScene modelUrl={modelUrl} controlFunctions={controlFunctions} />,
            }}
          />
        </View>

        <View style={[styles.controlsArea, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.controlsPill}>
            {buttons.map((b) => (
              <TouchableOpacity
                key={b.label}
                style={[styles.controlButton, width < 360 && styles.controlButtonSmall, b.active && styles.controlButtonActive]}
                onPress={b.onPress}
                accessibilityLabel={b.label}
                hitSlop={4}
              >
                <Ionicons name={b.icon} size={18} color="#fff" />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.modeLabel}>{mode === 'adjust' ? 'Rotate · Size · Lock · Move · Reset' : 'Move the furniture'}</Text>
        </View>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  hint: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Manrope_500Medium',
  },
  controlsArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  controlsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonSmall: {
    width: 35,
    height: 35,
    borderRadius: 18,
  },
  controlButtonActive: {
    backgroundColor: '#5576B5',
  },
  modeLabel: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.3,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    letterSpacing: -0.3,
    fontFamily: 'Manrope_700Bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#5576B5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Manrope_600SemiBold',
  },
});
