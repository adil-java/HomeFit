import React from 'react';
import { KeyboardAvoidingView, Platform, StyleProp, ViewStyle } from 'react-native';

/**
 * Wrap a form (usually its ScrollView) so the keyboard pushes content up
 * instead of covering the focused field and the submit button.
 *
 * Same behaviour as the login/register screens. Pair the inner ScrollView with
 * `keyboardShouldPersistTaps="handled"` so a button tap while the keyboard is
 * open works on the first tap (by default the first tap only closes the keyboard).
 */
export default function KeyboardAwareView({
  children,
  style,
  keyboardVerticalOffset = 0,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
}) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
