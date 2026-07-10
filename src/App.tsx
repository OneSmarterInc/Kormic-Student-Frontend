import React, { useCallback, useMemo, useReducer } from 'react';
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
import { WelcomeScreen } from './screens/WelcomeScreen';
import { mockOnboardingServices } from './services/onboardingServices';
import { onboardingReducer } from './state/onboardingReducer';
import { colors } from './theme/tokens';
import TotpScreen from './screens/TotpScreen';

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
  const services = useMemo(() => mockOnboardingServices, []);

  const navigate = useCallback((route: OnboardingRoute) => dispatch({ type: 'NAVIGATE', route }), []);
  const back = useCallback(() => dispatch({ type: 'BACK' }), []);
  const next = useCallback(() => {
    if (canAdvanceFrom(state.route, state)) {
      dispatch({ type: 'NEXT' });
    }
  }, [state]);
  const completeBuild = useCallback(() => navigate('AgentLive'), [navigate]);
  const completeTotp = useCallback(() => {
    dispatch({ type: 'SET_LIVENESS', status: 'success' });
    navigate('GitHub');
  }, [navigate]);

  if (!frauncesLoaded || !interLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.coral} />
      </View>
    );
  }

  const content = (() => {
    switch (state.route) {
      case 'Welcome':
        return <WelcomeScreen onStart={() => navigate('BasicInfo')} />;
      case 'BasicInfo':
        return <BasicInfoScreen state={state} dispatch={dispatch} onContinue={next} />;
      case 'Liveness':
        return <TotpScreen onContinue={completeTotp} />;
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
        return <AgentLiveScreen state={state} />;
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
