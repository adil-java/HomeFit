import React from 'react';
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface HeaderBackButtonProps {
  onPress: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export default function HeaderBackButton({ onPress, size = 20, style }: HeaderBackButtonProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.button,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <ArrowLeft size={size} color={theme.colors.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
