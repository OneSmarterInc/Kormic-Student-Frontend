import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Image, Linking, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
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
import {
  ClaimCodeScreen,
  ClaimEditableField,
  ClaimLandingScreen,
  ClaimPasswordScreen,
  ClaimPrefill,
  ClaimReviewScreen,
} from './screens/ClaimFlowScreens';
import { CvScreen } from './screens/CvScreen';
import { GitHubScreen } from './screens/GitHubScreen';
import { LinkedInScreen } from './screens/LinkedInScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ProfileScreen, StudentProfile } from './screens/ProfileScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { ResetOtpScreen } from './screens/ResetOtpScreen';
import { ResetPasswordScreen } from './screens/ResetPasswordScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import {
  confirmStudentClaim,
  createStudentProfile,
  getAccessToken,
  getMe,
  getRefreshToken,
  getStudentProfile,
  refreshAccessToken,
  registerStudent,
  startStudentClaim,
  verifyStudentClaim,
} from './services/api';
import { mockOnboardingServices } from './services/onboardingServices';
import { clearSavedTokens, getSavedTokens, saveAccessToken, saveTokens } from './services/tokenStorage';
import { onboardingReducer } from './state/onboardingReducer';
import { colors, fonts } from './theme/tokens';
import TotpScreen from './screens/TotpSetupScreen';
import { AuthSession } from './models/onboarding';
import { isBasicInfoComplete } from './utils/validation';
import {
  addNotificationTapListener,
  registerForPushNotifications,
  shouldOpenAgentChatFromLastNotification,
  unregisterPushNotifications,
  addNotificationReceivedListener,
  pollNotifications,
} from './services/notifications';

const botIcon = require('./assets/bot.jpeg');

const emptyClaimPrefill: ClaimPrefill = {
  full_name: '',
  email: '',
  field_of_study: '',
  degree_level: '',
  expected_graduation: '',
  phone: '',
  year_in_college: '',
  program_name: '',
  city: '',
  state: '',
};

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

function getClaimTokenFromUrl(url?: string | null) {
  if (!url) {
    return '';
  }

  const rawUrl = url.trim();
  const normalizedUrl = rawUrl.toLowerCase();

  const isClaimUrl =
    normalizedUrl.includes('/claim') ||
    normalizedUrl.startsWith('kormicstudent://claim');

  if (!isClaimUrl) {
    return '';
  }

  let token = '';

  if (rawUrl.includes('?')) {
    const queryPart = rawUrl.split('?')[1]?.split('#')[0] ?? '';
    const params = new URLSearchParams(queryPart);
    token = params.get('token') ?? '';
  }

  if (!token && rawUrl.includes('#')) {
    const hashPart = rawUrl.split('#')[1] ?? '';
    if (hashPart.includes('?')) {
      const hashQuery = hashPart.split('?')[1] ?? '';
      const params = new URLSearchParams(hashQuery);
      token = params.get('token') ?? '';
    } else {
      const params = new URLSearchParams(hashPart);
      token = params.get('token') ?? '';
    }
  }

  return token.trim();
}

function isTotpEnrollmentError(message: string) {
  return message.toLowerCase().includes('totp enrollment');
}

function isAuthRoute(route: OnboardingRoute) {
  return route !== 'Profile' && route !== 'AgentLive' && route !== 'BotScreen';
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
  const [botNotificationRefreshKey, setBotNotificationRefreshKey] = useState(0);
  const [profileAriaActive, setProfileAriaActive] = useState(false);
  const services = useMemo(() => mockOnboardingServices, []);
  const [notificationPollSince, setNotificationPollSince] = useState<string | undefined>();
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [claimToken, setClaimToken] = useState('');
  const [claimMaskedEmail, setClaimMaskedEmail] = useState('');
  const [claimSession, setClaimSession] = useState('');
  const [claimPrefill, setClaimPrefill] = useState<ClaimPrefill>(emptyClaimPrefill);
  const [claimError, setClaimError] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimResending, setClaimResending] = useState(false);
  const claimLinkHandledRef = useRef(false);

  const navigate = useCallback((route: OnboardingRoute) => dispatch({ type: 'NAVIGATE', route }), []);
  const back = useCallback(() => dispatch({ type: 'BACK' }), []);
  const openBotScreen = useCallback(() => {
    setBotReturnRoute(state.route === 'BotScreen' ? botReturnRoute : state.route);
    navigate('BotScreen');
  }, [botReturnRoute, navigate, state.route]);

  const closeBotScreen = useCallback(() => {
    const targetRoute = isAuthRoute(botReturnRoute) ? 'Profile' : botReturnRoute;
    navigate(targetRoute);
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
  const resetClaimState = useCallback(() => {
    setClaimToken('');
    setClaimMaskedEmail('');
    setClaimSession('');
    setClaimPrefill(emptyClaimPrefill);
    setClaimError('');
    setClaimLoading(false);
    setClaimResending(false);
  }, []);

  const openClaimFromUrl = useCallback(
    (url?: string | null) => {
      const token = getClaimTokenFromUrl(url);
      if (!token) {
        return false;
      }

      claimLinkHandledRef.current = true;
      resetClaimState();
      setClaimToken(token);
      setClaimError('');
      navigate('ClaimLanding');
      return true;
    },
    [navigate, resetClaimState],
  );

  const requestClaimCode = useCallback(async () => {
    const token = claimToken.trim();
    if (!token) {
      setClaimError('Paste the invitation token before continuing.');
      return;
    }

    setClaimLoading(true);
    setClaimError('');
    try {
      const data = await startStudentClaim(token);
      setClaimMaskedEmail(data.masked_email);
      navigate('ClaimCode');
    } catch (error) {
      setClaimError(getErrorMessage(error, 'Unable to start invitation claim'));
    } finally {
      setClaimLoading(false);
    }
  }, [claimToken, navigate]);

  const resendClaimCode = useCallback(async () => {
    const token = claimToken.trim();
    if (!token) {
      setClaimError('Paste the invitation token before resending.');
      return;
    }

    setClaimResending(true);
    setClaimError('');
    try {
      const data = await startStudentClaim(token);
      setClaimMaskedEmail(data.masked_email);
    } catch (error) {
      setClaimError(getErrorMessage(error, 'Unable to resend invitation code'));
    } finally {
      setClaimResending(false);
    }
  }, [claimToken]);

  const verifyClaimCode = useCallback(
    async (code: string) => {
      const token = claimToken.trim();
      if (!token) {
        setClaimError('Invitation token is missing. Go back and paste the invite token again.');
        return;
      }

      setClaimLoading(true);
      setClaimError('');
      try {
        const data = await verifyStudentClaim({ token, code });
        setClaimSession(data.claim_session);
        setClaimPrefill({
          ...emptyClaimPrefill,
          ...data.prefill,
        });
        navigate('ClaimReview');
      } catch (error) {
        setClaimError(getErrorMessage(error, 'Unable to verify invitation code'));
      } finally {
        setClaimLoading(false);
      }
    },
    [claimToken, navigate],
  );

  const updateClaimPrefill = useCallback((field: ClaimEditableField, value: string) => {
    setClaimPrefill((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const confirmClaimProfile = useCallback(async () => {
    if (!claimSession) {
      setClaimError('Claim session is missing. Request a fresh code and try again.');
      navigate('ClaimCode');
      return;
    }

    setClaimLoading(true);
    setClaimError('');
    try {
      await confirmStudentClaim({
        claimSession,
        fields: {
          full_name: claimPrefill.full_name,
          field_of_study: claimPrefill.field_of_study,
          degree_level: claimPrefill.degree_level,
          expected_graduation: claimPrefill.expected_graduation,
          phone: claimPrefill.phone,
          year_in_college: claimPrefill.year_in_college,
          program_name: claimPrefill.program_name,
          city: claimPrefill.city,
          state: claimPrefill.state,
        },
      });
      navigate('ClaimPassword');
    } catch (error) {
      setClaimError(getErrorMessage(error, 'Unable to confirm invitation claim'));
    } finally {
      setClaimLoading(false);
    }
  }, [claimPrefill, claimSession, navigate]);

  const createClaimAccount = useCallback(
    async (password: string) => {
      if (!claimPrefill.email) {
        setClaimError('Claim email is missing. Verify your invitation code again.');
        navigate('ClaimCode');
        return;
      }

      setClaimLoading(true);
      setClaimError('');
      try {
        const data = await registerStudent({
          email: claimPrefill.email,
          password,
          name: claimPrefill.full_name || claimPrefill.email,
        });
        const access = getAccessToken(data);
        const refresh = getRefreshToken(data);
        if (!access) {
          throw new Error('Account was created, but no access token was returned.');
        }

        const session: AuthSession = {
          access,
          refresh,
          user: data.user,
          mustEnrollTotp: Boolean(data.must_enroll_totp),
          totpRequired: false,
          profileCreated: true,
        };

        await saveTokens(session);
        dispatch({ type: 'SET_AUTH_SESSION', session });
        navigate('SecuritySetup');
      } catch (error) {
        setClaimError(getErrorMessage(error, 'Unable to create invited student account'));
      } finally {
        setClaimLoading(false);
      }
    },
    [claimPrefill.email, claimPrefill.full_name, navigate],
  );

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
      registerForPushNotifications(nextSession).catch((error) => {
        console.log('[notifications] register failed:', error);
      });
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
        return;
      }

      if (state.authSession) {
        await loadProfileForSession(state.authSession);
      }
    },
    [loadProfileForSession, state.authSession],
  );
  const logout = useCallback(async () => {
    try {
      await unregisterPushNotifications(state.authSession);
    } catch {
      // Logout should still clear local auth even if the notification token is already inactive or the network fails.
    }
    await clearSavedTokens();
    setProfile(undefined);
    setProfileError('');
    setProfileLoading(false);
    dispatch({ type: 'LOGOUT' });
  }, [state.authSession]);

  const handleBack = useCallback(() => {
    if (state.route === 'BotScreen') {
      if (isAuthRoute(botReturnRoute)) {
        return false; // Exit app directly! Do not show Welcome/Login page!
      }
      closeBotScreen();
      return true;
    }

    if (isAuthRoute(state.route)) {
      return false; // Exit app directly!
    }

    const validHistory = (state.history ?? []).filter((r) => !isAuthRoute(r));

    if (validHistory.length === 0 && (state.route === 'Profile' || state.route === 'AgentLive')) {
      return false; // Exit app directly!
    }

    if (validHistory.length > 0) {
      back();
      return true;
    }

    return false;
  }, [back, botReturnRoute, closeBotScreen, state.history, state.route]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => {
      subscription.remove();
    };
  }, [handleBack]);

  useEffect(() => {
    return addNotificationReceivedListener(() => {
      setBotNotificationRefreshKey((current) => current + 1);
    });
  }, []);

  useEffect(() => {
    return addNotificationTapListener(() => {
      setBotReturnRoute('Profile');
      setBotNotificationRefreshKey((current) => current + 1);
      navigate('BotScreen');
    });
  }, [navigate]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      openClaimFromUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, [openClaimFromUrl]);

  useEffect(() => {
    let active = true;

    const restore = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (openClaimFromUrl(initialUrl)) {
        setRestoringSession(false);
        return;
      }

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
        registerForPushNotifications(session).catch((error) => {
          console.log('[notifications] register failed:', error);
        });
        const route = getFirstMissingOnboardingRoute(session);
        const openChat = await shouldOpenAgentChatFromLastNotification();

        if (claimLinkHandledRef.current) {
          navigate('ClaimLanding');
        } else if (openChat) {
          setBotReturnRoute('Profile');
          setBotNotificationRefreshKey((current) => current + 1);
          navigate('BotScreen');
        } else {
          navigate(route);
        }
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

  useEffect(() => {
  if (!state.authSession?.access || !state.authSession.user?.totp_enrolled) return;

  let cancelled = false;

  const runPoll = async () => {
    try {
      const result = await pollNotifications(state.authSession, notificationPollSince);

      if (cancelled) return;

      setNotificationPollSince(result.nextSince);

      if (result.hasAgentNotification) {
        setBotNotificationRefreshKey((current) => current + 1);
      }
    } catch (error) {
      console.log('[notifications] poll failed:', error);
    }
  };

  runPoll();
  const interval = setInterval(runPoll, 15000);

  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}, [
  state.authSession?.access,
  state.authSession?.user?.totp_enrolled,
  notificationPollSince,
]);

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
        return (
          <WelcomeScreen
            onStart={() => navigate('BasicInfo')}
            onLogin={() => navigate('Login')}
            onClaim={() => {
              resetClaimState();
              navigate('ClaimLanding');
            }}
          />
        );
      case 'Login':
        return (
          <LoginScreen
            dispatch={dispatch}
            onContinue={(session) => (session ? continueAfterAuth(session) : navigate('SecuritySetup'))}
            onSignUp={() => navigate('Welcome')}
            onForgotPassword={() => navigate('ForgotPassword')}
          />
        );
      case 'ForgotPassword':
        return (
          <ForgotPasswordScreen
            initialEmail={resetEmail}
            onCodeSent={(email) => {
              setResetEmail(email);
              navigate('ResetOtp');
            }}
            onBackToLogin={() => navigate('Login')}
          />
        );
      case 'ResetOtp':
        return (
          <ResetOtpScreen
            email={resetEmail}
            onVerified={(token) => {
              setResetToken(token);
              navigate('ResetPassword');
            }}
            onBackToEmail={() => navigate('ForgotPassword')}
          />
        );
      case 'ResetPassword':
        return (
          <ResetPasswordScreen
            resetToken={resetToken}
            onComplete={() => {
              setResetToken('');
              navigate('Login');
            }}
            onExpired={() => {
              setResetToken('');
              navigate('ForgotPassword');
            }}
          />
        );
      case 'ClaimLanding':
        return (
          <ClaimLandingScreen
            token={claimToken}
            loading={claimLoading}
            error={claimError}
            onTokenChange={(token) => {
              setClaimToken(token);
              setClaimError('');
            }}
            onRequestCode={requestClaimCode}
            onBackToWelcome={() => {
              resetClaimState();
              navigate('Welcome');
            }}
          />
        );
      case 'ClaimCode':
        return (
          <ClaimCodeScreen
            maskedEmail={claimMaskedEmail || 'your institute email'}
            loading={claimLoading}
            resending={claimResending}
            error={claimError}
            onVerify={verifyClaimCode}
            onResend={resendClaimCode}
            onBack={() => {
              setClaimError('');
              navigate('ClaimLanding');
            }}
          />
        );
      case 'ClaimReview':
        return (
          <ClaimReviewScreen
            value={claimPrefill}
            loading={claimLoading}
            error={claimError}
            onChange={updateClaimPrefill}
            onConfirm={confirmClaimProfile}
            onBack={() => {
              setClaimError('');
              navigate('ClaimCode');
            }}
          />
        );
      case 'ClaimPassword':
        return (
          <ClaimPasswordScreen
            email={claimPrefill.email}
            fullName={claimPrefill.full_name}
            loading={claimLoading}
            error={claimError}
            onCreateAccount={createClaimAccount}
            onBack={() => {
              setClaimError('');
              navigate('ClaimReview');
            }}
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
        return (
          <BotScreen
            session={state.authSession}
            onBack={closeBotScreen}
            refreshKey={botNotificationRefreshKey}
          />
        );
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

function BotScreen({
  session,
  onBack,
  refreshKey,
}: {
  session?: AuthSession;
  onBack: () => void;
  refreshKey: number;
}) {
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
        <AriaBotScreen session={session} refreshKey={refreshKey} />
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
    bottom: 54,
    elevation: 8,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: 28,
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
