import React, { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { KormicWordmark } from '../components/KormicWordmark';
import { ScreenShell } from '../components/ScreenShell';
import { OnboardingServices } from '../services/onboardingServices';
import { OnboardingAction } from '../state/onboardingReducer';
import { colors, fonts, type } from '../theme/tokens';
import { durationForMotion } from '../utils/motion';

interface BuildingAgentScreenProps {
  services: OnboardingServices;
  buildStage: number;
  dispatch: React.Dispatch<OnboardingAction>;
  onComplete: () => void;
}

export function BuildingAgentScreen({ services, buildStage, dispatch, onComplete }: BuildingAgentScreenProps) {
  useEffect(() => {
    let cancelled = false;

    async function run() {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      const delay = durationForMotion(850, reduceMotion);
      for (let index = 0; index < services.buildAgent.stages.length; index += 1) {
        if (cancelled) {
          return;
        }
        dispatch({ type: 'SET_BUILD_STAGE', stage: index });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      if (!cancelled) {
        onComplete();
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [dispatch, onComplete, services]);

  return (
    <ScreenShell scroll={false}>
      <View style={styles.content}>
        <KormicWordmark />
        <Text style={styles.title}>Building your agent</Text>
        <Text accessibilityLiveRegion="polite" style={styles.status}>
          {services.buildAgent.stages[buildStage] ?? services.buildAgent.stages[0]}
        </Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...type.title,
    fontSize: 25,
    lineHeight: 30,
    textAlign: 'center',
    marginTop: 28,
  },
  status: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 15,
    marginTop: 16,
  },
});
