import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { PasswordVisibilityIcon } from '../components/PasswordVisibilityIcon';
import { ScreenShell } from '../components/ScreenShell';
import { SectionLabel } from '../components/SectionLabel';
import { TextField } from '../components/TextField';
import { confirmPasswordReset } from '../services/api';
import { colors, fonts, type } from '../theme/tokens';

interface ResetPasswordScreenProps {
  resetToken: string;
  onComplete: () => void;
  onExpired: () => void;
}

type PasswordErrors = Partial<Record<'password' | 'confirmPassword' | 'api', string>>;

export function ResetPasswordScreen({ resetToken, onComplete, onExpired }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const errors = useMemo<PasswordErrors>(() => {
    const nextErrors: PasswordErrors = {};
    if (!password.trim()) {
      nextErrors.password = 'New password is required';
    }
    if (!confirmPassword.trim()) {
      nextErrors.confirmPassword = 'Confirm your password';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }
    if (apiError) {
      nextErrors.api = apiError;
    }
    return nextErrors;
  }, [apiError, confirmPassword, password]);

  const canContinue = !loading && !errors.password && !errors.confirmPassword;

  const submit = async () => {
    setSubmitted(true);
    setApiError('');
    if (!canContinue) {
      return;
    }

    try {
      setLoading(true);
      await confirmPasswordReset({ resetToken, newPassword: password });
      onComplete();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reset password';
      setApiError(message);
      if (message.toLowerCase().includes('expired') || message.toLowerCase().includes('invalid')) {
        onExpired();
      }
    } finally {
      setLoading(false);
    }
  };

  const shownErrors = submitted ? errors : {};

  return (
    <ScreenShell footer={<PrimaryButton label="Reset password" onPress={submit} disabled={!canContinue} loading={loading} />}>
      <View style={styles.content}>
        <Text style={styles.title}>Create a new password</Text>
        <Text style={styles.subhead}>Use a strong password. After this, you will log in again.</Text>

        <View style={styles.form}>
          <SectionLabel>New password</SectionLabel>
          <TextField
            label="New password"
            value={password}
            onChangeText={(value) => {
              setApiError('');
              setPassword(value);
            }}
            secureTextEntry={!passwordVisible}
            rightElement={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={passwordVisible ? 'Conceal password' : 'Reveal password'}
                onPress={() => setPasswordVisible((visible) => !visible)}
                style={styles.passwordToggle}
              >
                <PasswordVisibilityIcon visible={passwordVisible} />
              </Pressable>
            }
            error={shownErrors.password}
          />
          <TextField
            label="Confirm password"
            value={confirmPassword}
            onChangeText={(value) => {
              setApiError('');
              setConfirmPassword(value);
            }}
            secureTextEntry={!passwordVisible}
            error={shownErrors.confirmPassword}
          />
          {shownErrors.api ? <Text style={styles.errorText}>{shownErrors.api}</Text> : null}
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: type.title,
  subhead: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 20,
    marginBottom: 20,
  },
  form: {
    width: '100%',
    gap: 14,
  },
  errorText: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  passwordToggle: {
    alignItems: 'center',
    borderRadius: 999,
    minWidth: 44,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});