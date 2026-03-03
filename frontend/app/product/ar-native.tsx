import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
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
import FloatingBackButton from '@/components/Shared/FloatingBackButton';
import ErrorBoundary from '@/components/ErrorBoundary';

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
            console.error('[AR] 3D model failed to load:', error);
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

export default function ProductARNativeScreen({ modelUrl }: { modelUrl: string }) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isPositionFixed, setIsPositionFixed] = useState(false);
  const controlFunctions = useRef<ControlFunctions>({} as ControlFunctions);

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
        <FloatingBackButton onPress={router.back} />

        <ViroARSceneNavigator
          initialScene={{
            scene: () => <ProductARScene modelUrl={modelUrl} controlFunctions={controlFunctions} />,
          }}
        />

        <View style={styles.compactControlsWrapper}>
          {controlsVisible && (
            <View style={styles.compactControlsBar}>
              <TouchableOpacity style={styles.compactButton} onPress={() => controlFunctions.current.rotateLeft?.()}>
                <Ionicons name="refresh-outline" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.compactButton} onPress={() => controlFunctions.current.rotateRight?.()}>
                <Ionicons name="reload-outline" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.compactButton} onPress={() => controlFunctions.current.moveLeft?.()}>
                <Ionicons name="arrow-back" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.compactButton} onPress={() => controlFunctions.current.moveRight?.()}>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.compactButton} onPress={() => controlFunctions.current.moveUp?.()}>
                <Ionicons name="arrow-up" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.compactButton} onPress={() => controlFunctions.current.moveDown?.()}>
                <Ionicons name="arrow-down" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.compactButton} onPress={() => controlFunctions.current.zoomIn?.()}>
                <Ionicons name="add" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.compactButton} onPress={() => controlFunctions.current.zoomOut?.()}>
                <Ionicons name="remove" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.compactButton, isPositionFixed && styles.compactButtonActive]}
                onPress={() => {
                  controlFunctions.current.fixPosition?.();
                  setIsPositionFixed((prev) => !prev);
                }}
              >
                <Ionicons name="pin" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.compactButton} onPress={() => controlFunctions.current.resetModel?.()}>
                <Ionicons name="refresh" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.compactToggleButton}
            onPress={() => setControlsVisible((prev) => !prev)}
          >
            <Ionicons name={controlsVisible ? 'chevron-down' : 'options'} size={16} color="#fff" />
          </TouchableOpacity>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Inter_400Regular',
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  compactControlsWrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 18,
    alignItems: 'center',
  },
  compactControlsBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    gap: 8,
  },
  compactButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  compactButtonActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.85)',
    borderColor: 'rgba(147, 197, 253, 0.9)',
  },
  compactToggleButton: {
    marginTop: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
});
