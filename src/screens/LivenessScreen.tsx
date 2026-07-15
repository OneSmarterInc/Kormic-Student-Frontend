import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { OnboardingState } from '../models/onboarding';
import { OnboardingServices } from '../services/onboardingServices';
import { OnboardingAction } from '../state/onboardingReducer';
import { colors, fonts, radii, type } from '../theme/tokens';

interface LivenessScreenProps {
  state: OnboardingState;
  services: OnboardingServices;
  dispatch: React.Dispatch<OnboardingAction>;
  onContinue: () => void;
}

export function LivenessScreen({ state, services, dispatch, onContinue }: LivenessScreenProps) {
  const [guide, setGuide] = useState('The live camera verification is not enabled in this build.');

  const start = async () => {
    dispatch({ type: 'SET_LIVENESS', status: 'capturing' });
    setGuide('Turn your head slowly');
    const result = await services.liveness.startCheck();
    dispatch({ type: 'SET_LIVENESS', status: result === 'success' ? 'success' : 'retry' });
  };

  const body = () => {
    if (state.livenessStatus === 'capturing') {
      return (
        <>
          <View style={[styles.faceFrame, styles.scanning]}>
            <Text style={styles.face}>:)</Text>
          </View>
          <Text style={styles.title}>Hold still</Text>
          <Text style={styles.subhead}>{guide}</Text>
        </>
      );
    }

    if (state.livenessStatus === 'success') {
      return (
        <>
          <View style={styles.check}>
            <Text style={styles.checkText}>OK</Text>
          </View>
          <Text style={styles.title}>Identity check ready</Text>
          <Text style={styles.subhead}>A real liveness provider must confirm this before we mark anyone verified.</Text>
        </>
      );
    }

    if (state.livenessStatus === 'retry') {
      return (
        <>
          <View style={styles.faceFrame}>
            <Text style={styles.face}>:)</Text>
          </View>
          <Text style={styles.title}>Let's try that again</Text>
          <Text style={styles.subhead}>Use a little more light and keep your face inside the frame.</Text>
        </>
      );
    }

    return (
      <>
        <View style={styles.faceFrame}>
          <Text style={styles.face}>:)</Text>
        </View>
        <Text style={styles.title}>Let's confirm it's really you</Text>
        <Text style={styles.subhead}>
          Live camera verification is being integrated separately, so this step is not part of onboarding right now.
        </Text>
      </>
    );
  };

  const footer =
    state.livenessStatus === 'success' ? (
      <PrimaryButton label="Continue" onPress={onContinue} />
    ) : (
      <PrimaryButton
        label="Continue without liveness"
        onPress={start}
        disabled
        loading={state.livenessStatus === 'capturing'}
      />
    );

  return (
    <ScreenShell scroll={false} footer={footer}>
      <View style={styles.content}>{body()}</View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  faceFrame: {
    width: 210,
    height: 260,
    borderRadius: 105,
    borderWidth: 3,
    borderColor: colors.line,
    backgroundColor: 'rgba(91,141,239,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  scanning: {
    borderColor: colors.connectionBlue,
  },
  face: {
    color: 'rgba(246,245,241,0.34)',
    fontFamily: fonts.bodyMedium,
    fontSize: 72,
  },
  check: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: colors.coral,
    backgroundColor: 'rgba(255,107,74,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  checkText: {
    color: colors.coral,
    fontFamily: fonts.bodyMedium,
  },
  title: {
    ...type.title,
    textAlign: 'center',
    marginBottom: 12,
  },
  subhead: {
    ...type.body,
    textAlign: 'center',
  },
  privacy: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 12,
  },
});
