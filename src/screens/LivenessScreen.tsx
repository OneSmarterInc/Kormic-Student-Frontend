import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import { useCameraDevice } from 'react-native-vision-camera';
import { Camera as FaceDetectorCamera, Face } from 'react-native-vision-camera-face-detector';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import {
  BiometricAuthenticationResult,
  IDENTITY_DEMO_MODE,
  LivenessChallengeController,
  LivenessControllerState,
  MlKitLivenessAdapter,
  authenticateWithDeviceBiometrics,
  getCameraPermissionState,
  requestCameraPermission,
  skipDeviceBiometrics,
} from '../identity';
import { OnboardingState } from '../models/onboarding';
import { OnboardingAction } from '../state/onboardingReducer';
import { colors, fonts, radii, type } from '../theme/tokens';

interface LivenessScreenProps {
  state: OnboardingState;
  dispatch: React.Dispatch<OnboardingAction>;
  onContinue: () => void;
}

function biometricStatusFromResult(result: BiometricAuthenticationResult): OnboardingState['biometricStatus'] {
  switch (result.status) {
    case 'enabled':
      return 'enabled';
    case 'skipped':
    case 'canceled':
      return 'skipped';
    case 'unavailable':
      return 'unavailable';
    case 'failed':
    case 'error':
      return 'failed';
  }
}

export function LivenessScreen({ state, dispatch, onContinue }: LivenessScreenProps) {
  const frontDevice = useCameraDevice('front');
  const adapterRef = useRef(new MlKitLivenessAdapter());
  const controllerRef = useRef(new LivenessChallengeController(adapterRef.current));
  const [controllerState, setControllerState] = useState<LivenessControllerState>(() => controllerRef.current.getState());
  const controllerStateRef = useRef(controllerState);
  const [localLivenessStatus, setLocalLivenessStatus] = useState(state.livenessStatus);
  const localStatusRef = useRef(state.livenessStatus);
  const [message, setMessage] = useState<string | undefined>(() => getCameraPermissionState().reason);
  const [cameraError, setCameraError] = useState<string | undefined>();
  const analyzingRef = useRef(false);
  const lastAnalyzedAtRef = useRef(0);

  useEffect(() => {
    setLocalLivenessStatus(state.livenessStatus);
    localStatusRef.current = state.livenessStatus;
  }, [state.livenessStatus]);

  useEffect(() => {
    controllerStateRef.current = controllerState;
  }, [controllerState]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && localStatusRef.current === 'challenge_active') {
        const next = controllerRef.current.fail('Camera interrupted. Please try again.');
        setControllerState(next);
        setMessage(next.failureReason);
        setLivenessStatus(next.status);
      }
    });

    return () => subscription.remove();
  }, []);

  const currentStep = useMemo(
    () => controllerState.steps[controllerState.currentStepIndex] ?? controllerState.steps[0]!,
    [controllerState],
  );

  const setLivenessStatus = (status: OnboardingState['livenessStatus']) => {
    localStatusRef.current = status;
    setLocalLivenessStatus(status);
    dispatch({ type: 'SET_LIVENESS', status });
  };

  const applyControllerState = (nextState: LivenessControllerState) => {
    setControllerState(nextState);
    setLivenessStatus(nextState.status);
    setMessage(nextState.failureReason ?? nextState.guidance);
  };

  const requestPermission = async () => {
    setMessage(undefined);
    setCameraError(undefined);
    setLivenessStatus('requesting_permission');
    const result = await requestCameraPermission();

    if (result.status === 'granted') {
      if (!frontDevice) {
        setMessage('No front camera was found on this device.');
        setLivenessStatus('unavailable');
        return;
      }

      applyControllerState(controllerRef.current.setCameraReady());
      return;
    }

    setMessage(result.reason);
    setLivenessStatus(result.status === 'denied' ? 'permission_denied' : 'unavailable');
  };

  const startChallenge = () => {
    if (!frontDevice) {
      setMessage('No front camera was found on this device.');
      setLivenessStatus('unavailable');
      return;
    }

    applyControllerState(controllerRef.current.start());
  };

  const analyzeDetectedFaces = async (faces: Face[]) => {
    if (localStatusRef.current !== 'challenge_active') {
      return;
    }

    const now = Date.now();
    if (now - lastAnalyzedAtRef.current < 160 || analyzingRef.current) {
      return;
    }

    lastAnalyzedAtRef.current = now;
    analyzingRef.current = true;

    try {
      // The liveness module consumes normalized geometry only. It does not persist raw frames, photos, or video.
      adapterRef.current.ingestFaces(faces, now);
      const nextState = await controllerRef.current.analyzeCurrentStep();
      applyControllerState(nextState);
    } catch (error) {
      applyControllerState(
        controllerRef.current.fail(error instanceof Error ? error.message : 'Face detection could not continue.'),
      );
    } finally {
      analyzingRef.current = false;
    }
  };

  const completeDemoStep = () => {
    applyControllerState(controllerRef.current.completeCurrentStepForDevelopment());
  };

  const retry = () => {
    const nextState = controllerRef.current.reset();
    setControllerState(nextState);
    setMessage(undefined);
    setCameraError(undefined);
    setLivenessStatus('not_started');
    analyzingRef.current = false;
    lastAnalyzedAtRef.current = 0;
  };

  const setupBiometrics = async () => {
    const result = await authenticateWithDeviceBiometrics();
    dispatch({ type: 'SET_BIOMETRIC', status: biometricStatusFromResult(result) });
    if ('reason' in result) {
      setMessage(result.reason);
    }
  };

  const skipBiometrics = () => {
    const result = skipDeviceBiometrics();
    dispatch({ type: 'SET_BIOMETRIC', status: biometricStatusFromResult(result) });
  };

  const isWeb = Platform.OS === 'web';
  const hasPermission =
    localLivenessStatus === 'camera_ready' ||
    localLivenessStatus === 'challenge_active' ||
    localLivenessStatus === 'passed';
  const canShowCamera = !isWeb && hasPermission && frontDevice && localLivenessStatus !== 'passed';
  const isTerminalError =
    localLivenessStatus === 'permission_denied' ||
    localLivenessStatus === 'failed' ||
    localLivenessStatus === 'unavailable';
  const progressLabel = localLivenessStatus === 'challenge_active'
    ? `Step ${controllerState.currentStepIndex + 1} of ${controllerState.steps.length}`
    : undefined;

  const renderCameraArea = () => {
    if (isWeb) {
      return (
        <View style={styles.cameraFallback} testID="web-unsupported-liveness">
          <Text style={styles.cameraFallbackTitle}>Native device required</Text>
          <Text style={styles.cameraFallbackText}>Camera liveness must be tested on an iOS or Android device.</Text>
        </View>
      );
    }

    if (canShowCamera && frontDevice) {
      return (
        <View style={styles.cameraFrame}>
          <FaceDetectorCamera
            style={StyleSheet.absoluteFill}
            device={frontDevice}
            isActive={localLivenessStatus === 'camera_ready' || localLivenessStatus === 'challenge_active'}
            cameraFacing="front"
            outputResolution="preview"
            performanceMode="fast"
            runClassifications
            minFaceSize={0.15}
            trackingEnabled
            onFacesDetected={analyzeDetectedFaces}
            onError={(error) => {
              const errorMessage = error.message || 'Camera preview could not start.';
              setCameraError(errorMessage);
              setMessage(errorMessage);
              setLivenessStatus('unavailable');
            }}
          />
          <View style={styles.faceGuide} pointerEvents="none" />
        </View>
      );
    }

    if (localLivenessStatus === 'passed') {
      return (
        <View style={styles.successFrame}>
          <Text style={styles.successMark}>LIVE</Text>
        </View>
      );
    }

    return (
      <View style={styles.cameraFallback}>
        <Text style={styles.cameraFallbackTitle}>Camera check</Text>
        <Text style={styles.cameraFallbackText}>We will ask for camera access before starting the liveness challenge.</Text>
      </View>
    );
  };

  const title = (() => {
    if (localLivenessStatus === 'passed') {
      return "You're verified";
    }
    if (localLivenessStatus === 'permission_denied') {
      return 'Camera permission needed';
    }
    if (localLivenessStatus === 'failed') {
      return "Let's try that again";
    }
    if (localLivenessStatus === 'unavailable') {
      return 'Liveness unavailable';
    }
    if (localLivenessStatus === 'challenge_active') {
      return currentStep.instruction;
    }
    return "Let's confirm it's really you";
  })();

  const subtitle = (() => {
    if (localLivenessStatus === 'passed') {
      return 'A live person was present for onboarding. You can optionally secure this device next.';
    }
    if (localLivenessStatus === 'challenge_active') {
      return message ?? controllerState.guidance ?? 'Follow the prompt shown here.';
    }
    if (isTerminalError) {
      return message ?? cameraError ?? 'The camera check could not continue.';
    }
    return 'Kormic uses the camera to confirm that a live person is present during student onboarding.';
  })();

  const footer = (() => {
    if (isWeb) {
      return IDENTITY_DEMO_MODE ? <PrimaryButton label="Continue in demo mode" onPress={onContinue} /> : null;
    }

    if (localLivenessStatus === 'passed') {
      return (
        <>
          <PrimaryButton label="Set up device biometrics" onPress={setupBiometrics} />
          <PrimaryButton label="Skip biometrics" onPress={skipBiometrics} variant="secondary" />
          <PrimaryButton label="Continue" onPress={onContinue} variant="secondary" />
        </>
      );
    }

    if (localLivenessStatus === 'camera_ready') {
      return <PrimaryButton label="Start liveness challenge" onPress={startChallenge} />;
    }

    if (localLivenessStatus === 'challenge_active') {
      return IDENTITY_DEMO_MODE ? (
        <PrimaryButton label="Complete prompt in demo mode" onPress={completeDemoStep} variant="secondary" />
      ) : null;
    }

    if (isTerminalError) {
      return <PrimaryButton label="Try again" onPress={retry} />;
    }

    return (
      <PrimaryButton
        label={localLivenessStatus === 'requesting_permission' ? 'Requesting camera' : 'Allow camera'}
        onPress={requestPermission}
        disabled={localLivenessStatus === 'requesting_permission'}
      />
    );
  })();

  return (
    <ScreenShell scroll={false} footer={footer}>
      <View style={styles.content}>
        {renderCameraArea()}
        {progressLabel ? <Text style={styles.progress}>{progressLabel}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subhead}>{subtitle}</Text>
        {localLivenessStatus === 'passed' ? (
          <View style={styles.biometricNote}>
            <Text style={styles.biometricTitle}>Device biometrics are optional</Text>
            <Text style={styles.biometricCopy}>
              Face ID or fingerprint unlocks secure access on this device. It is not face matching or identity proof.
            </Text>
            <Text style={styles.biometricStatus}>Status: {state.biometricStatus.replace('_', ' ')}</Text>
          </View>
        ) : null}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cameraFrame: {
    width: 220,
    height: 280,
    borderRadius: 110,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.connectionBlue,
    backgroundColor: colors.panelInk,
    marginBottom: 18,
  },
  faceGuide: {
    position: 'absolute',
    top: 22,
    left: 22,
    right: 22,
    bottom: 22,
    borderRadius: 88,
    borderWidth: 2,
    borderColor: 'rgba(246,245,241,0.55)',
  },
  cameraFallback: {
    width: 220,
    minHeight: 220,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelInk,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    marginBottom: 22,
  },
  cameraFallbackTitle: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    marginBottom: 8,
    textAlign: 'center',
  },
  cameraFallbackText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  successFrame: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: colors.coral,
    backgroundColor: 'rgba(255,107,74,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  successMark: {
    color: colors.coral,
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
    letterSpacing: 0,
  },
  progress: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginBottom: 8,
  },
  title: {
    ...type.title,
    textAlign: 'center',
    marginBottom: 12,
  },
  subhead: {
    ...type.body,
    textAlign: 'center',
  },
  biometricNote: {
    width: '100%',
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelInk,
    padding: 14,
    marginTop: 18,
    gap: 6,
  },
  biometricTitle: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  biometricCopy: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  biometricStatus: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
});
