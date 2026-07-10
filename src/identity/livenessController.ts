import {
  IDENTITY_DEMO_MODE,
  LIVENESS_CHALLENGE_STEPS,
  LivenessChallengeStep,
  LivenessChallengeStepId,
  LivenessControllerState,
  LivenessDetectionAdapter,
  LivenessDetectionResult,
} from './identityTypes';

export const unimplementedPoseDetectionAdapter: LivenessDetectionAdapter = {
  name: 'unimplemented-face-pose-detection-adapter',
  async analyze(): Promise<LivenessDetectionResult> {
    return {
      type: 'unavailable',
      reason: 'Face landmark and head-pose detection are not implemented in this build.',
    };
  },
};

export class LivenessChallengeController {
  private currentStepIndex = 0;
  private status: LivenessControllerState['status'] = 'not_started';
  private failureReason: string | undefined;

  constructor(private readonly detector: LivenessDetectionAdapter = unimplementedPoseDetectionAdapter) {}

  getState(): LivenessControllerState {
    return {
      status: this.status,
      currentStepIndex: this.currentStepIndex,
      steps: LIVENESS_CHALLENGE_STEPS,
      failureReason: this.failureReason,
    };
  }

  setCameraReady(): LivenessControllerState {
    this.status = 'camera_ready';
    this.failureReason = undefined;
    return this.getState();
  }

  start(): LivenessControllerState {
    this.currentStepIndex = 0;
    this.status = 'challenge_active';
    this.failureReason = undefined;
    return this.getState();
  }

  cancel(): LivenessControllerState {
    this.status = 'canceled';
    return this.getState();
  }

  fail(reason: string): LivenessControllerState {
    this.status = 'failed';
    this.failureReason = reason;
    return this.getState();
  }

  reset(): LivenessControllerState {
    this.currentStepIndex = 0;
    this.status = 'not_started';
    this.failureReason = undefined;
    return this.getState();
  }

  async analyzeCurrentStep(): Promise<LivenessControllerState> {
    if (this.status !== 'challenge_active') {
      return this.getState();
    }

    const result = await this.detector.analyze();
    return this.applyDetection(result);
  }

  completeCurrentStepForDevelopment(): LivenessControllerState {
    if (!IDENTITY_DEMO_MODE) {
      return this.fail('Development liveness controls are disabled.');
    }

    return this.applyStepDetected(this.currentStep().id);
  }

  private applyDetection(result: LivenessDetectionResult): LivenessControllerState {
    switch (result.type) {
      case 'step_detected':
        return this.applyStepDetected(result.step);
      case 'failed':
        return this.fail(result.reason);
      case 'unavailable':
        this.status = 'unavailable';
        this.failureReason = result.reason;
        return this.getState();
      case 'no_signal':
        return this.getState();
    }
  }

  private applyStepDetected(step: LivenessChallengeStepId): LivenessControllerState {
    if (step !== this.currentStep().id) {
      return this.fail('The liveness challenge response did not match the current instruction.');
    }

    if (this.currentStepIndex >= LIVENESS_CHALLENGE_STEPS.length - 1) {
      this.status = 'passed';
      return this.getState();
    }

    this.currentStepIndex += 1;
    return this.getState();
  }

  private currentStep(): LivenessChallengeStep {
    return LIVENESS_CHALLENGE_STEPS[this.currentStepIndex] ?? LIVENESS_CHALLENGE_STEPS[0]!;
  }
}

