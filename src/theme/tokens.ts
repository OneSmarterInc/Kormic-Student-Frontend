import { TextStyle } from 'react-native';

export const colors = {
  ink: '#12132A',
  panelInk: '#1E2145',
  surface: '#1E2145',
  offWhite: '#F6F5F1',
  text: '#F6F5F1',
  coral: '#FF6B4A',
  connectionBlue: '#5B8DEF',
  muted: '#8A8BA3',
  line: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.10)',
  textSoft: '#CBCAD9',
  error: '#FFB09D',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  input: 12,
  card: 20,
  pill: 999,
};

export const fonts = {
  heading: 'Fraunces_600SemiBold',
  headingItalic: 'Fraunces_600SemiBold_Italic',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_600SemiBold',
};

export const type = {
  title: {
    fontFamily: fonts.heading,
    fontSize: 30,
    lineHeight: 34,
    color: colors.offWhite,
  } satisfies TextStyle,
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSoft,
  } satisfies TextStyle,
};
