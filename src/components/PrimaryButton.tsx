import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, fonts, radii } from '../theme/tokens';

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  accessibilityLabel?: string;
  style?: ViewStyle;
  testID?: string;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading = false,
  variant = 'primary',
  accessibilityLabel,
  style,
  testID,
}: ButtonProps) {
  return (
  <Pressable
    testID={testID}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{ disabled: disabled || loading, busy: loading }}
    disabled={disabled || loading}
    onPress={onPress}
    style={({ pressed }) => [
      styles.button,
      variant === 'secondary' ? styles.secondary : styles.primary,
      (disabled || loading) && styles.disabled,
      pressed && !disabled && !loading && styles.pressed,
      style,
    ]}
  >
    {loading ? (
      <ActivityIndicator color={variant === 'secondary' ? colors.offWhite : '#1A0F0A'} />
    ) : (
      <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>{label}</Text>
    )}
  </Pressable>
);
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primary: {
    backgroundColor: colors.coral,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderColor: colors.line,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.42,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    color: '#1A0F0A',
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  secondaryLabel: {
    color: colors.offWhite,
  },
});
