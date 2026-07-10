import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ConfirmModal } from '../components/ConfirmModal';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { OnboardingState } from '../models/onboarding';
import { OnboardingServices } from '../services/onboardingServices';
import { OnboardingAction } from '../state/onboardingReducer';
import { colors, fonts, radii, type } from '../theme/tokens';

interface GitHubScreenProps {
  state: OnboardingState;
  services: OnboardingServices;
  dispatch: React.Dispatch<OnboardingAction>;
  onContinue: () => void;
}

export function GitHubScreen({ state, services, dispatch, onContinue }: GitHubScreenProps) {
  const [skipVisible, setSkipVisible] = useState(false);

  const connect = async () => {
    setSkipVisible(false);
    dispatch({ type: 'SET_GITHUB_CONNECTING' });
    try {
      const result = await services.github.connect();
      dispatch({ type: 'SET_GITHUB_CONNECTED', handle: result.handle });
    } catch {
      dispatch({ type: 'SET_GITHUB_ERROR' });
    }
  };

  const skip = () => {
    dispatch({ type: 'SKIP_GITHUB' });
    setSkipVisible(false);
    onContinue();
  };

  const connected = state.githubStatus === 'connected';

  return (
    <ScreenShell
      scroll={false}
      footer={
        <>
          <PrimaryButton
  		testID="connect-github-button"
  		label={connected ? 'Continue' : state.githubStatus === 'connecting' ? 'Connecting' : 'Connect GitHub'}
            onPress={connected ? onContinue : connect}
            disabled={state.githubStatus === 'connecting'}
          />
          <PrimaryButton label="Skip for now" onPress={() => setSkipVisible(true)} variant="secondary" />
        </>
      }
    >
      <View style={styles.content}>
        <View style={styles.glyph}>
          <Text style={styles.glyphText}>GH</Text>
        </View>
        <Text style={styles.title}>Connect your GitHub</Text>
        <Text style={styles.subhead}>
          Your real projects and code are the strongest part of your profile, so we verify them directly.
        </Text>
        {connected ? (
          <View style={styles.card}>
            <Text style={styles.cardText}>Connected as {state.githubHandle}</Text>
          </View>
        ) : null}
        {state.githubStatus === 'error' ? <Text style={styles.error}>That did not connect. Try again.</Text> : null}
        <Text style={styles.consequence}>
          You can continue, but your agent may have less verified information to work with.
        </Text>
      </View>
      <ConfirmModal
        visible={skipVisible}
        title="Your profile will be incomplete"
        message="Without GitHub, your agent may not be able to verify your projects, code, and technical work. You can add it later, but your profile will remain incomplete until you do."
        primaryLabel="Connect GitHub"
        secondaryLabel="Skip anyway"
        onPrimary={connect}
        onSecondary={skip}
        onRequestClose={() => setSkipVisible(false)}
      />
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
    backgroundColor: '#1E1E2E',
    borderColor: colors.line,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  glyphText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
  },
  title: type.title,
  subhead: {
    ...type.body,
    marginTop: 12,
    marginBottom: 18,
  },
  card: {
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelInk,
    padding: 14,
    marginBottom: 12,
  },
  cardText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
  },
  error: {
    color: colors.error,
    fontFamily: fonts.body,
    marginBottom: 12,
  },
  consequence: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
});
