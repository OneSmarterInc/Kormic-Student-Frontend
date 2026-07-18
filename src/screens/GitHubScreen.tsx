import React, { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { ConfirmModal } from '../components/ConfirmModal';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { OnboardingState } from '../models/onboarding';
import { OnboardingServices } from '../services/onboardingServices';
import { analyzeGithub, getGithubConnectUrl, getGithubStatus, GithubAnalysisResponse } from '../services/api';
import { OnboardingAction } from '../state/onboardingReducer';
import { colors, fonts, radii, type } from '../theme/tokens';

interface GitHubScreenProps {
  state: OnboardingState;
  services: OnboardingServices;
  dispatch: React.Dispatch<OnboardingAction>;
  onContinue: () => void;
}

type GithubViewStatus = {
  connected: boolean;
  github_username?: string;
  connected_at?: string;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function readGithubCallbackResult() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const params = new URLSearchParams(window.location.search);
  const result = params.get('github');

  if (!result) {
    return undefined;
  }

  params.delete('github');
  const nextSearch = params.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
  window.history.replaceState({}, '', nextUrl);

  return result;
}

export function GitHubScreen({ state, dispatch, onContinue }: GitHubScreenProps) {
  const [skipVisible, setSkipVisible] = useState(false);
  const [status, setStatus] = useState<GithubViewStatus>({ connected: state.githubStatus === 'connected' });
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<GithubAnalysisResponse | undefined>();

  const loadStatus = useCallback(async (options?: { silent?: boolean }) => {
    setError('');

    if (!state.authSession) {
      setError('Please sign in again before connecting GitHub.');
      return undefined;
    }

    try {
      if (!options?.silent) {
        setLoadingStatus(true);
      }
      const nextStatus = await getGithubStatus(state.authSession);
      setStatus(nextStatus);

      if (nextStatus.connected) {
        dispatch({ type: 'SET_GITHUB_CONNECTED', handle: nextStatus.github_username ?? 'GitHub' });
      }

      return nextStatus;
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Unable to check GitHub connection.');
      dispatch({ type: 'SET_GITHUB_ERROR' });
      return undefined;
    } finally {
      if (!options?.silent) {
        setLoadingStatus(false);
      }
    }
  }, [dispatch, state.authSession]);

  const pollStatusAfterOAuth = useCallback(async () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const nextStatus = await loadStatus({ silent: true });

      if (nextStatus?.connected) {
        setMessage('GitHub connected successfully. You can now analyze it.');
        setConnecting(false);
        return;
      }

      await wait(2000);
    }

    setConnecting(false);
    setMessage('If GitHub says connected, return here and tap Connect GitHub again to refresh the status.');
  }, [loadStatus]);

  useEffect(() => {
    const callbackResult = readGithubCallbackResult();

    if (callbackResult === 'connected') {
      setMessage('GitHub connected successfully.');
    }

    if (callbackResult === 'error') {
      setError('GitHub connection was not completed. Try again.');
    }

    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const refreshOnFocus = () => {
      loadStatus({ silent: true });
    };

    window.addEventListener('focus', refreshOnFocus);

    return () => {
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [loadStatus]);

  const connect = async () => {
    setSkipVisible(false);
    setMessage('');
    setError('');

    if (!state.authSession) {
      setError('Please sign in again before connecting GitHub.');
      return;
    }

    dispatch({ type: 'SET_GITHUB_CONNECTING' });
    try {
      setConnecting(true);
      const data = await getGithubConnectUrl(state.authSession);

      if (!data.authorize_url) {
        throw new Error('The server did not return a GitHub authorization URL.');
      }

      if (typeof window !== 'undefined') {
        const popup = window.open(data.authorize_url, '_blank');

        if (!popup) {
          setMessage('GitHub opened in a new browser tab. Complete authorization there, then return here.');
          await Linking.openURL(data.authorize_url);
        } else {
          popup.focus();
          setMessage('Complete GitHub authorization in the new tab, then return here.');
        }

        pollStatusAfterOAuth();
        return;
      }

      await Linking.openURL(data.authorize_url);
      setMessage('Complete GitHub authorization in the browser, then return here.');
      pollStatusAfterOAuth();
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'Unable to start GitHub OAuth.');
      dispatch({ type: 'SET_GITHUB_ERROR' });
      setConnecting(false);
    }
  };

  const analyze = async () => {
    setMessage('');
    setError('');

    if (!state.authSession) {
      setError('Please sign in again before analyzing GitHub.');
      return;
    }

    try {
      setAnalyzing(true);
      const result = await analyzeGithub(state.authSession);
      setAnalysis(result);
      dispatch({ type: 'SET_GITHUB_CONNECTED', handle: status.github_username ?? state.githubHandle ?? 'GitHub' });
      onContinue();
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'Unable to analyze GitHub.');
      dispatch({ type: 'SET_GITHUB_ERROR' });
    } finally {
      setAnalyzing(false);
    }
  };

  const skip = () => {
    dispatch({ type: 'SKIP_GITHUB' });
    setSkipVisible(false);
    onContinue();
  };

  const connected = status.connected || state.githubStatus === 'connected';
  const disabled = loadingStatus || connecting || analyzing || state.githubStatus === 'connecting';

  return (
    <ScreenShell
      scroll={false}
      footer={
        <>
          <PrimaryButton
            testID="connect-github-button"
            label={connected ? 'Analyze GitHub' : 'Connect GitHub'}
            onPress={connected ? analyze : connect}
            disabled={disabled}
            loading={connecting || analyzing}
          />
          <PrimaryButton label="Skip for now" onPress={() => setSkipVisible(true)} variant="secondary" disabled={disabled} />
        </>
      }
    >
      <View style={styles.content}>
        <View style={styles.glyph}>
          <Text style={styles.glyphText}>GH</Text>
        </View>
        <Text style={styles.title}>Connect your GitHub</Text>
        <Text style={styles.subhead}>
          Connect your GitHub account with OAuth so Kormic can verify code that belongs to you.
        </Text>

        {loadingStatus ? <Text style={styles.helper}>Checking GitHub connection...</Text> : null}

        {connected ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>GitHub connected</Text>
            <Text style={styles.cardText}>Connected as @{status.github_username ?? state.githubHandle ?? 'GitHub'}</Text>
            {status.connected_at ? <Text style={styles.cardMeta}>Connected {new Date(status.connected_at).toLocaleDateString()}</Text> : null}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>OAuth required</Text>
            <Text style={styles.cardText}>You will be redirected to GitHub to approve access.</Text>
          </View>
        )}

        {analysis?.skills_added && analysis.skills_added.length > 0 ? (
          <Text style={styles.success}>Skills added: {analysis.skills_added.join(', ')}</Text>
        ) : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {state.githubStatus === 'error' || error ? <Text style={styles.error}>{error || 'That did not connect. Try again.'}</Text> : null}
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
        primaryLoading={connecting}
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
    width: 48,
    height: 48,
    borderRadius: 10,
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
    fontSize: 16,
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
    gap: 6,
  },
  cardLabel: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  cardText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
  },
  cardMeta: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  helper: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    marginBottom: 12,
  },
  success: {
    color: colors.connectionBlue,
    fontFamily: fonts.body,
    marginBottom: 12,
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
