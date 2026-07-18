import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const add = async () => {
    setError('');

    try {
      setLoading(true);
      const screenshots = await services.linkedin.pickScreenshots(state.linkedinScreenshots.length);
      await services.linkedin.upload(state.authSession, [...state.linkedinScreenshots, ...screenshots]);
      screenshots.forEach((screenshot) => dispatch({ type: 'ADD_LINKEDIN_SCREENSHOT', screenshot }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to upload LinkedIn profile');
    } finally {
      setLoading(false);
    }
  };

  const skip = () => {
    dispatch({ type: 'SKIP_LINKEDIN' });
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
            disabled={loading}
            loading={loading}
          />
          <PrimaryButton label="Skip for now" onPress={skip} variant="secondary" />
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
              {screenshot.uri ? <Image source={{ uri: screenshot.uri }} style={styles.thumbImage} resizeMode="cover" /> : null}
              <Text numberOfLines={2} style={styles.thumbText}>
                {screenshot.label}
              </Text>
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
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.consequence}>
          You can continue, but your agent may have less verified information to work with.
        </Text>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  glyph: {
    alignItems: 'center',
    backgroundColor: '#0A66C2',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    marginBottom: 18,
    width: 48,
  },
  glyphText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
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
    width: 86,
    minHeight: 122,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelInk,
    alignItems: 'center',
    gap: 7,
    justifyContent: 'flex-start',
    padding: 7,
  },
  thumbImage: {
    aspectRatio: 0.8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    width: '100%',
  },
  thumbText: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
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
    width: 86,
    height: 122,
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
  error: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
});
