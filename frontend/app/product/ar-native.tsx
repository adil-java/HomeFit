import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
import FloatingBackButton from '@/components/Shared/FloatingBackButton';

type Viro3DPoint = [number, number, number];

ViroMaterials.createMaterials({
  QuadMaterial: {
    lightingModel: 'Constant',
    diffuseColor: '#888',
  },
});

function ProductARScene({ modelUrl }: { modelUrl: string }) {
  const [position, setPosition] = useState<Viro3DPoint | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <ViroARScene>
      <ViroAmbientLight color="white" />
      <ViroARPlane>
        <Viro3DObject
          visible={!!position && !isLoading}
          source={{ uri: modelUrl }}
          position={position ?? [0, 0, 0]}
          rotation={[0, 0, 0]}
          scale={[1, 1, 1]}
          type="GLB"
          dragType="FixedToWorld"
          onDrag={(dragToPos) => setPosition(dragToPos as Viro3DPoint)}
          onLoadEnd={() => setIsLoading(false)}
          onError={(error) => {
            console.error('[AR] 3D model failed to load:', error);
            setIsLoading(false);
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
            if (state === ViroClickStateTypes.CLICKED) {
              setPosition(clickPosition as Viro3DPoint);
            }
          }}
        />
      </ViroARPlane>
    </ViroARScene>
  );
}

export default function ProductARNativeScreen({ modelUrl }: { modelUrl: string }) {
  if (!modelUrl) {
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
    <View style={styles.container}>
      <FloatingBackButton onPress={router.back} />
      <ViroARSceneNavigator
        initialScene={{
          scene: () => <ProductARScene modelUrl={modelUrl} />,
        }}
      />
    </View>
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
});
