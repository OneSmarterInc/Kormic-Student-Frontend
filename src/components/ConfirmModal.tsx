import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, type } from '../theme/tokens';
import { PrimaryButton } from './PrimaryButton';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
  onRequestClose: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  onRequestClose,
}: ConfirmModalProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityRole="alert">
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <PrimaryButton label={primaryLabel} onPress={onPrimary} />
          <PrimaryButton label={secondaryLabel} onPress={onSecondary} variant="secondary" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: radii.card,
    borderColor: colors.line,
    borderWidth: 1,
    backgroundColor: colors.panelInk,
    padding: 20,
    gap: 12,
  },
  title: {
    ...type.title,
    fontSize: 24,
    lineHeight: 29,
  },
  message: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
});
