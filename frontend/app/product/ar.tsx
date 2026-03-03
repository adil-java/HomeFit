import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';
import { checkARSupport, resetARSupportCache } from '@/utils/checkARSupport';

type NativeARComponent = React.ComponentType<{ modelUrl: string }>;

export default function ProductARScreen() {
  const { modelUrl } = useLocalSearchParams<{ modelUrl: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [NativeARScreen, setNativeARScreen] = useState<NativeARComponent | null>(null);

  useEffect(() => {
    let mounted = true;

    const redirectToViewer = (message?: string) => {
      if (message) {
        Toast.show({
          type: 'info',
          text1: 'AR Preview Unavailable',
          text2: message,
          position: 'top',
        });
      }

      router.replace(`/product/model-viewer?modelUrl=${encodeURIComponent(modelUrl || '')}`);
    };

    const loadAR = async () => {
      try {
        resetARSupportCache();

        if (!modelUrl || modelUrl.trim() === '') {
          redirectToViewer('3D model not found for this product.');
          return;
        }

        if (Platform.OS === 'web') {
          redirectToViewer('AR is not available on web. Opening 3D viewer.');
          return;
        }

        const isExpoGo = Constants.appOwnership === 'expo';
        if (isExpoGo) {
          redirectToViewer('Expo Go does not include AR native modules.');
          return;
        }

        const supported = await checkARSupport();
        if (!supported) {
          redirectToViewer('This device does not support ARCore/ARKit.');
          return;
        }

        const nativeModule = require('./ar-native');
        if (mounted) {
          setNativeARScreen(() => nativeModule.default);
        }
      } catch (error) {
        console.error('[AR] Failed to load native AR screen:', error);
        redirectToViewer('Opening 3D viewer instead.');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadAR();

    return () => {
      mounted = false;
    };
  }, [modelUrl]);

  if (NativeARScreen) {
    return <NativeARScreen modelUrl={modelUrl || ''} />;
  }

  return (
    <View style={styles.container}>
      {isLoading ? (
        <>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.title}>Preparing AR...</Text>
          <Text style={styles.subtitle}>Checking device compatibility.</Text>
        </>
      ) : (
        <>
          <Text style={styles.title}>Opening 3D Preview</Text>
          <Text style={styles.subtitle}>AR is not available on this device.</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    marginTop: 12,
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    color: '#ccc',
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
