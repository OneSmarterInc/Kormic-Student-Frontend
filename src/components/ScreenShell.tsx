import React, { PropsWithChildren } from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';

interface ScreenShellProps extends PropsWithChildren {
  footer?: React.ReactNode;
  scroll?: boolean;
}

const WEB_FRAME_MAX_WIDTH = 520;

export function ScreenShell({ children, footer, scroll = true }: ScreenShellProps) {
  const body = scroll ? (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.staticContent}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.frame}>
        {body}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </SafeAreaView>
  );
}

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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },
  staticContent: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },
  footer: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: colors.ink,
    gap: 10,
  },
});