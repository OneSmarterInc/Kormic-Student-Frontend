import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, fonts, radii } from '../theme/tokens';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  optional?: boolean;
  rightElement?: React.ReactNode;
}

export function TextField({ label, error, optional, rightElement, ...props }: TextFieldProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optional}> - optional</Text> : null}
      </Text>
      <View style={[styles.inputWrap, error ? styles.errorBorder : undefined]}>
        <TextInput
          {...props}
          accessibilityLabel={label}
          accessibilityHint={optional ? 'Optional' : undefined}
          placeholderTextColor="#666783"
          style={[styles.input, rightElement ? styles.inputWithRightElement : undefined, props.style]}
        />
        {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
      </View>
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
  inputWrap: {
    minHeight: 48,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelInk,
    justifyContent: 'center',
  },
  input: {
    color: colors.offWhite,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  inputWithRightElement: {
    paddingRight: 58,
  },
  rightElement: {
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    top: 0,
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
