import React from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import type { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import { Check, AlertCircle, Info } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

type Kind = 'success' | 'error' | 'info';

function useToastWidth() {
  const { width } = useWindowDimensions();
  return Math.min(width - 32, 480);
}

function MessageToast({ kind, text1, text2, onPress, hide }: ToastConfigParams<any> & { kind: Kind }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const width = useToastWidth();
  const tint = kind === 'success' ? c.success : kind === 'error' ? c.error : c.primary;
  const Icon = kind === 'success' ? Check : kind === 'error' ? AlertCircle : Info;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => (onPress ? onPress() : hide())}
      style={[styles.card, { width, backgroundColor: c.surface, borderColor: c.border }]}
      accessibilityRole="alert"
    >
      <View style={[styles.iconWrap, { backgroundColor: tint + '1F' }]}>
        <Icon size={16} color={tint} strokeWidth={2.5} />
      </View>
      <View style={styles.texts}>
        {!!text1 && <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>{text1}</Text>}
        {!!text2 && <Text style={[styles.body, { color: c.textSecondary }]} numberOfLines={3}>{text2}</Text>}
      </View>
    </TouchableOpacity>
  );
}

/** Shown after signing in, instead of the generic "Signed in as …" banner. */
function WelcomeToast({ text1, text2, props, hide }: ToastConfigParams<{ photoURL?: string | null; email?: string }>) {
  const { theme } = useTheme();
  const c = theme.colors;
  const width = useToastWidth();
  const name = text2 || '';
  const initials = name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'H';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => hide()}
      style={[styles.card, styles.welcomeCard, { width, backgroundColor: c.surface, borderColor: c.border }]}
      accessibilityRole="alert"
    >
      {props?.photoURL ? (
        <Image source={{ uri: props.photoURL }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: c.primary }]}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
      )}
      <View style={styles.texts}>
        <Text style={[styles.eyebrow, { color: c.textSecondary }]}>{text1 || 'Welcome'}</Text>
        <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>{name}</Text>
        {!!props?.email && props.email !== name && (
          <Text style={[styles.body, { color: c.textSecondary }]} numberOfLines={1}>{props.email}</Text>
        )}
      </View>
      <View style={[styles.statusDot, { backgroundColor: c.success }]} />
    </TouchableOpacity>
  );
}

export const toastConfig: ToastConfig = {
  success: (p) => <MessageToast {...p} kind="success" />,
  error: (p) => <MessageToast {...p} kind="error" />,
  info: (p) => <MessageToast {...p} kind="info" />,
  welcome: (p) => <WelcomeToast {...p} />,
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 4 },
    }),
  },
  welcomeCard: { paddingVertical: 14 },
  iconWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1 },
  title: { fontSize: 14, lineHeight: 19, fontFamily: 'Manrope_700Bold' },
  body: { fontSize: 13, lineHeight: 18, marginTop: 1, fontFamily: 'Manrope_500Medium' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { color: '#fff', fontSize: 15, fontFamily: 'Manrope_700Bold' },
  eyebrow: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', letterSpacing: 0.2 },
  name: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.2, marginTop: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});
