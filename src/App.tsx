import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { Fraunces_600SemiBold, Fraunces_600SemiBold_Italic, useFonts as useFraunces } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_600SemiBold, useFonts as useInter } from '@expo-google-fonts/inter';
import { ProgressHeader } from './components/ProgressHeader';
import { initialOnboardingState, OnboardingRoute } from './models/onboarding';
import { canAdvanceFrom } from './navigation/routes';
import { AgentLiveScreen } from './screens/AgentLiveScreen';
import { BasicInfoScreen } from './screens/BasicInfoScreen';
import { BuildingAgentScreen } from './screens/BuildingAgentScreen';
import { CvScreen } from './screens/CvScreen';
import { GitHubScreen } from './screens/GitHubScreen';
import { LinkedInScreen } from './screens/LinkedInScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ProfileScreen, StudentProfile } from './screens/ProfileScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { getMe, getStudentProfile, refreshAccessToken } from './services/api';
import { mockOnboardingServices } from './services/onboardingServices';
import { onboardingReducer } from './state/onboardingReducer';
import { colors } from './theme/tokens';
import TotpScreen from './screens/TotpSetupScreen';
import { AuthSession } from './models/onboarding';

const ACCESS_TOKEN_KEY = 'kormic.access';
const REFRESH_TOKEN_KEY = 'kormic.refresh';

function saveSession(session: AuthSession) {
  if (typeof localStorage === 'undefined') {
    return;
  }
  if (session.access) {
    localStorage.setItem(ACCESS_TOKEN_KEY, session.access);
  }
  if (session.refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh);
  }
}

function clearSavedSession() {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function getSavedTokens() {
  if (typeof localStorage === 'undefined') {
    return undefined;
  }

  const access = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!access) {
    return undefined;
  }

  return {
    access,
    refresh: localStorage.getItem(REFRESH_TOKEN_KEY) ?? undefined,
  };
}

function getFirstMissingOnboardingRoute(session: AuthSession): OnboardingRoute {
  const onboarding = session.user?.onboarding;

  if (!onboarding || onboarding.setup_complete) {
    return 'Profile';
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
  const [restoringSession, setRestoringSession] = useState(true);
  const services = useMemo(() => mockOnboardingServices, []);

  const navigate = useCallback((route: OnboardingRoute) => dispatch({ type: 'NAVIGATE', route }), []);
  const back = useCallback(() => dispatch({ type: 'BACK' }), []);
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
  const continueAfterAuth = useCallback((session: AuthSession) => {
    saveSession(session);
    dispatch({ type: 'SET_AUTH_SESSION', session });
    dispatch({ type: 'SET_LIVENESS', status: 'success' });
    const nextRoute = getFirstMissingOnboardingRoute(session);
    navigate(nextRoute);
    if (nextRoute === 'Profile') {
      loadProfileForSession(session);
    }
  }, [loadProfileForSession, navigate]);
  const viewProfile = useCallback(async () => {
    if (!state.authSession) {
      setProfileError('Please sign in again before opening your profile.');
      navigate('Profile');
      return;
    }

    navigate('Profile');
    await loadProfileForSession(state.authSession);
  }, [loadProfileForSession, navigate, state.authSession]);
  const handleProfileChanged = useCallback(async (updatedProfile?: StudentProfile) => {
    if (updatedProfile) {
      setProfile(updatedProfile);
      setProfileError('');
    }

    if (state.authSession) {
      await loadProfileForSession(state.authSession);
    }
  }, [loadProfileForSession, state.authSession]);
  const logout = useCallback(() => {
    clearSavedSession();
    setProfile(undefined);
    setProfileError('');
    setProfileLoading(false);
    dispatch({ type: 'LOGOUT' });
  }, []);

  useEffect(() => {
    let active = true;

    const restore = async () => {
      const tokens = getSavedTokens();
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
          localStorage.setItem(ACCESS_TOKEN_KEY, access);
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
        dispatch({ type: 'SET_LIVENESS', status: 'success' });
        const route = getFirstMissingOnboardingRoute(session);
        navigate(route);
        if (route === 'Profile') {
          await loadProfileForSession(session);
        }
      } catch {
        clearSavedSession();
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
        return <LoginScreen dispatch={dispatch} onContinue={(session) => (session ? continueAfterAuth(session) : navigate('Liveness'))} />;
      case 'BasicInfo':
        return <BasicInfoScreen state={state} dispatch={dispatch} onContinue={() => navigate('Liveness')} />;
      case 'Liveness':
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
          />
        );
    }
  })();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.ink} />
      <ProgressHeader route={state.route} onBack={back} />
      {content}
    </View>
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
});
