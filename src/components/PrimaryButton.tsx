import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, fonts, radii } from '../theme/tokens';

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  accessibilityLabel?: string;
  style?: ViewStyle;
  testID?: string;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
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
    accessibilityState={{ disabled }}
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [
      styles.button,
      variant === 'secondary' ? styles.secondary : styles.primary,
      disabled && styles.disabled,
      pressed && !disabled && styles.pressed,
      style,
    ]}
  >
    <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>{label}</Text>
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
