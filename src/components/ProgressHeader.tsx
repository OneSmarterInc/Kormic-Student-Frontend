import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { OnboardingRoute } from '../models/onboarding';
import { getProgress } from '../navigation/routes';
import { colors, fonts } from '../theme/tokens';

interface ProgressHeaderProps {
  route: OnboardingRoute;
  onBack: () => void;
}

export function ProgressHeader({ route, onBack }: ProgressHeaderProps) {
  const progress = getProgress(route);
  if (!progress) {
    return null;
  }

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
        onPress={onBack}
        style={styles.back}
      >
        <Text style={styles.backText}>{'<'}</Text>
      </Pressable>
      <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ now: progress.current, min: 1, max: progress.total }}>
        <View style={[styles.fill, { flex: progress.ratio }]} />
        <View style={{ flex: 1 - progress.ratio }} />
      </View>
      <Text style={styles.step}>
        {progress.current} / {progress.total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 38,
    paddingBottom: 8,
    backgroundColor: colors.ink,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: colors.offWhite,
    fontSize: 20,
    fontFamily: fonts.bodyMedium,
  },
  track: {
    flex: 1,
    height: 5,
    borderRadius: 99,
    backgroundColor: colors.panelInk,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: colors.coral,
  },
  step: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
});
