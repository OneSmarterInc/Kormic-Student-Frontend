import React, { PropsWithChildren } from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';

interface ScreenShellProps extends PropsWithChildren {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  scroll?: boolean;
}

const WEB_FRAME_MAX_WIDTH = 520;

export function ScreenShell({ children, header, footer, scroll = true }: ScreenShellProps) {
  const body = scroll ? (
    <ScrollView
      style={styles.body}
      contentContainerStyle={[styles.scrollContent, header ? styles.contentWithHeader : styles.contentWithoutHeader]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.staticContent, header ? styles.contentWithHeader : styles.contentWithoutHeader]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.frame}>
        {header ? <View style={styles.header}>{header}</View> : null}
        {body}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </SafeAreaView>
  );
}

const SIDE_PADDING = Platform.select({
  web: 24,
  default: 8,
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? WEB_FRAME_MAX_WIDTH : undefined,
  },
  body: {
    flex: 1,
    width: '100%',
  },
  header: {
    width: '100%',
    paddingHorizontal: SIDE_PADDING,
    paddingTop: 28,
    paddingBottom: 12,
    backgroundColor: colors.ink,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SIDE_PADDING,
    paddingBottom: 24,
  },
  staticContent: {
    flex: 1,
    width: '100%',
    paddingHorizontal: SIDE_PADDING,
    paddingBottom: 24,
  },
  contentWithHeader: {
    paddingTop: 16,
  },
  contentWithoutHeader: {
    paddingTop: 28,
  },
  footer: {
    width: '100%',
    paddingHorizontal: SIDE_PADDING,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: colors.ink,
    gap: 10,
  },
});
