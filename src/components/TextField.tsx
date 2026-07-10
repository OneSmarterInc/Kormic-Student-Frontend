import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, fonts, radii } from '../theme/tokens';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  optional?: boolean;
}

export function TextField({ label, error, optional, ...props }: TextFieldProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optional}> - optional</Text> : null}
      </Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        accessibilityHint={optional ? 'Optional' : undefined}
        placeholderTextColor="#666783"
        style={[styles.input, error ? styles.errorBorder : undefined]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 6,
  },
  label: {
    color: '#B9B8CC',
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  optional: {
    color: colors.muted,
    fontFamily: fonts.body,
  },
  input: {
    minHeight: 48,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelInk,
    color: colors.offWhite,
    fontFamily: fonts.body,
    fontSize: 15,
    paddingHorizontal: 14,
  },
  errorBorder: {
    borderColor: colors.error,
  },
  error: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 12,
  },
});
