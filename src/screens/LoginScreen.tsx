import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { SectionLabel } from '../components/SectionLabel';
import { TextField } from '../components/TextField';
import { loginStudent } from '../services/api';
import { OnboardingAction } from '../state/onboardingReducer';
import { colors, fonts, type } from '../theme/tokens';
import { AuthSession } from '../models/onboarding';

interface LoginScreenProps {
  dispatch: React.Dispatch<OnboardingAction>;
  onContinue: (session?: AuthSession) => void;
}

type LoginErrors = Partial<Record<'email' | 'password' | 'api', string>>;

export function LoginScreen({ dispatch, onContinue }: LoginScreenProps) {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const errors = useMemo<LoginErrors>(() => {
    const nextErrors: LoginErrors = {};

    if (!email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      nextErrors.email = 'Enter a valid email';
    }

    if (!password.trim()) {
      nextErrors.password = 'Password is required';
    }

    if (apiError) {
      nextErrors.api = apiError;
    }

    return nextErrors;
  }, [apiError, email, password]);

  const canContinue = Object.keys(errors).filter((key) => key !== 'api').length === 0 && !loading;

  const submit = async () => {
    setSubmitted(true);
    setApiError('');

    if (!canContinue) {
      return;
    }

    try {
      setLoading(true);
      const data = await loginStudent({ email: email.trim(), password });

      if (data.totp_required && data.mfa_token) {
        dispatch({
          type: 'SET_AUTH_SESSION',
          session: {
            mfaToken: data.mfa_token,
            expiresIn: data.expires_in,
            mustEnrollTotp: false,
            totpRequired: true,
          },
        });
        onContinue();
        return;
      }

      if (data.must_enroll_totp && data.access && data.user) {
        dispatch({
          type: 'SET_AUTH_SESSION',
          session: {
            access: data.access,
            refresh: data.refresh,
            user: data.user,
            mustEnrollTotp: true,
          },
        });
        onContinue();
        return;
      }

      if (data.access && data.user) {
        const session = {
          access: data.access,
          refresh: data.refresh,
          user: data.user,
          mustEnrollTotp: false,
          totpRequired: false,
        };
        dispatch({
          type: 'SET_AUTH_SESSION',
          session,
        });
        onContinue(session);
        return;
      }

      throw new Error('Login succeeded, but the server did not return an auth session.');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  const shownErrors = submitted ? errors : {};

  return (
    <ScreenShell footer={<PrimaryButton label="Sign in" onPress={submit} disabled={!canContinue} loading={loading} />}>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subhead}>Sign in with your registered account, then complete the TOTP check.</Text>

      <View style={styles.form}>
        <SectionLabel>Login</SectionLabel>
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
        <TextField
          label="Password"
          value={password}
          onChangeText={(value) => {
            setApiError('');
            setPassword(value);
          }}
          secureTextEntry
          error={shownErrors.password}
        />
        {shownErrors.api ? <Text style={styles.errorText}>{shownErrors.api}</Text> : null}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  title: type.title,
  subhead: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 50,
    marginBottom: 8,
  },
  form: {
    gap: 14,
  },
  errorText: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
});
