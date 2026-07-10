import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useCameraDevice, VisionCamera } from 'react-native-vision-camera';
import {
  LivenessChallengeController,
  LivenessDetectionAdapter,
  authenticateWithDeviceBiometrics,
  requestCameraPermission,
  skipDeviceBiometrics,
} from '../src/identity';
import { initialOnboardingState } from '../src/models/onboarding';
import { LivenessScreen } from '../src/screens/LivenessScreen';

const mockedUseCameraDevice = useCameraDevice as jest.Mock;
const mockedVisionCamera = VisionCamera as typeof VisionCamera & {
  requestCameraPermission: jest.Mock;
  cameraPermissionStatus: string;
};
const mockedLocalAuthentication = LocalAuthentication as typeof LocalAuthentication & {
  hasHardwareAsync: jest.Mock;
  isEnrolledAsync: jest.Mock;
  supportedAuthenticationTypesAsync: jest.Mock;
  authenticateAsync: jest.Mock;
};

function setPlatform(os: 'ios' | 'android' | 'web') {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => os,
  });
}

describe('identity liveness foundation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlatform('ios');
    mockedUseCameraDevice.mockReturnValue({ id: 'front-camera', position: 'front' });
    mockedVisionCamera.cameraPermissionStatus = 'not-determined';
    mockedVisionCamera.requestCameraPermission.mockResolvedValue(true);
    mockedLocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
    mockedLocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
    mockedLocalAuthentication.supportedAuthenticationTypesAsync.mockResolvedValue([1]);
    mockedLocalAuthentication.authenticateAsync.mockResolvedValue({ success: true });
  });

  it('returns permission denied when camera access is rejected', async () => {
    mockedVisionCamera.requestCameraPermission.mockResolvedValue(false);

    await expect(requestCameraPermission()).resolves.toEqual({
      status: 'denied',
      reason: 'Camera permission is required to confirm that a live person is present.',
    });
  });

  it('shows no-front-camera unavailable state', async () => {
    mockedUseCameraDevice.mockReturnValue(undefined);
    const dispatch = jest.fn();
    const screen = render(<LivenessScreen state={initialOnboardingState} dispatch={dispatch} onContinue={jest.fn()} />);

    fireEvent.press(screen.getByText('Allow camera'));

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_LIVENESS', status: 'unavailable' });
    });
    expect(screen.getByText('No front camera was found on this device.')).toBeTruthy();
  });

  it('keeps liveness failed until retry resets it', () => {
    const controller = new LivenessChallengeController();

    expect(controller.fail('Lighting was too low').status).toBe('failed');
    expect(controller.getState().failureReason).toBe('Lighting was too low');
    expect(controller.reset().status).toBe('not_started');
  });

  it('passes liveness only when every challenge step is detected in order', async () => {
    const detectedSteps = ['center_face', 'turn_left', 'turn_right', 'hold_still'] as const;
    let index = 0;
    const detector: LivenessDetectionAdapter = {
      name: 'test-detector',
      async analyze() {
        const step = detectedSteps[index] ?? 'center_face';
        index += 1;
        return { type: 'step_detected', step };
      },
    };
    const controller = new LivenessChallengeController(detector);

    controller.setCameraReady();
    controller.start();
    expect((await controller.analyzeCurrentStep()).status).toBe('challenge_active');
    expect((await controller.analyzeCurrentStep()).status).toBe('challenge_active');
    expect((await controller.analyzeCurrentStep()).status).toBe('challenge_active');
    expect((await controller.analyzeCurrentStep()).status).toBe('passed');
  });

  it('reports biometric unavailable when hardware is missing', async () => {
    mockedLocalAuthentication.hasHardwareAsync.mockResolvedValue(false);

    const result = await authenticateWithDeviceBiometrics();

    expect(result.status).toBe('unavailable');
  });

  it('supports skipping device biometrics', () => {
    expect(skipDeviceBiometrics()).toEqual({ status: 'skipped' });
  });

  it('enables device biometrics after successful device authentication', async () => {
    const result = await authenticateWithDeviceBiometrics();

    expect(result).toEqual({ status: 'enabled', supportedTypes: ['fingerprint'] });
  });

  it('shows web unsupported behavior without pretending to perform liveness', () => {
    setPlatform('web');
    const screen = render(<LivenessScreen state={initialOnboardingState} dispatch={jest.fn()} onContinue={jest.fn()} />);

    expect(screen.getByTestId('web-unsupported-liveness')).toBeTruthy();
    expect(screen.getByText('Native device required')).toBeTruthy();
  });
});

