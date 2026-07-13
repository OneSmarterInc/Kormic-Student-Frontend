import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { OnboardingState } from '../models/onboarding';
import { missingRecommendedSources } from '../navigation/routes';
import { colors, fonts, radii, type } from '../theme/tokens';

interface AgentLiveScreenProps {
  state: OnboardingState;
  onViewProfile?: () => void;
  loadingProfile?: boolean;
}

export function AgentLiveScreen({ state, onViewProfile = () => undefined, loadingProfile = false }: AgentLiveScreenProps) {
  const missing = missingRecommendedSources(state);

  return (
    <ScreenShell
      scroll={false}
      footer={<PrimaryButton label="View My Complete Profile" onPress={onViewProfile} loading={loadingProfile} />}
    >
      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>OK</Text>
        </View>
        <Text style={styles.title}>
          Your agent is <Text style={styles.emphasis}>live.</Text>
        </Text>
        <Text style={styles.subhead}>
          It's ready to carry your story to universities that are looking for someone like you.
        </Text>
        {missing.length > 0 ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Profile incomplete</Text>
            <Text style={styles.noticeBody}>
              Add your missing profile sources to help your agent represent you more fully.
            </Text>
            <Text style={styles.missing}>Missing: {missing.join(', ')}</Text>
            <Text style={styles.noticeAction}>Complete your profile</Text>
          </View>
        ) : (
          <View style={styles.verified}>
            <Text style={styles.verifiedText}>Verified student profile</Text>
          </View>
        )}
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
  badge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.coral,
    backgroundColor: 'rgba(255,107,74,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  badgeText: {
    color: colors.coral,
    fontFamily: fonts.bodyMedium,
  },
  title: {
    ...type.title,
    fontSize: 36,
    lineHeight: 40,
    textAlign: 'center',
  },
  emphasis: {
    color: colors.coral,
    fontFamily: fonts.headingItalic,
  },
  subhead: {
    ...type.body,
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 20,
  },
  notice: {
    width: '100%',
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelInk,
    padding: 16,
    gap: 7,
  },
  noticeTitle: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  noticeBody: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  missing: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  noticeAction: {
    color: colors.coral,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    marginTop: 4,
  },
  verified: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.connectionBlue,
    backgroundColor: 'rgba(91,141,239,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  verifiedText: {
    color: '#BCD0F6',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
});
