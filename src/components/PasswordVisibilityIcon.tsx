import React from 'react';
import {MaterialIcons} from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme/tokens';

export function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
  return (
    <View style={styles.icon} pointerEvents="none">
      <MaterialIcons
        name={visible ? 'visibility-off' : 'visibility'}
        size={22}
        color={colors.textSoft}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  eye: {
    color: colors.textSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: 19,
    lineHeight: 22,
  },
  slash: {
    backgroundColor: colors.textSoft,
    borderRadius: 999,
    height: 2,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
    width: 24,
  },
});
