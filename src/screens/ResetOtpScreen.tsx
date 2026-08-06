import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { SectionLabel } from '../components/SectionLabel';
import { TextField } from '../components/TextField';
import { requestPasswordResetOtp, verifyPasswordResetOtp } from '../services/api';
import { colors, fonts, type } from '../theme/tokens';

interface ResetOtpScreenProps {
  email: string;
  onVerified: (resetToken: string) => void;
  onBackToEmail: () => void;
}

type OtpErrors = Partial<Record<'otp' | 'api', string>>;

const RESEND_SECONDS = 60;

export function ResetOtpScreen({ email, onVerified, onBackToEmail }: ResetOtpScreenProps) {
  const [otp, setOtp] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [apiError, setApiError] = useState('');
  const [resendLockedUntil, setResendLockedUntil] = useState(() => Date.now() + RESEND_SECONDS * 1000);
  const [now, setNow] = useState(Date.now());

  React.useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const resendWait = Math.max(0, Math.ceil((resendLockedUntil - now) / 1000));

  const errors = useMemo<OtpErrors>(() => {
    const nextErrors: OtpErrors = {};
    const normalizedOtp = otp.trim();
    if (!normalizedOtp) {
      nextErrors.otp = 'Reset code is required';
    } else if (!/^\d{6}$/.test(normalizedOtp)) {
      nextErrors.otp = 'Enter the 6-digit code';
    }
    if (apiError) {
      nextErrors.api = apiError;
    }
    return nextErrors;
  }, [apiError, otp]);

  const canContinue = !loading && !errors.otp;
  const canResend = !resending && resendWait === 0;

  const submit = async () => {
    setSubmitted(true);
    setApiError('');
    if (!canContinue) {
      return;
    }

    try {
      setLoading(true);
      const data = await verifyPasswordResetOtp({ email, otp });
      onVerified(data.reset_token);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to verify reset code');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!canResend) {
      return;
    }

    try {
      setResending(true);
      setApiError('');
      await requestPasswordResetOtp(email);
      setResendLockedUntil(Date.now() + RESEND_SECONDS * 1000);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to resend reset code');
    } finally {
      setResending(false);
    }
  };

  const shownErrors = submitted ? errors : {};

  return (
    <>
      <ScreenShell footer={<PrimaryButton label="Verify code" onPress={submit} disabled={!canContinue} loading={loading} />}>
        <View style={styles.content}>
          <Text style={styles.title}>Enter reset code</Text>
          <Text style={styles.subhead}>We sent a 6-digit code to {email}. It expires in 10 minutes.</Text>

          <View style={styles.form}>
            <SectionLabel>Verification</SectionLabel>
            <TextField
              label="6-digit OTP"
              value={otp}
              onChangeText={(value) => {
                setApiError('');
                setOtp(value.replace(/\D/g, '').slice(0, 6));
              }}
              keyboardType="number-pad"
              maxLength={6}
              error={shownErrors.otp}
            />
            {shownErrors.api ? <Text style={styles.errorText}>{shownErrors.api}</Text> : null}
            <Pressable accessibilityRole="button" disabled={!canResend} onPress={resend} style={styles.resendButton}>
              <Text style={[styles.resendText, !canResend && styles.resendDisabled]}>
                {resending ? 'Sending...' : resendWait > 0 ? `Resend code in ${resendWait}s` : 'Resend code'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScreenShell>
      <View style={styles.footer}>
        <Pressable accessibilityRole="button" onPress={onBackToEmail}>
          <Text style={styles.footerLink}>Use a different email</Text>
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
  resendButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  resendText: {
    color: colors.error,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  resendDisabled: {
    color: colors.muted,
  },
  footer: {
    marginBottom: 54,
  },
  footerLink: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    textAlign: 'center',
  },
});