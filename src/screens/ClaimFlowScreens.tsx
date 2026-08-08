import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PasswordVisibilityIcon } from '../components/PasswordVisibilityIcon';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { SectionLabel } from '../components/SectionLabel';
import { TextField } from '../components/TextField';
import { colors, fonts, radii, type } from '../theme/tokens';

export interface ClaimPrefill {
  full_name: string;
  email: string;
  field_of_study: string;
  degree_level: string;
  expected_graduation: string;
  phone: string;
  year_in_college: string;
  program_name: string;
  city: string;
  state: string;
  institute_id?: string;
  institute_name?: string;
}

export type ClaimEditableField = Exclude<keyof ClaimPrefill, 'email' | 'institute_id' | 'institute_name'>;

interface ClaimLandingScreenProps {
  token?: string;
  loading?: boolean;
  error?: string;
  onTokenChange: (token: string) => void;
  onRequestCode: () => void;
  onBackToWelcome: () => void;
}

interface ClaimCodeScreenProps {
  maskedEmail: string;
  loading?: boolean;
  resending?: boolean;
  error?: string;
  onVerify: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
}

interface ClaimReviewScreenProps {
  value: ClaimPrefill;
  loading?: boolean;
  error?: string;
  onChange: (field: ClaimEditableField, value: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}

interface ClaimPasswordScreenProps {
  email: string;
  fullName: string;
  loading?: boolean;
  error?: string;
  onCreateAccount: (password: string) => void;
  onBack: () => void;
}

export function ClaimLandingScreen({
  token,
  loading = false,
  error,
  onTokenChange,
  onRequestCode,
  onBackToWelcome,
}: ClaimLandingScreenProps) {
  const hasToken = Boolean(token?.trim());

  return (
    <ScreenShell
      footer={
        <View style={styles.footerStack}>
          <PrimaryButton label="Send verification code" onPress={onRequestCode} disabled={!hasToken} loading={loading} />
          <PrimaryButton label="Back to welcome" onPress={onBackToWelcome} variant="secondary" disabled={loading} />
        </View>
      }
    >
      <View style={styles.content}>
        <ClaimStepHeader step="1" total="5" label="Invitation claim" />
        <View style={styles.heroIcon}>
          <Text style={styles.heroIconText}>ID</Text>
        </View>
        <Text style={styles.title}>Claim your student profile</Text>
        <Text style={styles.subhead}>
          We will confirm this invitation with a one-time code sent to the email your institute uploaded.
        </Text>

        <View style={styles.form}>
          <SectionLabel>Invitation link</SectionLabel>
          <TextField
            label="Invitation token"
            value={token ?? ''}
            onChangeText={onTokenChange}
            placeholder="Paste token from invite link"
            autoCapitalize="none"
            autoCorrect={false}
            required
          />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardLabel}>Invite status</Text>
          <Text style={styles.cardText}>
            {hasToken ? 'Invitation token found. You can continue.' : 'No invitation token was found in this link.'}
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </ScreenShell>
  );
}

export function ClaimCodeScreen({
  maskedEmail,
  loading = false,
  resending = false,
  error,
  onVerify,
  onResend,
  onBack,
}: ClaimCodeScreenProps) {
  const [code, setCode] = useState('');
  const normalizedCode = code.trim();
  const canContinue = /^\d{6}$/.test(normalizedCode);

  return (
    <ScreenShell
      footer={
        <View style={styles.footerStack}>
          <PrimaryButton label="Verify code" onPress={() => onVerify(normalizedCode)} disabled={!canContinue} loading={loading} />
          <PrimaryButton label={resending ? 'Sending code...' : 'Resend code'} onPress={onResend} variant="secondary" disabled={loading || resending} loading={resending} />
        </View>
      }
    >
      <View style={styles.content}>
        <ClaimStepHeader step="2" total="5" label="Email check" onBack={onBack} />
        <Text style={styles.title}>Enter your code</Text>
        <Text style={styles.subhead}>We sent a 6-digit code to {maskedEmail}. It expires soon.</Text>

        <View style={styles.form}>
          <SectionLabel>Verification</SectionLabel>
          <TextField
            label="6-digit code"
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
            required
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </View>
    </ScreenShell>
  );
}

export function ClaimReviewScreen({ value, loading = false, error, onChange, onConfirm, onBack }: ClaimReviewScreenProps) {
  const missingRequired = useMemo(
    () =>
      !value.full_name.trim() ||
      !value.field_of_study.trim() ||
      !value.degree_level.trim() ||
      !value.expected_graduation.trim() ||
      !value.phone.trim() ||
      !value.year_in_college.trim() ||
      !value.program_name.trim() ||
      !value.city.trim() ||
      !value.state.trim(),
    [value],
  );

  const update = (field: ClaimEditableField) => (nextValue: string) => onChange(field, nextValue);

  return (
    <ScreenShell footer={<PrimaryButton label="Confirm profile" onPress={onConfirm} disabled={missingRequired} loading={loading} />}>
      <View style={styles.contentTop}>
        <ClaimStepHeader step="3" total="5" label="Review details" onBack={onBack} />
        <Text style={styles.title}>Review your student details</Text>
        <Text style={styles.subhead}>These details came from your institute. Correct anything that is outdated before you continue.</Text>

        {value.institute_name ? (
          <View style={styles.badgeCard}>
            <Text style={styles.cardLabel}>Institute sourced</Text>
            <Text style={styles.cardText}>{value.institute_name}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <SectionLabel>Identity</SectionLabel>
          <TextField label="Full name" value={value.full_name} onChangeText={update('full_name')} required />
          <TextField label="Email" value={value.email} editable={false} required />
          <TextField label="Phone" value={value.phone} onChangeText={update('phone')} keyboardType="phone-pad" required />

          <SectionLabel>Studies</SectionLabel>
          <TextField label="College/university" value={value.institute_name ?? ''} editable={false} />
          <TextField label="Field or branch of study" value={value.field_of_study} onChangeText={update('field_of_study')} required />
          <TextField label="Degree level" value={value.degree_level} onChangeText={update('degree_level')} required />
          <TextField label="Program name" value={value.program_name} onChangeText={update('program_name')} required />
          <TextField
            label="Expected graduation year"
            value={value.expected_graduation}
            onChangeText={(nextValue) => update('expected_graduation')(nextValue.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            required
          />
          <TextField label="Year in college" value={value.year_in_college} onChangeText={update('year_in_college')} required />

          <SectionLabel>Location</SectionLabel>
          <TextField label="City" value={value.city} onChangeText={update('city')} required />
          <TextField label="State/region" value={value.state} onChangeText={update('state')} required />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </View>
    </ScreenShell>
  );
}

export function ClaimPasswordScreen({
  email,
  fullName,
  loading = false,
  error,
  onCreateAccount,
  onBack,
}: ClaimPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const canContinue = Boolean(password.trim()) && password === confirmPassword;

  return (
    <ScreenShell
      footer={
        <View style={styles.footerStack}>
          <PrimaryButton label="Create account" onPress={() => onCreateAccount(password)} disabled={!canContinue} loading={loading} />
          <PrimaryButton label="Back to review" onPress={onBack} variant="secondary" disabled={loading} />
        </View>
      }
    >
      <View style={styles.content}>
        <ClaimStepHeader step="4" total="5" label="Account setup" />
        <Text style={styles.title}>Set your password</Text>
        <Text style={styles.subhead}>This creates the login account for {fullName || email}. TOTP setup comes next.</Text>

        <View style={styles.infoCard}>
          <Text style={styles.cardLabel}>Account email</Text>
          <Text style={styles.cardText}>{email}</Text>
        </View>

        <View style={styles.form}>
          <SectionLabel>Password</SectionLabel>
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!passwordVisible}
            required
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
          />
          <TextField
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!passwordVisible}
            required
            error={confirmPassword.length > 0 && password !== confirmPassword ? 'Passwords do not match' : undefined}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </View>
    </ScreenShell>
  );
}

export function ClaimTotpBridgeScreen({ onContinue, loading = false }: { onContinue: () => void; loading?: boolean }) {
  return (
    <ScreenShell footer={<PrimaryButton label="Set up security" onPress={onContinue} loading={loading} />}>
      <View style={styles.content}>
        <ClaimStepHeader step="5" total="5" label="Security" />
        <View style={styles.heroIcon}>
          <Text style={styles.heroIconText}>2FA</Text>
        </View>
        <Text style={styles.title}>Secure your account</Text>
        <Text style={styles.subhead}>
          Your profile is claimed and your account is created. One authenticator code is required before normal app access.
        </Text>
      </View>
    </ScreenShell>
  );
}

function ClaimStepHeader({
  step,
  total,
  label,
  onBack,
}: {
  step: string;
  total: string;
  label: string;
  onBack?: () => void;
}) {
  return (
    <View style={styles.stepHeader}>
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>{'<'}</Text>
        </Pressable>
      ) : (
        <View style={styles.backButtonPlaceholder} />
      )}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(Number(step) / Number(total)) * 100}%` }]} />
      </View>
      <Text style={styles.stepText}>
        {step} / {total}
      </Text>
      <Text style={styles.stepLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 18,
  },
  contentTop: {
    gap: 18,
  },
  title: {
    ...type.title,
    fontSize: 34,
    lineHeight: 39,
  },
  subhead: {
    ...type.body,
  },
  form: {
    gap: 14,
  },
  footerStack: {
    gap: 10,
  },
  stepHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  backButton: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backButtonPlaceholder: {
    height: 44,
    width: 44,
  },
  backText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 20,
  },
  progressTrack: {
    backgroundColor: colors.panelInk,
    borderRadius: 999,
    flex: 1,
    height: 5,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.coral,
    height: '100%',
  },
  stepText: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  stepLabel: {
    display: 'none',
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  heroIconText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  badgeCard: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(91,141,239,0.35)',
    borderRadius: radii.card,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  cardLabel: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  cardText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    lineHeight: 22,
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
