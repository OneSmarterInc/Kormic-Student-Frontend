import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { OnboardingState } from '../models/onboarding';
import { OnboardingServices } from '../services/onboardingServices';
import { OnboardingAction } from '../state/onboardingReducer';
import { colors, fonts, radii, type } from '../theme/tokens';

interface CvScreenProps {
  state: OnboardingState;
  services: OnboardingServices;
  dispatch: React.Dispatch<OnboardingAction>;
  onContinue: () => void;
}

export function CvScreen({ state, services, dispatch, onContinue }: CvScreenProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const pick = async () => {
    setError('');
    try {
      setLoading(true);
      const file = await services.cv.pickFile();
      await services.cv.upload(state.authSession, file);
      dispatch({ type: 'SELECT_CV', file });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to upload CV');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell
      scroll={false}
      footer={
        <PrimaryButton
          label={state.cvFile ? 'Continue' : 'Upload CV'}
          onPress={state.cvFile ? onContinue : pick}
          disabled={loading}
          loading={loading}
        />
      }
    >
      <View style={styles.content}>
        <View style={styles.glyph}>
          <Text style={styles.glyphText}>CV</Text>
        </View>
        <Text style={styles.title}>Upload your CV</Text>
        <Text style={styles.subhead}>This fills in the rest of your story. Your agent reads it to understand your full background.</Text>
        {state.cvFile ? (
          <View style={styles.fileCard}>
            <View style={styles.fileIcon}>
              <Text style={styles.fileIconText}>PDF</Text>
            </View>
            <View style={styles.fileCopy}>
              <Text style={styles.fileName}>{state.cvFile.name}</Text>
              <Text style={styles.fileStatus}>Looks good</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Remove CV" onPress={() => dispatch({ type: 'REMOVE_CV' })} hitSlop={8}>
              <Text style={styles.remove}>x</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.hint}>
            <Text style={styles.hintText}>PDF, DOC, or DOCX works fine. CV is required for this simulated flow.</Text>
          </View>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  glyph: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderColor: colors.coral,
    borderWidth: 1,
    backgroundColor: 'rgba(255,107,74,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  glyphText: {
    color: colors.coral,
    fontFamily: fonts.bodyMedium,
  },
  title: type.title,
  subhead: {
    ...type.body,
    marginTop: 12,
    marginBottom: 18,
  },
  hint: {
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelInk,
    padding: 13,
  },
  hintText: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelInk,
    padding: 14,
  },
  fileIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(255,107,74,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileIconText: {
    color: colors.coral,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  fileCopy: {
    flex: 1,
  },
  fileName: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  fileStatus: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 3,
  },
  remove: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
  },
  error: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
});
