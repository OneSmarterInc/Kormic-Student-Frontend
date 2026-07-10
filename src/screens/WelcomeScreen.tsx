import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KormicWordmark } from '../components/KormicWordmark';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { colors, fonts, type } from '../theme/tokens';

interface WelcomeScreenProps {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <ScreenShell
      scroll={false}
      footer={
        <View style={styles.footer}>
          <PrimaryButton label="Get started" onPress={onStart} accessibilityLabel="Get started" />
          <Text style={styles.signIn}>Already started? Sign in</Text>
        </View>
      }
    >
      <View style={styles.content}>
        <KormicWordmark />
        <Text style={styles.title}>
          Your agent <Text style={styles.emphasis}>starts here.</Text>
        </Text>
        <Text style={styles.subhead}>
          Build your verified profile once. Your agent carries your story to universities that are looking.
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
    paddingHorizontal: 8,
  },
  title: {
    ...type.title,
    fontSize: 40,
    lineHeight: 44,
    textAlign: 'center',
    marginTop: 22,
    marginBottom: 16,
  },
  emphasis: {
    color: colors.coral,
    fontFamily: fonts.headingItalic,
  },
  subhead: {
    ...type.body,
    maxWidth: 330,
    textAlign: 'center',
  },
  footer: {
    gap: 14,
  },
  signIn: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
  },
});
