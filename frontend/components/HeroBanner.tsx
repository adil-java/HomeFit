import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export const HeroBanner: React.FC = () => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 360;
  const bannerHeight = compact ? 170 : 200;
  const horizontalPadding = compact ? 12 : 20;

  return (
    <View style={[styles.container, { paddingHorizontal: horizontalPadding }]}> 
      <LinearGradient
        colors={[theme.colors.gradient.start, theme.colors.gradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.banner, { height: bannerHeight, paddingHorizontal: compact ? 14 : 20 }]}
      >
        <View style={styles.content}>
          <Text style={[styles.title, compact && styles.titleCompact]}>Discover Amazing Products</Text>
          <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
            Shop the latest trends with exclusive deals and fast shipping
          </Text>
          <TouchableOpacity
            style={[styles.button, compact && styles.buttonCompact]}
            onPress={() => router.push('/search')}
          >
            <Text style={[styles.buttonText, compact && styles.buttonTextCompact]}>Explore Now</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  banner: {
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  titleCompact: {
    fontSize: 23,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 20,
    lineHeight: 22,
  },
  subtitleCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonCompact: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
  buttonTextCompact: {
    fontSize: 14,
  },
});