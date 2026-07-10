import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ConfirmModal } from '../components/ConfirmModal';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { OnboardingState } from '../models/onboarding';
import { OnboardingServices } from '../services/onboardingServices';
import { OnboardingAction } from '../state/onboardingReducer';
import { colors, fonts, radii, type } from '../theme/tokens';

interface LinkedInScreenProps {
  state: OnboardingState;
  services: OnboardingServices;
  dispatch: React.Dispatch<OnboardingAction>;
  onContinue: () => void;
}

export function LinkedInScreen({ state, services, dispatch, onContinue }: LinkedInScreenProps) {
  const [skipVisible, setSkipVisible] = useState(false);

  const add = async () => {
    setSkipVisible(false);
    const screenshots = await services.linkedin.pickScreenshots(state.linkedinScreenshots.length);
    screenshots.forEach((screenshot) => dispatch({ type: 'ADD_LINKEDIN_SCREENSHOT', screenshot }));
  };

  const skip = () => {
    dispatch({ type: 'SKIP_LINKEDIN' });
    setSkipVisible(false);
    onContinue();
  };

  return (
    <ScreenShell
      scroll={false}
      footer={
        <>
          <PrimaryButton
            label={state.linkedinScreenshots.length > 0 ? 'Continue' : 'Upload screenshots'}
            onPress={state.linkedinScreenshots.length > 0 ? onContinue : add}
          />
          <PrimaryButton label="Skip for now" onPress={() => setSkipVisible(true)} variant="secondary" />
        </>
      }
    >
      <View style={styles.content}>
        <View style={styles.glyph}>
          <Text style={styles.glyphText}>in</Text>
        </View>
        <Text style={styles.title}>Add your LinkedIn</Text>
        <Text style={styles.subhead}>
          Because of how LinkedIn works, add screenshots of your profile rather than connecting an account.
        </Text>
        <View style={styles.hint}>
          <Text style={styles.hintText}>Capture the top of your profile, your experience, and your education.</Text>
        </View>
        <View style={styles.thumbs}>
          {state.linkedinScreenshots.map((screenshot) => (
            <View key={screenshot.id} style={styles.thumb}>
              <Text style={styles.thumbText}>{screenshot.label}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${screenshot.label}`}
                onPress={() => dispatch({ type: 'REMOVE_LINKEDIN_SCREENSHOT', id: screenshot.id })}
                hitSlop={8}
                style={styles.remove}
              >
                <Text style={styles.removeText}>x</Text>
              </Pressable>
            </View>
          ))}
          <Pressable accessibilityRole="button" accessibilityLabel="Add more LinkedIn screenshots" onPress={add} style={styles.add}>
            <Text style={styles.addText}>+</Text>
          </Pressable>
        </View>
        <Text style={styles.consequence}>
          You can continue, but your agent may have less verified information to work with.
        </Text>
      </View>
      <ConfirmModal
        visible={skipVisible}
        title="Your profile will be incomplete"
        message="Without LinkedIn, your agent may have less information about your education, experience, and professional background. You can add it later, but your profile will remain incomplete until you do."
        primaryLabel="Add LinkedIn"
        secondaryLabel="Skip anyway"
        onPrimary={add}
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
    backgroundColor: '#0A66C2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  glyphText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyMedium,
    fontSize: 22,
  },
  title: type.title,
  subhead: {
    ...type.body,
    marginTop: 12,
    marginBottom: 14,
  },
  hint: {
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelInk,
    padding: 13,
    marginBottom: 14,
  },
  hintText: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  thumbs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  thumb: {
    width: 70,
    height: 92,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbText: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  remove: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#2A2B45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
  },
  add: {
    width: 70,
    height: 92,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    color: colors.coral,
    fontSize: 28,
  },
  consequence: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
});
