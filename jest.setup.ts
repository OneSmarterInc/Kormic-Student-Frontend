/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock('react-native-vision-camera', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Camera: (props: Record<string, unknown>) => React.createElement(View, { ...props, testID: 'vision-camera-preview' }),
    useCameraDevice: jest.fn(() => ({ id: 'front-camera', position: 'front' })),
    VisionCamera: {
      cameraPermissionStatus: 'not-determined',
      requestCameraPermission: jest.fn(async () => true),
    },
  };
});

jest.mock('expo-local-authentication', () => ({
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  supportedAuthenticationTypesAsync: jest.fn(async () => [1]),
  authenticateAsync: jest.fn(async () => ({ success: true })),
}));

