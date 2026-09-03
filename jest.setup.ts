// React Native 0.81 no longer ships the legacy NativeAnimatedHelper module
// path used by older Jest recipes. Keep the animation side-effect suppressed
// with an explicit virtual mock so the test environment is version-stable.
jest.mock(
  'react-native/Libraries/Animated/NativeAnimatedHelper',
  () => ({}),
  { virtual: true },
);
