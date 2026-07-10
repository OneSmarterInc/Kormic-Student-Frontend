export type LivenessStatus =
  | 'not_started'
  | 'requesting_permission'
  | 'permission_denied'
  | 'camera_ready'
  | 'challenge_active'
  | 'passed'
  | 'failed'
  | 'canceled'
  | 'unavailable';

export type BiometricStatus = 'not_started' | 'enabled' | 'skipped' | 'unavailable' | 'failed';

export type LivenessChallengeStepId = 'center_face' | 'turn_left' | 'turn_right' | 'blink' | 'hold_still';

export interface LivenessChallengeStep {
  id: LivenessChallengeStepId;
  instruction: string;
}

export type LivenessGuidanceMessage =
  | 'Move closer'
  | 'Move farther away'
  | 'Center your face'
  | 'Only one person should be visible'
  | 'Turn left'
  | 'Turn right'
  | 'Blink'
  | 'Hold still'
  | 'More light is needed';

export type LivenessDetectionResult =
  | { type: 'step_detected'; step: LivenessChallengeStepId }
  | { type: 'failed'; reason: string }
  | { type: 'unavailable'; reason: string }
  | { type: 'no_signal'; reason?: LivenessGuidanceMessage };

export interface LivenessAnalysisContext {
  currentStep: LivenessChallengeStep;
  challengeStartedAtMs: number;
  currentStepStartedAtMs: number;
  nowMs: number;
}

export interface LivenessDetectionAdapter {
  readonly name: string;
  analyze(context: LivenessAnalysisContext): Promise<LivenessDetectionResult>;
  reset?(): void;
}

export interface LivenessControllerState {
  status: LivenessStatus;
  currentStepIndex: number;
  steps: LivenessChallengeStep[];
  failureReason?: string;
  guidance?: LivenessGuidanceMessage;
  challengeStartedAtMs?: number;
  currentStepStartedAtMs?: number;
}

export type CameraPermissionState = 'not_requested' | 'requesting' | 'granted' | 'denied' | 'unavailable';

export interface CameraPermissionResult {
  status: CameraPermissionState;
  reason?: string;
}

export type BiometricAuthenticationType = 'fingerprint' | 'face' | 'iris' | 'unknown';

export interface BiometricAvailability {
  available: boolean;
  hardwareAvailable: boolean;
  enrolled: boolean;
  supportedTypes: BiometricAuthenticationType[];
  reason?: string;
}

export type BiometricAuthenticationResult =
  | { status: 'enabled'; supportedTypes: BiometricAuthenticationType[] }
  | { status: 'skipped' }
  | { status: 'unavailable'; reason: string; supportedTypes: BiometricAuthenticationType[] }
  | { status: 'failed'; reason: string; supportedTypes: BiometricAuthenticationType[] }
  | { status: 'canceled'; supportedTypes: BiometricAuthenticationType[] }
  | { status: 'error'; reason: string; supportedTypes: BiometricAuthenticationType[] };

export const LIVENESS_CHALLENGE_STEPS: LivenessChallengeStep[] = [
  { id: 'center_face', instruction: 'Center your face' },
  { id: 'turn_left', instruction: 'Turn your head left' },
  { id: 'turn_right', instruction: 'Turn your head right' },
  { id: 'blink', instruction: 'Blink once' },
  { id: 'hold_still', instruction: 'Hold still' },
];

export const IDENTITY_DEMO_MODE = false;
