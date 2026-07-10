import * as LocalAuthentication from 'expo-local-authentication';
import { AuthenticationType } from 'expo-local-authentication';
import {
  BiometricAuthenticationResult,
  BiometricAuthenticationType,
  BiometricAvailability,
} from './identityTypes';

function mapAuthenticationType(type: AuthenticationType): BiometricAuthenticationType {
  switch (type) {
    case AuthenticationType.FINGERPRINT:
      return 'fingerprint';
    case AuthenticationType.FACIAL_RECOGNITION:
      return 'face';
    case AuthenticationType.IRIS:
      return 'iris';
    default:
      return 'unknown';
  }
}

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  try {
    const [hardwareAvailable, enrolled, nativeTypes] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const supportedTypes = nativeTypes.map(mapAuthenticationType);

    if (!hardwareAvailable) {
      return {
        available: false,
        hardwareAvailable,
        enrolled,
        supportedTypes,
        reason: 'Device biometrics are not available on this device.',
      };
    }

    if (!enrolled) {
      return {
        available: false,
        hardwareAvailable,
        enrolled,
        supportedTypes,
        reason: 'No device biometric method is enrolled.',
      };
    }

    return { available: true, hardwareAvailable, enrolled, supportedTypes };
  } catch (error) {
    return {
      available: false,
      hardwareAvailable: false,
      enrolled: false,
      supportedTypes: [],
      reason: error instanceof Error ? error.message : 'Device biometric availability could not be checked.',
    };
  }
}

export async function authenticateWithDeviceBiometrics(): Promise<BiometricAuthenticationResult> {
  const availability = await getBiometricAvailability();
  if (!availability.available) {
    return {
      status: 'unavailable',
      reason: availability.reason ?? 'Device biometrics are unavailable.',
      supportedTypes: availability.supportedTypes,
    };
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Secure your Kormic profile',
      promptSubtitle: 'Use this device biometrics for future access',
      promptDescription: 'This authenticates access on this device. It is not identity verification.',
      cancelLabel: 'Skip for now',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { status: 'enabled', supportedTypes: availability.supportedTypes };
    }

    if (result.error === 'user_cancel' || result.error === 'system_cancel' || result.error === 'app_cancel') {
      return { status: 'canceled', supportedTypes: availability.supportedTypes };
    }

    if (result.error === 'not_available' || result.error === 'not_enrolled' || result.error === 'passcode_not_set') {
      return {
        status: 'unavailable',
        reason: result.warning ?? result.error,
        supportedTypes: availability.supportedTypes,
      };
    }

    return {
      status: 'failed',
      reason: result.warning ?? result.error,
      supportedTypes: availability.supportedTypes,
    };
  } catch (error) {
    return {
      status: 'error',
      reason: error instanceof Error ? error.message : 'Device biometric authentication failed.',
      supportedTypes: availability.supportedTypes,
    };
  }
}

export function skipDeviceBiometrics(): BiometricAuthenticationResult {
  return { status: 'skipped' };
}
