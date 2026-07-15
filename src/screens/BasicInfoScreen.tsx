import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChoiceChips } from '../components/ChoiceChips';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { SectionLabel } from '../components/SectionLabel';
import { TextField } from '../components/TextField';
import { AuthSession, BasicInfoField, interests, OnboardingState } from '../models/onboarding';
import { createStudentProfile, getAccessToken, getRefreshToken, registerStudent } from '../services/api';
import { OnboardingAction } from '../state/onboardingReducer';
import { colors, fonts, type } from '../theme/tokens';
import { validateBasicInfo, BasicInfoErrors } from '../utils/validation';

interface BasicInfoScreenProps {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onContinue: (session?: AuthSession) => void;
  apiError?: string;
  onClearApiError?: () => void;
}

type RegisterErrors = BasicInfoErrors & Partial<Record<'password' | 'api', string>>;

export function BasicInfoScreen({ state, dispatch, onContinue, apiError: externalApiError = '', onClearApiError }: BasicInfoScreenProps) {
  const [submitted, setSubmitted] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localApiError, setLocalApiError] = useState('');
  const isCreatingMissingProfile = Boolean(state.authSession?.access && state.authSession.user);
  const apiError = localApiError || externalApiError;

  const errors = useMemo<RegisterErrors>(() => {
    const nextErrors: RegisterErrors = validateBasicInfo(state.basicInfo);

    if (!isCreatingMissingProfile && !password.trim()) {
      nextErrors.password = 'Password is required';
    }

    if (apiError) {
      nextErrors.api = apiError;
    }

    return nextErrors;
  }, [apiError, isCreatingMissingProfile, password, state.basicInfo]);

  const canContinue = Object.keys(errors).filter((key) => key !== 'api').length === 0 && !loading;

  const update = (field: BasicInfoField) => (value: string) => {
    setLocalApiError('');
    onClearApiError?.();
    dispatch({ type: 'UPDATE_BASIC_INFO', field, value });
  };

  const submit = async () => {
    setSubmitted(true);
    setLocalApiError('');
    onClearApiError?.();

    if (!canContinue) {
      return;
    }

    try {
      setLoading(true);
      let session: AuthSession;

      if (isCreatingMissingProfile && state.authSession) {
        session = state.authSession;
      } else {
        const data = await registerStudent({
          email: state.basicInfo.email.trim(),
          password,
          name: state.basicInfo.fullName.trim(),
        });

        const access = getAccessToken(data);

        if (!access || !data.user) {
          throw new Error('Registration succeeded, but the server did not return an auth session.');
        }

        session = {
          access,
          refresh: getRefreshToken(data),
          user: data.user,
          mustEnrollTotp: Boolean(data.must_enroll_totp),
        };
      }

      if (needsTotpSetup(session)) {
        dispatch({ type: 'SET_AUTH_SESSION', session });
        onContinue(session);
        return;
      }

      await createStudentProfile(session, state.basicInfo);
      const nextSession = markProfileCreated(session);

      dispatch({ type: 'SET_AUTH_SESSION', session: nextSession });
      onContinue(nextSession);
    } catch (error) {
      setLocalApiError(error instanceof Error ? error.message : 'Unable to create profile');
    } finally {
      setLoading(false);
    }
  };

  const shownErrors = submitted ? errors : {};

  return (
    <ScreenShell footer={<PrimaryButton label={isCreatingMissingProfile ? 'Create profile' : 'Continue'} onPress={submit} disabled={loading} loading={loading} />}>
      <Text style={styles.title}>Tell us who you are</Text>
      <Text style={styles.subhead}>A few details help your agent understand your background and what you want next.</Text>

      <View style={styles.form}>
        <SectionLabel>{isCreatingMissingProfile ? 'Profile details' : 'Register'}</SectionLabel>
        <TextField label="Full name" value={state.basicInfo.fullName} onChangeText={update('fullName')} error={shownErrors.fullName} />
        <TextField
          label="Email"
          value={state.basicInfo.email}
          onChangeText={update('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          error={shownErrors.email}
        />
        {!isCreatingMissingProfile ? (
          <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry error={shownErrors.password} />
        ) : null}
        <TextField
          label="Phone number"
          value={state.basicInfo.phone}
          onChangeText={update('phone')}
          keyboardType="phone-pad"
          error={shownErrors.phone}
        />
        <TextField
          label="Date of birth"
          value={state.basicInfo.dateOfBirth}
          onChangeText={update('dateOfBirth')}
          placeholder="DD / MM / YYYY"
          error={shownErrors.dateOfBirth}
        />

        <SectionLabel>Your studies</SectionLabel>
        <TextField label="College/university" value={state.basicInfo.college} onChangeText={update('college')} error={shownErrors.college} />
        <TextField
          label="Field or branch of study"
          value={state.basicInfo.fieldOfStudy}
          onChangeText={update('fieldOfStudy')}
          error={shownErrors.fieldOfStudy}
        />
        <TextField
          label="Degree level"
          value={state.basicInfo.degreeLevel}
          onChangeText={update('degreeLevel')}
          placeholder="Bachelor's, Master's, Diploma..."
          error={shownErrors.degreeLevel}
        />
        <TextField
          label="Year in college"
          value={state.basicInfo.yearInCollege}
          onChangeText={update('yearInCollege')}
          placeholder="1st, 2nd, 3rd, final..."
          error={shownErrors.yearInCollege}
        />
        <TextField
          label="Expected graduation year"
          value={state.basicInfo.expectedGraduation}
          onChangeText={update('expectedGraduation')}
          placeholder="2026"
          error={shownErrors.expectedGraduation}
        />

        <SectionLabel>Where you are</SectionLabel>
        <TextField label="City" value={state.basicInfo.city} onChangeText={update('city')} error={shownErrors.city} />
        <TextField label="State/region" value={state.basicInfo.region} onChangeText={update('region')} error={shownErrors.region} />
        <TextField label="Country" value={state.basicInfo.country} onChangeText={update('country')} error={shownErrors.country} />

        <SectionLabel>What are you interested in?</SectionLabel>
        <ChoiceChips
          options={interests}
          selected={state.basicInfo.interests}
          onToggle={(interest) => dispatch({ type: 'TOGGLE_INTEREST', interest })}
          error={shownErrors.interests}
        />
        <TextField
          label="Target degree or field"
          optional
          value={state.basicInfo.targetDegreeOrField}
          onChangeText={update('targetDegreeOrField')}
          placeholder="MS in Computer Science"
        />
        {shownErrors.api ? <Text style={styles.errorText}>{shownErrors.api}</Text> : null}
      </View>
    </ScreenShell>
  );
}

function needsTotpSetup(session: AuthSession): boolean {
  return Boolean(session.mustEnrollTotp || session.totpRequired || session.mfaToken);
}

function markProfileCreated(session: AuthSession): AuthSession {
  if (!session.user) {
    return { ...session, profileCreated: true };
  }

  return {
    ...session,
    profileCreated: true,
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
  errorText: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
});
