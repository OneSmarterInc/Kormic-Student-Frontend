import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { colors, fonts, radii } from '../theme/tokens';

interface Item {
  label: string;
  value: string;
}

interface Props {
  label: string;
  value: string;
  data: Item[];
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

export function DropdownField({ label, value, data, onChange, error, required = false }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>

      <Dropdown
        style={[styles.dropdown, error ? styles.errorBorder : undefined]}
        placeholderStyle={styles.placeholder}
        selectedTextStyle={styles.selected}
        itemTextStyle={styles.itemText}
        containerStyle={styles.menu}
        activeColor="rgba(91,141,239,0.18)"
        searchPlaceholder="Search..."
        inputSearchStyle={styles.searchInput}
        data={data}
        labelField="label"
        valueField="value"
        search
        placeholder={`Select ${label}`}
        value={value}
        onChange={(item) => onChange(item.value)}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },

  label: {
    color: '#B9B8CC',
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },

  required: {
    color: colors.coral,
  },

  dropdown: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    height: 52,
    backgroundColor: colors.panelInk,
  },

  placeholder: {
    color: '#666783',
  },

  selected: {
    color: colors.offWhite,
    fontFamily: fonts.body,
    fontSize: 15,
  },

  itemText: {
    color: colors.offWhite,
    fontFamily: fonts.body,
    fontSize: 14,
  },

  menu: {
    backgroundColor: colors.panelInk,
    borderColor: colors.line,
    borderRadius: radii.input,
  },

  searchInput: {
    borderColor: colors.line,
    borderRadius: radii.input,
    color: colors.offWhite,
    fontFamily: fonts.body,
  },

  errorBorder: {
    borderColor: colors.error,
  },

  error: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 12,
  },
});
