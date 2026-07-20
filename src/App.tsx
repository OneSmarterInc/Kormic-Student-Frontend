import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import {
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
  useFonts as useFraunces,
} from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_600SemiBold, useFonts as useInter } from '@expo-google-fonts/inter';
import { ProgressHeader } from './components/ProgressHeader';
import { initialOnboardingState, OnboardingRoute } from './models/onboarding';
import { canAdvanceFrom } from './navigation/routes';
import { AgentLiveScreen } from './screens/AgentLiveScreen';
import { AriaBotScreen } from './screens/AriaBotScreen';
import { BasicInfoScreen } from './screens/BasicInfoScreen';
import { BuildingAgentScreen } from './screens/BuildingAgentScreen';
import { CvScreen } from './screens/CvScreen';
import { GitHubScreen } from './screens/GitHubScreen';
import { LinkedInScreen } from './screens/LinkedInScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ProfileScreen, StudentProfile } from './screens/ProfileScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { createStudentProfile, getMe, getStudentProfile, refreshAccessToken } from './services/api';
import { mockOnboardingServices } from './services/onboardingServices';
import { clearSavedTokens, getSavedTokens, saveAccessToken, saveTokens } from './services/tokenStorage';
import { onboardingReducer } from './state/onboardingReducer';
import { colors, fonts } from './theme/tokens';
import TotpScreen from './screens/TotpSetupScreen';
import { AuthSession } from './models/onboarding';
import { isBasicInfoComplete } from './utils/validation';
const botIcon = require('./assets/bot.jpeg');

function getFirstMissingOnboardingRoute(session: AuthSession): OnboardingRoute {
  const onboarding = session.user?.onboarding;

  if (!onboarding || onboarding.setup_complete) {
    return 'Profile';
  }
  if (!onboarding.profile_exists) {
    return 'BasicInfo';
  }
  if (!onboarding.github_connected) {
    return 'GitHub';
  }
  if (!onboarding.linkedin_connected) {
    return 'LinkedIn';
  }
  if (!onboarding.resume_uploaded) {
    return 'CV';
  }

  return 'Profile';
}

function getNextRouteAfterStep(route: OnboardingRoute, session?: AuthSession): OnboardingRoute | undefined {
  const onboarding = session?.user?.onboarding;

  if (route === 'GitHub') {
    if (!onboarding?.linkedin_connected) {
      return 'LinkedIn';
    }
    if (!onboarding?.resume_uploaded) {
      return 'CV';
    }
    return 'BuildingAgent';
  }
  if (route === 'LinkedIn') {
    if (!onboarding?.resume_uploaded) {
      return 'CV';
    }
    return 'BuildingAgent';
  }

  return undefined;
}

function withProfileCreated(session: AuthSession): AuthSession {
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isTotpEnrollmentError(message: string) {
  return message.toLowerCase().includes('totp enrollment');
}

function isAuthRoute(route: OnboardingRoute) {
  return route === 'Welcome' || route === 'Login' || route === 'BasicInfo' || route === 'SecuritySetup';
}

function hidesBotLauncher(route: OnboardingRoute) {
  return (
    route === 'CV' ||
    route === 'GitHub' ||
    route === 'AgentLive' ||
    route === 'LinkedIn' ||
    route === 'BuildingAgent'
  );
}

export default function App() {
  const [frauncesLoaded] = useFraunces({
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
  });
  const [interLoaded] = useInter({
    Inter_400Regular,
    Inter_600SemiBold,
  });
  const [state, dispatch] = useReducer(onboardingReducer, initialOnboardingState);
  const [profile, setProfile] = useState<StudentProfile | undefined>();
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [basicInfoApiError, setBasicInfoApiError] = useState('');
  const [restoringSession, setRestoringSession] = useState(true);
  const [botReturnRoute, setBotReturnRoute] = useState<OnboardingRoute>('Profile');
  const [profileAriaActive, setProfileAriaActive] = useState(false);
  const services = useMemo(() => mockOnboardingServices, []);

  const navigate = useCallback((route: OnboardingRoute) => dispatch({ type: 'NAVIGATE', route }), []);
  const back = useCallback(() => dispatch({ type: 'BACK' }), []);
  const openBotScreen = useCallback(() => {
    setBotReturnRoute(state.route === 'BotScreen' ? botReturnRoute : state.route);
    navigate('BotScreen');
  }, [botReturnRoute, navigate, state.route]);
  const closeBotScreen = useCallback(() => {
    navigate(botReturnRoute);
  }, [botReturnRoute, navigate]);
  const next = useCallback(() => {
    const routedStep = getNextRouteAfterStep(state.route, state.authSession);
    if (routedStep) {
      navigate(routedStep);
      return;
    }

    if (canAdvanceFrom(state.route, state)) {
      dispatch({ type: 'NEXT' });
    }
  }, [navigate, state]);
  const completeBuild = useCallback(() => navigate('AgentLive'), [navigate]);
  const loadProfileForSession = useCallback(async (session: AuthSession) => {
    setProfileError('');
    setProfileLoading(true);

    try {
      const nextProfile = await getStudentProfile(session);
      setProfile(nextProfile as StudentProfile);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Unable to load student profile');
    } finally {
      setProfileLoading(false);
    }
  }, []);
  const continueAfterAuth = useCallback(
    async (session: AuthSession) => {
      let nextSession = session;
      const onboarding = nextSession.user?.onboarding;
      setBasicInfoApiError('');

      if (onboarding && !onboarding.profile_exists && isBasicInfoComplete(state.basicInfo)) {
        try {
          await createStudentProfile(nextSession, state.basicInfo);
          nextSession = withProfileCreated(nextSession);
        } catch (error) {
          const message = getErrorMessage(error, 'Unable to create student profile');

          if (nextSession.refresh && isTotpEnrollmentError(message)) {
            try {
              const refreshed = await refreshAccessToken(nextSession.refresh);
              nextSession = {
                ...nextSession,
                access: refreshed.access,
                refresh: refreshed.refresh ?? nextSession.refresh,
              };
              await createStudentProfile(nextSession, state.basicInfo);
              nextSession = withProfileCreated(nextSession);
            } catch (retryError) {
              setBasicInfoApiError(
                getErrorMessage(retryError, 'Unable to create student profile after TOTP verification'),
              );
            }
          } else {
            setBasicInfoApiError(message);
          }
        }
      }

      await saveTokens(nextSession);
      dispatch({ type: 'SET_AUTH_SESSION', session: nextSession });
      const nextRoute = getFirstMissingOnboardingRoute(nextSession);
      navigate(nextRoute);
      if (nextRoute === 'Profile') {
        loadProfileForSession(nextSession);
      }
    },
    [loadProfileForSession, navigate, state.basicInfo],
  );
  const continueAfterBasicInfo = useCallback(
    async (session?: AuthSession) => {
      if (!session) {
        navigate('SecuritySetup');
        return;
      }

      if (session.mustEnrollTotp || session.totpRequired || !session.user?.totp_enrolled) {
        await saveTokens(session);
        navigate('SecuritySetup');
        return;
      }

      await continueAfterAuth(session);
    },
    [continueAfterAuth, navigate],
  );
  const viewProfile = useCallback(async () => {
    if (!state.authSession) {
      setProfileError('Please sign in again before opening your profile.');
      navigate('Profile');
      return;
    }

    navigate('Profile');
    await loadProfileForSession(state.authSession);
  }, [loadProfileForSession, navigate, state.authSession]);
  const handleProfileChanged = useCallback(
    async (updatedProfile?: StudentProfile) => {
      if (updatedProfile) {
        setProfile(updatedProfile);
        setProfileError('');
      }

      if (state.authSession) {
        await loadProfileForSession(state.authSession);
      }
    },
    [loadProfileForSession, state.authSession],
  );
  const logout = useCallback(async () => {
    await clearSavedTokens();
    setProfile(undefined);
    setProfileError('');
    setProfileLoading(false);
    dispatch({ type: 'LOGOUT' });
  }, []);

  useEffect(() => {
    let active = true;

    const restore = async () => {
      const tokens = await getSavedTokens();
      if (!tokens) {
        setRestoringSession(false);
        return;
      }

      try {
        let access = tokens.access;
        let user;
        try {
          user = await getMe(access);
        } catch (restoreError) {
          if (!tokens.refresh) {
            throw restoreError;
          }

          const refreshed = await refreshAccessToken(tokens.refresh);
          access = refreshed.access;
          await saveAccessToken(access);
          user = await getMe(access);
        }
        if (!active) {
          return;
        }

        const session: AuthSession = {
          access,
          refresh: tokens.refresh,
          user,
          mustEnrollTotp: false,
          totpRequired: false,
        };
        dispatch({ type: 'SET_AUTH_SESSION', session });
        const route = getFirstMissingOnboardingRoute(session);
        navigate(route);
        if (route === 'Profile') {
          await loadProfileForSession(session);
        }
      } catch {
        await clearSavedTokens();
      } finally {
        if (active) {
          setRestoringSession(false);
        }
      }
    };

    restore();

    return () => {
      active = false;
    };
  }, [loadProfileForSession, navigate]);

  if (!frauncesLoaded || !interLoaded || restoringSession) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.coral} />
      </View>
    );
  }

  const content = (() => {
    switch (state.route) {
      case 'Welcome':
        return <WelcomeScreen onStart={() => navigate('BasicInfo')} onLogin={() => navigate('Login')} />;
      case 'Login':
        return (
          <LoginScreen
            dispatch={dispatch}
            onContinue={(session) => (session ? continueAfterAuth(session) : navigate('SecuritySetup'))}
            onSignUp={() => navigate('Welcome')}
          />
        );
      case 'BasicInfo':
        return (
          <BasicInfoScreen
            state={state}
            dispatch={dispatch}
            onContinue={continueAfterBasicInfo}
            apiError={basicInfoApiError}
            onClearApiError={() => setBasicInfoApiError('')}
          />
        );
      case 'SecuritySetup':
        return (
          <TotpScreen
            authSession={state.authSession}
            basicInfo={state.basicInfo}
            onAuthenticated={(session) => dispatch({ type: 'SET_AUTH_SESSION', session })}
            onContinue={continueAfterAuth}
          />
        );
      case 'GitHub':
        return <GitHubScreen state={state} services={services} dispatch={dispatch} onContinue={next} />;
      case 'LinkedIn':
        return <LinkedInScreen state={state} services={services} dispatch={dispatch} onContinue={next} />;
      case 'CV':
        return <CvScreen state={state} services={services} dispatch={dispatch} onContinue={next} />;
      case 'BuildingAgent':
        return (
          <BuildingAgentScreen
            services={services}
            buildStage={state.buildStage}
            dispatch={dispatch}
            onComplete={completeBuild}
          />
        );
      case 'AgentLive':
        return <AgentLiveScreen state={state} onViewProfile={viewProfile} loadingProfile={profileLoading} />;
      case 'Profile':
        return (
          <ProfileScreen
            profile={profile}
            loading={profileLoading}
            error={profileError}
            session={state.authSession}
            services={services}
            onRetry={viewProfile}
            onProfileChanged={handleProfileChanged}
            onLogout={logout}
            onAriaSectionActiveChange={setProfileAriaActive}
          />
        );
      case 'BotScreen':
        return <BotScreen session={state.authSession} onBack={closeBotScreen} />;
    }
  })();

  const showBotLauncher =
    Boolean(state.authSession?.access) &&
    !isAuthRoute(state.route) &&
    !hidesBotLauncher(state.route) &&
    state.route !== 'BotScreen' &&
    !(state.route === 'Profile' && profileAriaActive);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.ink} />
      <ProgressHeader route={state.route} onBack={back} />
      {content}
      {showBotLauncher ? <FloatingBotLauncher onPress={openBotScreen} /> : null}
    </View>
  );
}

function BotScreen({ session, onBack }: { session?: AuthSession; onBack: () => void }) {
  return (
    <View style={styles.botScreen}>
      <View style={styles.botTopBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={styles.botBackButton}
        >
          <Text style={styles.botBackText}>{'<'}</Text>
        </Pressable>
        <Text style={styles.botTitle}>Agent chat</Text>
      </View>

      <View style={styles.botContent}>
        <AriaBotScreen session={session} />
      </View>
    </View>
  );
}

function FloatingBotLauncher({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open agent chat"
      onPress={onPress}
      style={styles.botLauncher}
    >
      <Image source={botIcon} style={styles.botLauncherImage} resizeMode="cover" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  botScreen: {
    flex: 1,
    backgroundColor: colors.ink,
    paddingHorizontal: 14,
    paddingBottom: 14,
    marginTop: 28,
  },
  botTopBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 10,
    paddingTop: 12,
  },
  botBackButton: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  botBackText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 20,
  },
  botLauncherImage: {
    height: 54,
    width: 54,
    borderRadius: 27,
  },
  botTitle: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
  },
  botContent: {
    flex: 1,
  },
  botLauncher: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 28,
    borderWidth: 1,
    bottom: 22,
    elevation: 8,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 14,
    width: 56,
  },
  botLauncherText: {
    color: '#1A0F0A',
    fontFamily: fonts.heading,
    fontSize: 22,
    lineHeight: 27,
  },
});
