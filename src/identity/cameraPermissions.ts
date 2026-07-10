import { Platform } from 'react-native';
import { VisionCamera } from 'react-native-vision-camera';
import { CameraPermissionResult } from './identityTypes';

function normalizePermissionStatus(status: string | undefined): CameraPermissionResult {
  if (Platform.OS === 'web') {
    return { status: 'unavailable', reason: 'Native camera liveness must be tested on an iOS or Android device.' };
  }

  switch (status) {
    case 'granted':
      return { status: 'granted' };
    case 'denied':
    case 'restricted':
      return { status: 'denied', reason: 'Camera permission is required to confirm that a live person is present.' };
    case 'not-determined':
    case undefined:
      return { status: 'not_requested' };
    default:
      return { status: 'unavailable', reason: 'Camera permission status is unavailable on this device.' };
  }
}

export function getCameraPermissionState(): CameraPermissionResult {
  try {
    return normalizePermissionStatus(VisionCamera.cameraPermissionStatus);
  } catch (error) {
    return {
      status: 'unavailable',
      reason: error instanceof Error ? error.message : 'Camera permission could not be checked.',
    };
  }
}

export async function requestCameraPermission(): Promise<CameraPermissionResult> {
  if (Platform.OS === 'web') {
    return { status: 'unavailable', reason: 'Native camera liveness must be tested on an iOS or Android device.' };
  }

  try {
    const granted = await VisionCamera.requestCameraPermission();
    return granted
      ? { status: 'granted' }
      : { status: 'denied', reason: 'Camera permission is required to confirm that a live person is present.' };
  } catch (error) {
    return {
      status: 'unavailable',
      reason: error instanceof Error ? error.message : 'Camera permission could not be requested.',
    };
  }
}
