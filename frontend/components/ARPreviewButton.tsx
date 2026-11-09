import React, { useEffect, useState } from 'react';
import { TouchableOpacity, StyleSheet, View, Text, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { checkARSupport } from '@/utils/checkARSupport';

interface ARPreviewButtonProps {
  modelUrl?: string | null;
}

/**
 * "View in your room" on phones with ARCore/ARKit support (camera AR);
 * "View in 3D" everywhere else (in-screen 3D viewer). Support is checked once
 * when the product opens, so the button already says what it will do.
 */
export const ARPreviewButton = ({ modelUrl }: ARPreviewButtonProps) => {
  const { theme } = useTheme();
  const [arSupported, setArSupported] = useState<boolean | null>(null);
  const [opening, setOpening] = useState(false);
  const hasModel = !!modelUrl && modelUrl.trim() !== '';

  useEffect(() => {
    let alive = true;
    if (hasModel) {
      checkARSupport().then((ok) => {
        if (alive) setArSupported(ok);
      });
    }
    return () => {
      alive = false;
    };
  }, [hasModel]);

  const handlePress = async () => {
    if (!hasModel) {
      Alert.alert('3D preview not available', "This product doesn't have a 3D model yet.", [{ text: 'OK' }]);
      return;
    }
    const url = encodeURIComponent(modelUrl!);

    setOpening(true);
    try {
      // Ask again on tap: instant once cached, and gives ARCore another
      // chance if its first answer was still "checking".
      const supported = await checkARSupport();
      setArSupported(supported);
      router.push(supported ? `/product/ar?modelUrl=${url}` : `/product/model-viewer?modelUrl=${url}`);
    } finally {
      setOpening(false);
    }
  };

  const label = arSupported ? 'View in your room' : 'View in 3D';
  const icon = arSupported ? 'scan-outline' : 'cube-outline';

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: theme.colors.primary, opacity: opening ? 0.8 : 1 }]}
      onPress={handlePress}
      disabled={opening}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      <View style={styles.buttonContent}>
        {opening ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name={icon} size={20} color="#fff" />}
        <Text style={styles.buttonText}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
  },
});
