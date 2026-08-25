import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChoiceChips } from '../components/ChoiceChips';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { SectionLabel } from '../components/SectionLabel';
import { TextField } from '../components/TextField';
import { AuthSession, BasicInfoField, interests, OnboardingState } from '../models/onboarding';
import { createStudentProfile, getAccessToken, getRefreshToken, registerStudent } from '../services/api';
import { OnboardingAction } from '../state/onboardingReducer';
import { colors, fonts, type } from '../theme/tokens';
import { validateBasicInfo, validatePassword, BasicInfoErrors } from '../utils/validation';
import { DropdownField } from '../components/DropdownField';
import { PasswordVisibilityIcon } from '../components/PasswordVisibilityIcon';
import DateTimePicker from '@react-native-community/datetimepicker';

interface BasicInfoScreenProps {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onContinue: (session?: AuthSession) => void;
  apiError?: string;
  onClearApiError?: () => void;
}

type RegisterErrors = BasicInfoErrors & Partial<Record<'password' | 'api', string>>;

const collegeOptions = [
  { label: 'Indian Institute of Technology Bombay', value: 'Indian Institute of Technology Bombay' },
  {
    label: 'Veermata Jijabai Technological Institute, Mumbai',
    value: 'Veermata Jijabai Technological Institute, Mumbai',
  },
  { label: 'COEP Technological University, Pune', value: 'COEP Technological University, Pune' },
  {
    label: 'Sardar Patel Institute of Technology, Mumbai',
    value: 'Sardar Patel Institute of Technology, Mumbai',
  },
  {
    label: 'Pune Institute of Computer Technology, Pune',
    value: 'Pune Institute of Computer Technology, Pune',
  },
  {
    label: 'Visvesvaraya National Institute of Technology, Nagpur',
    value: 'Visvesvaraya National Institute of Technology, Nagpur',
  },
  { label: 'Vishwakarma Institute of Technology, Pune', value: 'Vishwakarma Institute of Technology, Pune' },
  {
    label: 'Pimpri Chinchwad College of Engineering, Pune',
    value: 'Pimpri Chinchwad College of Engineering, Pune',
  },
  { label: 'MIT World Peace University, Pune', value: 'MIT World Peace University, Pune' },
  {
    label: 'Dr. D. Y. Patil Institute of Technology, Akurdi',
    value: 'Dr. D. Y. Patil Institute of Technology, Akurdi',
  },
  {
    label: 'Dr. D. Y. Patil Institute of Engineering, Management and Research, Pimpri',
    value: 'Dr. D. Y. Patil Institute of Engineering, Management and Research, Pimpri',
  },
  {
    label: 'Sinhgad College of Engineering, Vadgaon, Pune',
    value: 'Sinhgad College of Engineering, Vadgaon, Pune',
  },
  {
    label: 'Sinhgad Institute of Technology and Science, Narhe',
    value: 'Sinhgad Institute of Technology and Science, Narhe',
  },
  { label: 'AISSMS College of Engineering, Pune', value: 'AISSMS College of Engineering, Pune' },
  {
    label: 'Marathwada Mitra Mandal College of Engineering, Pune',
    value: 'Marathwada Mitra Mandal College of Engineering, Pune',
  },
  {
    label: 'JSPM Rajarshi Shahu College of Engineering, Pune',
    value: 'JSPM Rajarshi Shahu College of Engineering, Pune',
  },
  {
    label: 'Pune Vidyarthi Griha College of Engineering and Technology, Pune',
    value: 'Pune Vidyarthi Griha College of Engineering and Technology, Pune',
  },
  {
    label: 'Cummins College of Engineering for Women, Pune',
    value: 'Cummins College of Engineering for Women, Pune',
  },
  {
    label: 'Bharati Vidyapeeth College of Engineering, Pune',
    value: 'Bharati Vidyapeeth College of Engineering, Pune',
  },
  {
    label: 'Shri Ramdeobaba College of Engineering and Management, Nagpur',
    value: 'Shri Ramdeobaba College of Engineering and Management, Nagpur',
  },
  {
    label: 'Government College of Engineering, Amravati',
    value: 'Government College of Engineering, Amravati',
  },
  { label: 'Walchand College of Engineering, Sangli', value: 'Walchand College of Engineering, Sangli' },
  { label: 'KIT College of Engineering, Kolhapur', value: 'KIT College of Engineering, Kolhapur' },
  {
    label: 'D. Y. Patil College of Engineering and Technology, Kolhapur',
    value: 'D. Y. Patil College of Engineering and Technology, Kolhapur',
  },
  {
    label: 'Shri Guru Gobind Singhji Institute of Engineering and Technology, Nanded',
    value: 'Shri Guru Gobind Singhji Institute of Engineering and Technology, Nanded',
  },
  {
    label: 'Government College of Engineering, Chhatrapati Sambhajinagar',
    value: 'Government College of Engineering, Chhatrapati Sambhajinagar',
  },
  {
    label: 'K. K. Wagh Institute of Engineering Education and Research, Nashik',
    value: 'K. K. Wagh Institute of Engineering Education and Research, Nashik',
  },
  { label: 'MET Institute of Engineering, Nashik', value: 'MET Institute of Engineering, Nashik' },
  {
    label: 'SSBT College of Engineering and Technology, Jalgaon',
    value: 'SSBT College of Engineering and Technology, Jalgaon',
  },
  {
    label: 'P. R. Pote Patil College of Engineering and Management, Amravati',
    value: 'P. R. Pote Patil College of Engineering and Management, Amravati',
  },
  {
    label: 'Sant Gajanan Maharaj College of Engineering and Management, Shegaon',
    value: 'Sant Gajanan Maharaj College of Engineering and Management, Shegaon',
  },

  // Popular institutes outside Maharashtra
  { label: 'Indian Institute of Technology Delhi', value: 'Indian Institute of Technology Delhi' },
  { label: 'Indian Institute of Technology Madras', value: 'Indian Institute of Technology Madras' },
  { label: 'Indian Institute of Technology Kanpur', value: 'Indian Institute of Technology Kanpur' },
  { label: 'Indian Institute of Technology Kharagpur', value: 'Indian Institute of Technology Kharagpur' },
  { label: 'Indian Institute of Technology Roorkee', value: 'Indian Institute of Technology Roorkee' },
  { label: 'Indian Institute of Technology Guwahati', value: 'Indian Institute of Technology Guwahati' },
  {
    label: 'Birla Institute of Technology and Science, Pilani',
    value: 'Birla Institute of Technology and Science, Pilani',
  },
  {
    label: 'National Institute of Technology Tiruchirappalli',
    value: 'National Institute of Technology Tiruchirappalli',
  },
  {
    label: 'National Institute of Technology Karnataka, Surathkal',
    value: 'National Institute of Technology Karnataka, Surathkal',
  },
  { label: 'National Institute of Technology Warangal', value: 'National Institute of Technology Warangal' },
  {
    label: 'International Institute of Information Technology, Hyderabad',
    value: 'International Institute of Information Technology, Hyderabad',
  },
  {
    label: 'International Institute of Information Technology, Bangalore',
    value: 'International Institute of Information Technology, Bangalore',
  },
  { label: 'Delhi Technological University', value: 'Delhi Technological University' },
  { label: 'Netaji Subhas University of Technology', value: 'Netaji Subhas University of Technology' },
  { label: 'Punjab Engineering College, Chandigarh', value: 'Punjab Engineering College, Chandigarh' },

  { label: 'Other college/university', value: 'Other college/university' },
];

const fieldOptions = [
  { label: 'Computer Engineering', value: 'Computer Engineering' },
  { label: 'Computer Science', value: 'Computer Science' },
  { label: 'Information Technology', value: 'Information Technology' },
  { label: 'Artificial Intelligence', value: 'Artificial Intelligence' },
  {
    label: 'Artificial Intelligence and Machine Learning',
    value: 'Artificial Intelligence and Machine Learning',
  },
  { label: 'Data Science', value: 'Data Science' },
  { label: 'Data Analytics', value: 'Data Analytics' },
  { label: 'Cyber Security', value: 'Cyber Security' },
  { label: 'Internet of Things (IoT)', value: 'Internet of Things (IoT)' },
  { label: 'Electronics and Telecommunication', value: 'Electronics and Telecommunication' },
  { label: 'Electronics Engineering', value: 'Electronics Engineering' },
  { label: 'Electrical Engineering', value: 'Electrical Engineering' },
  { label: 'Mechanical Engineering', value: 'Mechanical Engineering' },
  { label: 'Civil Engineering', value: 'Civil Engineering' },
  { label: 'Chemical Engineering', value: 'Chemical Engineering' },
  { label: 'Automobile Engineering', value: 'Automobile Engineering' },
  { label: 'Other', value: 'Other' },
];

const degreeLevelOptions = [
  { label: "Bachelor's", value: "Bachelor's" },
  { label: "Master's", value: "Master's" },
  { label: 'Diploma', value: 'Diploma' },
  { label: 'PhD', value: 'PhD' },
  { label: 'Other', value: 'Other' },
];

const yearInCollegeOptions = [
  { label: '1st Year', value: '1st Year' },
  { label: '2nd Year', value: '2nd Year' },
  { label: '3rd Year', value: '3rd Year' },
  { label: 'Final Year', value: 'Final Year' },
];

const countryOptions = [
  { label: 'India', value: 'India' },
  { label: 'United States', value: 'United States' },
  { label: 'Canada', value: 'Canada' },
  { label: 'United Kingdom', value: 'United Kingdom' },
  { label: 'Australia', value: 'Australia' },
  { label: 'Germany', value: 'Germany' },
  { label: 'Ireland', value: 'Ireland' },

  { label: 'United Arab Emirates', value: 'United Arab Emirates' },
  { label: 'Singapore', value: 'Singapore' },
  { label: 'New Zealand', value: 'New Zealand' },
  { label: 'France', value: 'France' },
  { label: 'Italy', value: 'Italy' },
  { label: 'Spain', value: 'Spain' },
  { label: 'Netherlands', value: 'Netherlands' },
  { label: 'Switzerland', value: 'Switzerland' },
  { label: 'Sweden', value: 'Sweden' },
  { label: 'Norway', value: 'Norway' },
  { label: 'Denmark', value: 'Denmark' },
  { label: 'Finland', value: 'Finland' },

  { label: 'Japan', value: 'Japan' },
  { label: 'South Korea', value: 'South Korea' },
  { label: 'China', value: 'China' },
  { label: 'Hong Kong', value: 'Hong Kong' },
  { label: 'Malaysia', value: 'Malaysia' },
  { label: 'Thailand', value: 'Thailand' },
  { label: 'Indonesia', value: 'Indonesia' },
  { label: 'Vietnam', value: 'Vietnam' },
  { label: 'Philippines', value: 'Philippines' },

  { label: 'Brazil', value: 'Brazil' },
  { label: 'Mexico', value: 'Mexico' },
  { label: 'Argentina', value: 'Argentina' },
  { label: 'South Africa', value: 'South Africa' },
  { label: 'Egypt', value: 'Egypt' },
  { label: 'Nigeria', value: 'Nigeria' },

  { label: 'Bangladesh', value: 'Bangladesh' },
  { label: 'Sri Lanka', value: 'Sri Lanka' },
  { label: 'Nepal', value: 'Nepal' },
  { label: 'Bhutan', value: 'Bhutan' },

  { label: 'Other', value: 'Other' },
];

function getGraduationYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 50 }, (_, index) => {
    const year = currentYear + index;
    return { label: String(year), value: String(year) };
  });
}

export function BasicInfoScreen({
  state,
  dispatch,
  onContinue,
  apiError: externalApiError = '',
  onClearApiError,
}: BasicInfoScreenProps) {
  const [submitted, setSubmitted] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [localApiError, setLocalApiError] = useState('');
  const isCreatingMissingProfile = Boolean(state.authSession?.access && state.authSession.user);
  const apiError = localApiError || externalApiError;
  const graduationYearOptions = useMemo(() => getGraduationYearOptions(), []);

  const errors = useMemo<RegisterErrors>(() => {
    const nextErrors: RegisterErrors = validateBasicInfo(state.basicInfo);

    if (!isCreatingMissingProfile) {
      const passwordError = validatePassword(password);

      if (passwordError) {
        nextErrors.password = passwordError;
      }
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
    <ScreenShell
      footer={
        <PrimaryButton
          label={isCreatingMissingProfile ? 'Create profile' : 'Continue'}
          onPress={submit}
          disabled={loading}
          loading={loading}
        />
      }
    >
      <Text style={styles.title}>Tell us who you are</Text>
      <Text style={styles.subhead}>
        A few details help your agent understand your background and what you want next.
      </Text>

      <View style={styles.form}>
        <SectionLabel>{isCreatingMissingProfile ? 'Profile details' : 'Register'}</SectionLabel>
        <TextField
          label="Full name"
          required
          value={state.basicInfo.fullName}
          onChangeText={update('fullName')}
          error={shownErrors.fullName}
        />
        <TextField
          label="Email"
          required
          value={state.basicInfo.email}
          onChangeText={update('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          error={shownErrors.email}
        />
        {!isCreatingMissingProfile ? (
          <TextField
            label="Password"
            required
            value={password}
            onChangeText={setPassword}
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
        ) : null}
        <TextField
          label="Phone number"
          required
          value={state.basicInfo.phone}
          onChangeText={(text) => {
            const digitsOnly = text.replace(/\D/g, '').slice(0, 10);
            update('phone')(digitsOnly);
          }}
          keyboardType="phone-pad"
          maxLength={10}
          error={shownErrors.phone}
        />

        <View style={styles.dateField}>
          <Text style={styles.fieldLabel}>
            Date of birth <Text style={styles.requiredMark}>*</Text>
          </Text>

          {Platform.OS === 'web' ? (
            React.createElement(
              'div',
              {
                style: {
                  ...webDateDisplayStyle,
                  ...(shownErrors.dateOfBirth ? webDateInputErrorStyle : undefined),
                },
              },
              React.createElement(
                'span',
                {
                  style: {
                    color: state.basicInfo.dateOfBirth ? colors.offWhite : '#666783',
                    fontFamily: fonts.body,
                    fontSize: 15,
                  },
                },
                state.basicInfo.dateOfBirth
                  ? formatDateForDisplay(state.basicInfo.dateOfBirth)
                  : 'MM/DD/YYYY',
              ),
              React.createElement('span', { style: webDateIconStyle }, '▾'),
              React.createElement('input', {
                type: 'date',
                value: toInputDate(state.basicInfo.dateOfBirth),
                max: toInputDate(toDisplayDate(new Date())),
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                  update('dateOfBirth')(fromInputDate(event.target.value));
                },
                style: webDateInputStyle,
              }),
            )
          ) : (
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[styles.dateButton, shownErrors.dateOfBirth ? styles.errorBorder : undefined]}
            >
              <Text style={[styles.dateButtonText, !state.basicInfo.dateOfBirth && styles.placeholderText]}>
                {state.basicInfo.dateOfBirth
                  ? formatDateForDisplay(state.basicInfo.dateOfBirth)
                  : 'Select date of birth'}
              </Text>
            </Pressable>
          )}
          {shownErrors.dateOfBirth ? <Text style={styles.fieldError}>{shownErrors.dateOfBirth}</Text> : null}

          {Platform.OS !== 'web' && showDatePicker && (
            <DateTimePicker
              value={parseDateValue(state.basicInfo.dateOfBirth)}
              mode="date"
              maximumDate={new Date()}
              onChange={(event, date) => {
                setShowDatePicker(false);

                if (date) {
                  update('dateOfBirth')(toDisplayDate(date));
                }
              }}
            />
          )}
        </View>

        <SectionLabel>Your studies</SectionLabel>
        <DropdownField
          label="College/university"
          required
          data={collegeOptions}
          value={state.basicInfo.college}
          onChange={update('college')}
          error={shownErrors.college}
        />
        <DropdownField
          label="Field or branch of study"
          required
          data={fieldOptions}
          value={state.basicInfo.fieldOfStudy}
          onChange={update('fieldOfStudy')}
          error={shownErrors.fieldOfStudy}
        />
        <DropdownField
          label="Degree level"
          required
          data={degreeLevelOptions}
          value={state.basicInfo.degreeLevel}
          onChange={update('degreeLevel')}
          error={shownErrors.degreeLevel}
        />
        <DropdownField
          label="Year in college"
          required
          data={yearInCollegeOptions}
          value={state.basicInfo.yearInCollege}
          onChange={update('yearInCollege')}
          error={shownErrors.yearInCollege}
        />
        <DropdownField
          label="Expected graduation year"
          required
          data={graduationYearOptions}
          value={state.basicInfo.expectedGraduation}
          onChange={update('expectedGraduation')}
          error={shownErrors.expectedGraduation}
        />

        <SectionLabel>Where you are</SectionLabel>
        <TextField
          label="City"
          required
          value={state.basicInfo.city}
          onChangeText={update('city')}
          error={shownErrors.city}
        />
        <TextField
          label="State/region"
          required
          value={state.basicInfo.region}
          onChangeText={update('region')}
          error={shownErrors.region}
        />
        <DropdownField
          label="Country"
          required
          data={countryOptions}
          value={state.basicInfo.country}
          onChange={update('country')}
          error={shownErrors.country}
        />

        <SectionLabel>
          What are you interested in? <Text style={styles.requiredMark}>*</Text>
        </SectionLabel>
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

function parseDateValue(value: string) {
  const date = value ? parseStoredDate(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatDateForDisplay(value: string) {
  return toDisplayDate(parseDateValue(value));
}

function parseStoredDate(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, month, day, year] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(value);
}

function toDisplayDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function toInputDate(value: string) {
  if (!value) {
    return '';
  }

  const date = parseDateValue(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromInputDate(value: string) {
  if (!value) {
    return '';
  }

  return toDisplayDate(new Date(`${value}T00:00:00`));
}

const webDateDisplayStyle: React.CSSProperties = {
  alignItems: 'center',
  backgroundColor: colors.panelInk,
  borderColor: colors.line,
  borderRadius: 12,
  borderStyle: 'solid',
  borderWidth: 1,
  boxSizing: 'border-box',
  cursor: 'pointer',
  display: 'flex',
  justifyContent: 'space-between',
  minHeight: 48,
  overflow: 'hidden',
  paddingLeft: 14,
  paddingRight: 14,
  position: 'relative',
  width: '100%',
};

const webDateIconStyle: React.CSSProperties = {
  color: '#666783',
  fontSize: 16,
  pointerEvents: 'none',
};

const webDateInputStyle: React.CSSProperties = {
  cursor: 'pointer',
  inset: 0,
  opacity: 0,
  outline: 'none',
  position: 'absolute',
  width: '100%',
};

const webDateInputErrorStyle: React.CSSProperties = {
  borderColor: colors.error,
};

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
    paddingBottom: 174,
  },
  dateField: {
    gap: 6,
  },
  fieldLabel: {
    color: '#B9B8CC',
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  dateButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelInk,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  dateButtonText: {
    color: colors.offWhite,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  placeholderText: {
    color: '#666783',
  },
  errorBorder: {
    borderColor: colors.error,
  },
  fieldError: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  passwordToggle: {
    alignItems: 'center',
    borderRadius: 999,
    minWidth: 44,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  errorText: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  requiredMark: {
    color: colors.coral,
  },
});
