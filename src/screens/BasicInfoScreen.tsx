import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { SectionLabel } from '../components/SectionLabel';
import { TextField } from '../components/TextField';
import { BasicInfoField, OnboardingState } from '../models/onboarding';
import { OnboardingAction } from '../state/onboardingReducer';
import { colors, fonts, type } from '../theme/tokens';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

interface BasicInfoScreenProps {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onContinue: () => void;
}

type RegisterErrors = Partial<Record<'fullName' | 'email' | 'password' | 'studentId' | 'api', string>>;

export function BasicInfoScreen({ state, dispatch, onContinue }: BasicInfoScreenProps) {
  const [submitted, setSubmitted] = useState(false);
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const errors = useMemo<RegisterErrors>(() => {
    const nextErrors: RegisterErrors = {};

    if (!state.basicInfo.fullName.trim()) {
      nextErrors.fullName = 'Full name is required';
    }

    if (!state.basicInfo.email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(state.basicInfo.email.trim())) {
      nextErrors.email = 'Enter a valid email';
    }

    if (!password.trim()) {
      nextErrors.password = 'Password is required';
    }

    if (!studentId.trim()) {
      nextErrors.studentId = 'Student ID is required';
    }

    if (apiError) {
      nextErrors.api = apiError;
    }

    return nextErrors;
  }, [apiError, password, state.basicInfo.email, state.basicInfo.fullName, studentId]);

  const canContinue = Object.keys(errors).filter((key) => key !== 'api').length === 0 && !loading;

  const update = (field: BasicInfoField) => (value: string) => {
    setApiError('');
    dispatch({ type: 'UPDATE_BASIC_INFO', field, value });
  };

  const submit = async () => {
    setSubmitted(true);
    setApiError('');

    if (!canContinue) {
      return;
    }

    const payload = {
      email: state.basicInfo.email.trim(),
      password,
      role: 'student',
      name: state.basicInfo.fullName.trim(),
      student_id: studentId.trim(),
    };

     console.log('Register payload:', payload);
     onContinue();

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/auth/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || data?.detail || 'Unable to create account');
      }

      onContinue();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to create account');
    } finally {
      setLoading(false);
    }
  };

  const shownErrors = submitted ? errors : {};

  return (
    <ScreenShell footer={<PrimaryButton label={loading ? 'Creating account...' : 'Continue'} onPress={submit} disabled={!canContinue} />}>
      <Text style={styles.title}>Tell us who you are</Text>
      <Text style={styles.subhead}>A few details help your agent understand your background and what you want next.</Text>

      <View style={styles.form}>
        <SectionLabel>Register</SectionLabel>
        <TextField label="Full name" value={state.basicInfo.fullName} onChangeText={update('fullName')} error={shownErrors.fullName} />
        <TextField
          label="Email"
          value={state.basicInfo.email}
          onChangeText={update('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          error={shownErrors.email}
        />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry error={shownErrors.password} />
        <TextField
          label="Student ID"
          value={studentId}
          onChangeText={setStudentId}
          autoCapitalize="none"
          error={shownErrors.studentId}
        />
        {shownErrors.api ? <Text style={styles.errorText}>{shownErrors.api}</Text> : null}


        {/*
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
          label="Expected graduation"
          value={state.basicInfo.expectedGraduation}
          onChangeText={update('expectedGraduation')}
          placeholder="MM / YYYY"
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
        */}
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
