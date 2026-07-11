import {
  IDENTITY_DEMO_MODE,
  LIVENESS_CHALLENGE_STEPS,
  LivenessAnalysisContext,
  LivenessChallengeStep,
  LivenessChallengeStepId,
  LivenessControllerState,
  LivenessDetectionAdapter,
  LivenessDetectionResult,
} from './identityTypes';

export const LIVENESS_TIMING = {
  stepTimeoutMs: 10_000,
  totalTimeoutMs: 45_000,
};

export const unimplementedPoseDetectionAdapter: LivenessDetectionAdapter = {
  name: 'unimplemented-face-pose-detection-adapter',
  async analyze(): Promise<LivenessDetectionResult> {
    return {
      type: 'unavailable',
      reason: 'Face landmark and head-pose detection are not implemented in this build.',
    };
  },
};

export interface LivenessControllerOptions {
  now?: () => number;
  stepTimeoutMs?: number;
  totalTimeoutMs?: number;
}

export class LivenessChallengeController {
  private currentStepIndex = 0;
  private status: LivenessControllerState['status'] = 'not_started';
  private failureReason: string | undefined;
  private guidance: LivenessControllerState['guidance'];
  private challengeStartedAtMs: number | undefined;
  private currentStepStartedAtMs: number | undefined;
  private readonly now: () => number;
  private readonly stepTimeoutMs: number;
  private readonly totalTimeoutMs: number;

  constructor(
    private readonly detector: LivenessDetectionAdapter = unimplementedPoseDetectionAdapter,
    options: LivenessControllerOptions = {},
  ) {
    this.now = options.now ?? Date.now;
    this.stepTimeoutMs = options.stepTimeoutMs ?? LIVENESS_TIMING.stepTimeoutMs;
    this.totalTimeoutMs = options.totalTimeoutMs ?? LIVENESS_TIMING.totalTimeoutMs;
  }

  getState(): LivenessControllerState {
    return {
      status: this.status,
      currentStepIndex: this.currentStepIndex,
      steps: LIVENESS_CHALLENGE_STEPS,
      failureReason: this.failureReason,
      guidance: this.guidance,
      challengeStartedAtMs: this.challengeStartedAtMs,
      currentStepStartedAtMs: this.currentStepStartedAtMs,
    };
  }

  setCameraReady(): LivenessControllerState {
    this.status = 'camera_ready';
    this.failureReason = undefined;
    this.guidance = undefined;
    return this.getState();
  }

  start(): LivenessControllerState {
    const startedAt = this.now();
    this.currentStepIndex = 0;
    this.status = 'challenge_active';
    this.failureReason = undefined;
    this.guidance = 'Center your face';
    this.challengeStartedAtMs = startedAt;
    this.currentStepStartedAtMs = startedAt;
    this.detector.reset?.();
    return this.getState();
  }

  cancel(): LivenessControllerState {
    this.status = 'canceled';
    this.detector.reset?.();
    return this.getState();
  }

  fail(reason: string): LivenessControllerState {
    this.status = 'failed';
    this.failureReason = reason;
    this.detector.reset?.();
    return this.getState();
  }

  reset(): LivenessControllerState {
    this.currentStepIndex = 0;
    this.status = 'not_started';
    this.failureReason = undefined;
    this.guidance = undefined;
    this.challengeStartedAtMs = undefined;
    this.currentStepStartedAtMs = undefined;
    this.detector.reset?.();
    return this.getState();
  }

  async analyzeCurrentStep(): Promise<LivenessControllerState> {
    if (this.status !== 'challenge_active') {
      return this.getState();
    }

    const timeout = this.timeoutResult();
    if (timeout) {
      return timeout;
    }

    const context = this.analysisContext();
    const result = await this.detector.analyze(context);
    return this.applyDetection(result);
  }

  completeCurrentStepForDevelopment(): LivenessControllerState {
    if (!IDENTITY_DEMO_MODE) {
      return this.fail('Development liveness controls are disabled.');
    }

    return this.applyStepDetected(this.currentStep().id);
  }

  private timeoutResult(): LivenessControllerState | undefined {
    const nowMs = this.now();
    const challengeStartedAtMs = this.challengeStartedAtMs ?? nowMs;
    const currentStepStartedAtMs = this.currentStepStartedAtMs ?? nowMs;

    if (nowMs - challengeStartedAtMs > this.totalTimeoutMs) {
      return this.fail('The liveness challenge took too long. Please try again.');
    }

    if (nowMs - currentStepStartedAtMs > this.stepTimeoutMs) {
      return this.fail('That step took too long. Please try again.');
    }

    return undefined;
  }

  private analysisContext(): LivenessAnalysisContext {
    const nowMs = this.now();
    return {
      currentStep: this.currentStep(),
      challengeStartedAtMs: this.challengeStartedAtMs ?? nowMs,
      currentStepStartedAtMs: this.currentStepStartedAtMs ?? nowMs,
      nowMs,
    };
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
        this.detector.reset?.();
        return this.getState();
      case 'no_signal':
        this.guidance = result.reason;
        return this.getState();
    }
  }

  private applyStepDetected(step: LivenessChallengeStepId): LivenessControllerState {
    if (step !== this.currentStep().id) {
      return this.fail('The liveness challenge response did not match the current instruction.');
    }

    this.guidance = undefined;

    if (this.currentStepIndex >= LIVENESS_CHALLENGE_STEPS.length - 1) {
      this.status = 'passed';
      this.detector.reset?.();
      return this.getState();
    }

    this.currentStepIndex += 1;
    this.currentStepStartedAtMs = this.now();
    return this.getState();
  }

  private currentStep(): LivenessChallengeStep {
    return LIVENESS_CHALLENGE_STEPS[this.currentStepIndex] ?? LIVENESS_CHALLENGE_STEPS[0]!;
  }
}
