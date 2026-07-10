import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme/tokens';

export function KormicWordmark() {
  return (
    <View accessible accessibilityRole="text" accessibilityLabel="Kormic">
      <Text style={styles.wordmark}>
        Kor<Text style={styles.accent}>mic</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    color: colors.offWhite,
    fontFamily: fonts.heading,
    fontSize: 24,
  },
  accent: {
    color: colors.coral,
  },
});
