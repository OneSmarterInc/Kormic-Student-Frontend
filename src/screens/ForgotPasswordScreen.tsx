import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { SectionLabel } from '../components/SectionLabel';
import { TextField } from '../components/TextField';
import { requestPasswordResetOtp } from '../services/api';
import { colors, fonts, type } from '../theme/tokens';

interface ForgotPasswordScreenProps {
  initialEmail?: string;
  onCodeSent: (email: string) => void;
  onBackToLogin: () => void;
}

type ForgotErrors = Partial<Record<'email' | 'api', string>>;

export function ForgotPasswordScreen({ initialEmail = '', onCodeSent, onBackToLogin }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState(initialEmail);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const errors = useMemo<ForgotErrors>(() => {
    const nextErrors: ForgotErrors = {};
    if (!email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      nextErrors.email = 'Enter a valid email';
    }
    if (apiError) {
      nextErrors.api = apiError;
    }
    return nextErrors;
  }, [apiError, email]);

  const canContinue = !loading && !errors.email;

  const submit = async () => {
    setSubmitted(true);
    setApiError('');
    if (!canContinue) {
      return;
    }

    try {
      setLoading(true);
      await requestPasswordResetOtp(email);
      onCodeSent(email.trim());
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const shownErrors = submitted ? errors : {};

  return (
    <>
      <ScreenShell footer={<PrimaryButton label="Send reset code" onPress={submit} disabled={!canContinue} loading={loading} />}>
        <View style={styles.content}>
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.subhead}>
            Enter your account email. If an account exists, we will send a 6-digit reset code.
          </Text>

          <View style={styles.form}>
            <SectionLabel>Password reset</SectionLabel>
            <TextField
              label="Email"
              value={email}
              onChangeText={(value) => {
                setApiError('');
                setEmail(value);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={shownErrors.email}
            />
            {shownErrors.api ? <Text style={styles.errorText}>{shownErrors.api}</Text> : null}
          </View>
        </View>
      </ScreenShell>
      <View style={styles.footer}>
        <Pressable accessibilityRole="button" onPress={onBackToLogin}>
          <Text style={styles.footerLink}>Back to login</Text>
        </Pressable>
      </View>
    </>
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
  footer: {
    marginBottom: 54,
  },
  footerLink: {
    color: colors.textSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    textAlign: 'center',
  },
});