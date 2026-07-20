import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'qrcode-terminal/vendor/QRCode';
import QRErrorCorrectLevel from 'qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { SectionLabel } from '../components/SectionLabel';
import { AuthSession, BasicInfo } from '../models/onboarding';
import { enrollTotp, getAccessToken, getRefreshToken, verifyTotpEnrollment, verifyTotpLogin } from '../services/api';
import { colors, fonts, radii, type } from '../theme/tokens';

const TOTP_LENGTH = 6;

interface TotpScreenProps {
  authSession?: AuthSession;
  basicInfo: BasicInfo;
  onAuthenticated: (session: AuthSession) => void;
  onContinue: (session: AuthSession) => void;
}

function createQrRows(value: string) {
  if (!value) {
    return [];
  }

  const qrCode = new QRCode(-1, QRErrorCorrectLevel.M);
  qrCode.addData(value);
  qrCode.make();

  const moduleCount = qrCode.getModuleCount();
  return Array.from({ length: moduleCount }, (_, rowIndex) =>
    Array.from({ length: moduleCount }, (_, colIndex) => qrCode.isDark(rowIndex, colIndex)),
  );
}

export default function TotpScreen({ authSession, basicInfo, onAuthenticated, onContinue }: TotpScreenProps) {
  const [otp, setOtp] = useState<string[]>(Array(TOTP_LENGTH).fill(''));
  const [secret, setSecret] = useState('');
  const [provisioningUri, setProvisioningUri] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loadingEnrollment, setLoadingEnrollment] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [openingAuthenticator, setOpeningAuthenticator] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const isEnrollment = Boolean(authSession?.mustEnrollTotp && authSession.access);

  const startEnrollment = useCallback(async () => {
    setError('');

    if (!authSession?.access) {
      setError('Missing auth token. Please register again.');
      return;
    }

    try {
      setLoadingEnrollment(true);
      const data = await enrollTotp(authSession.access);

      if (!data.secret || !data.provisioning_uri) {
        throw new Error('The server did not return a TOTP secret.');
      }

      setSecret(data.secret);
      setProvisioningUri(data.provisioning_uri);
    } catch (enrollError) {
      setError(enrollError instanceof Error ? enrollError.message : 'Unable to start TOTP enrollment');
    } finally {
      setLoadingEnrollment(false);
    }
  }, [authSession?.access]);

  useEffect(() => {
    if (isEnrollment) {
      startEnrollment();
    }
  }, [isEnrollment, startEnrollment]);

  const handleChange = (text: string, index: number) => {
    setError('');
    const digits = text.replace(/\D/g, '');

    if (digits.length > 1) {
      const nextOtp = Array(TOTP_LENGTH).fill('');
      digits
        .slice(0, TOTP_LENGTH)
        .split('')
        .forEach((digit, digitIndex) => {
          nextOtp[digitIndex] = digit;
        });
      setOtp(nextOtp);
      inputRefs.current[Math.min(digits.length, TOTP_LENGTH) - 1]?.focus();
      return;
    }

    const nextOtp = [...otp];
    nextOtp[index] = digits;
    setOtp(nextOtp);

    if (digits && index < TOTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (index: number) => {
    if (!otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const openAuthenticator = async () => {
    if (!provisioningUri) {
      return;
    }

    try {
      setOpeningAuthenticator(true);
      const canOpen = await Linking.canOpenURL(provisioningUri);
      if (canOpen) {
        await Linking.openURL(provisioningUri);
      }
    } finally {
      setOpeningAuthenticator(false);
    }
  };

  const verifyOtp = async () => {
    setError('');
    const code = otp.join('');

    if (code.length !== TOTP_LENGTH) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    if (!authSession?.access && !authSession?.mfaToken) {
      setError('Missing auth session. Please sign in again.');
      return;
    }

    try {
      setVerifying(true);
      let nextSession: AuthSession;

      if (isEnrollment && authSession.access) {
        const data = await verifyTotpEnrollment(authSession.access, code);
        setBackupCodes(data.backup_codes ?? []);
        nextSession = {
          ...authSession,
          access: getAccessToken(data) ?? authSession.access,
          refresh: getRefreshToken(data) ?? authSession.refresh,
          mustEnrollTotp: false,
          totpRequired: false,
          user: data.user ?? (authSession.user
            ? {
                ...authSession.user,
                totp_enrolled: true,
                onboarding: authSession.user.onboarding ?? {
                  profile_exists: Boolean(authSession.profileCreated),
                  resume_uploaded: false,
                  github_connected: false,
                  linkedin_connected: false,
                  setup_complete: false,
                },
              }
            : authSession.user),
        };
      } else if (authSession.mfaToken) {
        const data = await verifyTotpLogin(authSession.mfaToken, code);
        nextSession = {
          access: getAccessToken(data) ?? data.access,
          refresh: getRefreshToken(data),
          user: data.user,
          mustEnrollTotp: false,
          totpRequired: false,
        };
      } else {
        throw new Error('Missing auth session. Please sign in again.');
      }

      const completedSession = authSession.profileCreated ? markProfileExists(nextSession) : nextSession;
      onAuthenticated(completedSession);
      onContinue(completedSession);
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Unable to verify the TOTP code');
    } finally {
      setVerifying(false);
    }
  };

  const canVerify = !loadingEnrollment && !verifying && (isEnrollment ? Boolean(secret) : Boolean(authSession?.mfaToken));
  const qrRows = useMemo(() => createQrRows(provisioningUri), [provisioningUri]);

  return (
    <ScreenShell
      footer={
        <PrimaryButton
          label="Verify and continue"
          onPress={verifyOtp}
          disabled={!canVerify}
          loading={verifying}
        />
      }
    >
      <View style={styles.content}>

     
      <Text style={styles.title}>{isEnrollment ? 'Secure your account' : 'Verify your sign in'}</Text>
      <Text style={styles.subhead}>
        {isEnrollment
          ? 'Add Kormic to an authenticator app, then enter the 6-digit code it generates.'
          : 'Enter the 6-digit code from your authenticator app to continue.'}
      </Text>

      <View style={styles.form}>
        {isEnrollment ? (
          <>
            <SectionLabel>Authenticator setup</SectionLabel>

            {loadingEnrollment ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.coral} />
                <Text style={styles.helperText}>Preparing your setup key...</Text>
              </View>
            ) : null}

            {secret ? (
              <View style={styles.setupPanel}>
                {qrRows.length > 0 ? (
                  <View style={styles.qrWrap}>
                    <View accessibilityLabel="TOTP enrollment QR code" style={styles.qrCode}>
                      {qrRows.map((row, rowIndex) => (
                        <View key={`qr-row-${rowIndex}`} style={styles.qrRow}>
                          {row.map((isDark, colIndex) => (
                            <View
                              key={`qr-cell-${rowIndex}-${colIndex}`}
                              style={[styles.qrCell, isDark ? styles.qrCellDark : styles.qrCellLight]}
                            />
                          ))}
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
                <Text style={styles.setupLabel}>Manual setup key</Text>
                <Text selectable style={styles.secret}>
                  {secret}
                </Text>
                <PrimaryButton
                  label="Open authenticator app"
                  variant="secondary"
                  onPress={openAuthenticator}
                  loading={openingAuthenticator}
                />
                <Text style={styles.helperText}>
                  If the app does not open automatically, choose manual setup and paste the key above.
                </Text>
              </View>
            ) : null}
          </>
        ) : null}

        <SectionLabel>Verification code</SectionLabel>
        <View style={styles.otpContainer}>
          {otp.map((value, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              accessibilityLabel={`TOTP digit ${index + 1}`}
              style={styles.otpInput}
              value={value}
              keyboardType="number-pad"
              maxLength={index === 0 ? TOTP_LENGTH : 1}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(event) => {
                if (event.nativeEvent.key === 'Backspace') {
                  handleBackspace(index);
                }
              }}
            />
          ))}
        </View>

        {backupCodes.length > 0 ? (
          <Text style={styles.helperText}>Backup codes created: {backupCodes.length}</Text>
        ) : null}

        {/* {error ? <Text style={styles.errorText}>{error}</Text> : null} */}

        {isEnrollment && !secret ? (
          <PrimaryButton label="Try setup again" variant="secondary" onPress={startEnrollment} loading={loadingEnrollment} />
        ) : null}
      </View>
       </View>
    </ScreenShell>
  );
}

function markProfileExists(session: AuthSession): AuthSession {
  if (!session.user) {
    return session;
  }

  return {
    ...session,
    user: {
      ...session.user,
      onboarding: {
        profile_exists: true,
        resume_uploaded: Boolean(session.user.onboarding?.resume_uploaded),
        github_connected: Boolean(session.user.onboarding?.github_connected),
        linkedin_connected: Boolean(session.user.onboarding?.linkedin_connected),
        setup_complete: Boolean(session.user.onboarding?.setup_complete),
      },
    },
  };
}

const styles = StyleSheet.create({
  content:{
    flex: 1,
    marginTop:24,
    justifyContent: 'center',
    paddingBottom:174,
  },
  title: type.title,
  subhead: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 10,
    marginBottom: 8,
  },
  form: {
    gap: 14,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  setupPanel: {
    gap: 12,
    alignItems: 'stretch',
    borderColor: colors.line,
    borderRadius: radii.card,
    borderWidth: 1,
    backgroundColor: colors.panelInk,
    padding: 16,
  },
  qrWrap: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.offWhite,
    borderRadius: radii.input,
    padding: 10,
  },
  qrCode: {
    width: 220,
    height: 220,
  },
  qrRow: {
    flex: 1,
    flexDirection: 'row',
  },
  qrCell: {
    flex: 1,
  },
  qrCellDark: {
    backgroundColor: '#111111',
  },
  qrCellLight: {
    backgroundColor: colors.offWhite,
  },
  setupLabel: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  secret: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 17,
    letterSpacing: 0,
    lineHeight: 24,
  },
  helperText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  otpContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  otpInput: {
    width: 44,
    height: 52,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.input,
    backgroundColor: colors.panelInk,
    textAlign: 'center',
    fontFamily: fonts.bodyMedium,
    fontSize: 22,
    color: colors.offWhite,
  },
  errorText: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
});
