import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, Box } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Home intro panel. Solid brand colour, left-aligned, and about what this app
 * actually does (AR previews) rather than generic "shop deals" copy.
 */
export const HeroBanner: React.FC = () => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const horizontalPadding = compact ? 12 : 20;

  return (
    <View style={[styles.container, { paddingHorizontal: horizontalPadding }]}>
      <View style={[styles.banner, { backgroundColor: theme.dark ? theme.colors.surface : '#232B3A', padding: compact ? 18 : 22 }]}>
        <View style={styles.eyebrowRow}>
          <Box size={14} color="#C9D3E8" />
          <Text style={styles.eyebrow}>VIEW IN YOUR ROOM</Text>
        </View>
        <Text style={[styles.title, compact && styles.titleCompact]}>
          See it at home{'\n'}before you buy it.
        </Text>
        <Text style={styles.subtitle}>
          Place chairs, tables and sofas in your space with AR.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.navigate('/search')}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Browse furniture</Text>
          <ArrowRight size={16} color="#1C1B19" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
  },
  banner: {
    borderRadius: 18,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 1.2,
    color: '#C9D3E8',
  },
  title: {
    fontSize: 26,
    lineHeight: 31,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: -0.6,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  titleCompact: {
    fontSize: 22,
    lineHeight: 27,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Manrope_500Medium',
    color: 'rgba(255,255,255,0.72)',
    marginBottom: 18,
  },
  button: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: '#1C1B19',
  },
});
