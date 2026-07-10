import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Interest } from '../models/onboarding';
import { colors, fonts, radii } from '../theme/tokens';

interface ChoiceChipsProps {
  options: Interest[];
  selected: Interest[];
  onToggle: (interest: Interest) => void;
  error?: string;
}

export function ChoiceChips({ options, selected, onToggle, error }: ChoiceChipsProps) {
  return (
    <View>
      <View style={styles.wrap}>
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <Pressable
              key={option}
              accessibilityRole="checkbox"
              accessibilityLabel={option}
              accessibilityState={{ checked: active }}
              onPress={() => onToggle(option)}
              style={[styles.chip, active && styles.active]}
            >
              <Text style={[styles.label, active && styles.activeLabel]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  chip: {
    minHeight: 44,
    borderRadius: radii.pill,
    borderColor: colors.line,
    borderWidth: 1,
    backgroundColor: colors.panelInk,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  active: {
    borderColor: colors.coral,
    backgroundColor: 'rgba(255,107,74,0.16)',
  },
  label: {
    color: colors.offWhite,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  activeLabel: {
    color: '#FFD9CD',
    fontFamily: fonts.bodyMedium,
  },
  error: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 6,
  },
});
