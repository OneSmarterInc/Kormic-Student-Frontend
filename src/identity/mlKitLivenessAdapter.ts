import type { Face } from 'react-native-vision-camera-face-detector';
import {
  LivenessAnalysisContext,
  LivenessChallengeStepId,
  LivenessDetectionAdapter,
  LivenessDetectionResult,
  LivenessGuidanceMessage,
} from './identityTypes';

export interface NormalizedFaceBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NormalizedFaceDetection {
  bounds: NormalizedFaceBounds;
  yawAngle: number;
  pitchAngle: number;
  rollAngle: number;
  leftEyeOpenProbability?: number;
  rightEyeOpenProbability?: number;
  trackingId?: number;
}

export interface NormalizedFaceEvent {
  faces: NormalizedFaceDetection[];
  timestampMs: number;
}

export interface MlKitLivenessAdapterOptions {
  frontCameraMirrored?: boolean;
  eventFreshnessMs?: number;
  minFaceRatio?: number;
  maxFaceRatio?: number;
  centerTolerance?: number;
  centeredYawToleranceDeg?: number;
  turnYawThresholdDeg?: number;
  holdYawToleranceDeg?: number;
  holdPitchToleranceDeg?: number;
  holdRollToleranceDeg?: number;
  holdCenterMovementTolerance?: number;
  holdSizeMovementTolerance?: number;
  holdConsecutiveFrames?: number;
  eyeOpenThreshold?: number;
  eyeClosedThreshold?: number;
}

export const ML_KIT_LIVENESS_THRESHOLDS = {
  eventFreshnessMs: 1_200,
  minFaceRatio: 0.22,
  maxFaceRatio: 0.68,
  centerTolerance: 0.18,
  centeredYawToleranceDeg: 12,
  turnYawThresholdDeg: 18,
  holdYawToleranceDeg: 8,
  holdPitchToleranceDeg: 10,
  holdRollToleranceDeg: 8,
  holdCenterMovementTolerance: 0.04,
  holdSizeMovementTolerance: 0.05,
  holdConsecutiveFrames: 4,
  eyeOpenThreshold: 0.75,
  eyeClosedThreshold: 0.35,
};

interface HoldEvidence {
  stableFrames: number;
  previousCenterX?: number;
  previousCenterY?: number;
  previousSize?: number;
}

interface BlinkEvidence {
  sawOpen: boolean;
  sawClosed: boolean;
}

export class MlKitLivenessAdapter implements LivenessDetectionAdapter {
  readonly name = 'ml-kit-vision-camera-face-detector';

  private latestEvent: NormalizedFaceEvent | undefined;
  private leftTurnCompleted = false;
  private blinkEvidence: BlinkEvidence = { sawOpen: false, sawClosed: false };
  private holdEvidence: HoldEvidence = { stableFrames: 0 };
  private readonly options: Required<MlKitLivenessAdapterOptions>;

  constructor(options: MlKitLivenessAdapterOptions = {}) {
    this.options = {
      frontCameraMirrored: options.frontCameraMirrored ?? true,
      eventFreshnessMs: options.eventFreshnessMs ?? ML_KIT_LIVENESS_THRESHOLDS.eventFreshnessMs,
      minFaceRatio: options.minFaceRatio ?? ML_KIT_LIVENESS_THRESHOLDS.minFaceRatio,
      maxFaceRatio: options.maxFaceRatio ?? ML_KIT_LIVENESS_THRESHOLDS.maxFaceRatio,
      centerTolerance: options.centerTolerance ?? ML_KIT_LIVENESS_THRESHOLDS.centerTolerance,
      centeredYawToleranceDeg: options.centeredYawToleranceDeg ?? ML_KIT_LIVENESS_THRESHOLDS.centeredYawToleranceDeg,
      turnYawThresholdDeg: options.turnYawThresholdDeg ?? ML_KIT_LIVENESS_THRESHOLDS.turnYawThresholdDeg,
      holdYawToleranceDeg: options.holdYawToleranceDeg ?? ML_KIT_LIVENESS_THRESHOLDS.holdYawToleranceDeg,
      holdPitchToleranceDeg: options.holdPitchToleranceDeg ?? ML_KIT_LIVENESS_THRESHOLDS.holdPitchToleranceDeg,
      holdRollToleranceDeg: options.holdRollToleranceDeg ?? ML_KIT_LIVENESS_THRESHOLDS.holdRollToleranceDeg,
      holdCenterMovementTolerance:
        options.holdCenterMovementTolerance ?? ML_KIT_LIVENESS_THRESHOLDS.holdCenterMovementTolerance,
      holdSizeMovementTolerance: options.holdSizeMovementTolerance ?? ML_KIT_LIVENESS_THRESHOLDS.holdSizeMovementTolerance,
      holdConsecutiveFrames: options.holdConsecutiveFrames ?? ML_KIT_LIVENESS_THRESHOLDS.holdConsecutiveFrames,
      eyeOpenThreshold: options.eyeOpenThreshold ?? ML_KIT_LIVENESS_THRESHOLDS.eyeOpenThreshold,
      eyeClosedThreshold: options.eyeClosedThreshold ?? ML_KIT_LIVENESS_THRESHOLDS.eyeClosedThreshold,
    };
  }

  ingestFaces(faces: Face[], timestampMs = Date.now()): void {
    this.latestEvent = {
      timestampMs,
      faces: faces.map(normalizeFace),
    };
  }

  ingestNormalizedEvent(event: NormalizedFaceEvent): void {
    this.latestEvent = event;
  }

  reset(): void {
    this.latestEvent = undefined;
    this.leftTurnCompleted = false;
    this.blinkEvidence = { sawOpen: false, sawClosed: false };
    this.holdEvidence = { stableFrames: 0 };
  }

  async analyze(context: LivenessAnalysisContext): Promise<LivenessDetectionResult> {
    const event = this.latestEvent;
    if (!event || event.timestampMs < context.challengeStartedAtMs) {
      return noSignal('Center your face');
    }

    if (context.nowMs - event.timestampMs > this.options.eventFreshnessMs) {
      return noSignal('More light is needed');
    }

    const faceResult = this.singleUsableFace(event.faces);
    if (faceResult.type !== 'face') {
      this.resetStepEvidence(context.currentStep.id);
      return noSignal(faceResult.reason);
    }

    return this.evaluateStep(context.currentStep.id, faceResult.face);
  }

  private singleUsableFace(faces: NormalizedFaceDetection[]): { type: 'face'; face: NormalizedFaceDetection } | { type: 'no_face'; reason: LivenessGuidanceMessage } {
    if (faces.length === 0) {
      return { type: 'no_face', reason: 'More light is needed' };
    }

    if (faces.length > 1) {
      return { type: 'no_face', reason: 'Only one person should be visible' };
    }

    const face = faces[0]!;
    const size = faceSize(face);
    if (size < this.options.minFaceRatio) {
      return { type: 'no_face', reason: 'Move closer' };
    }

    if (size > this.options.maxFaceRatio) {
      return { type: 'no_face', reason: 'Move farther away' };
    }

    return { type: 'face', face };
  }

  private evaluateStep(step: LivenessChallengeStepId, face: NormalizedFaceDetection): LivenessDetectionResult {
    switch (step) {
      case 'center_face':
        return this.evaluateCenter(face);
      case 'turn_left':
        return this.evaluateLeft(face);
      case 'turn_right':
        return this.evaluateRight(face);
      case 'blink':
        return this.evaluateBlink(face);
      case 'hold_still':
        return this.evaluateHoldStill(face);
    }
  }

  private evaluateCenter(face: NormalizedFaceDetection): LivenessDetectionResult {
    if (!this.isCentered(face)) {
      return noSignal('Center your face');
    }

    if (Math.abs(this.userFacingYaw(face)) > this.options.centeredYawToleranceDeg) {
      return noSignal('Center your face');
    }

    return detected('center_face');
  }

  private evaluateLeft(face: NormalizedFaceDetection): LivenessDetectionResult {
    if (!this.isCentered(face)) {
      return noSignal('Center your face');
    }

    if (this.userFacingYaw(face) <= -this.options.turnYawThresholdDeg) {
      this.leftTurnCompleted = true;
      return detected('turn_left');
    }

    return noSignal('Turn left');
  }

  private evaluateRight(face: NormalizedFaceDetection): LivenessDetectionResult {
    if (!this.leftTurnCompleted) {
      return noSignal('Turn right');
    }

    if (!this.isCentered(face)) {
      return noSignal('Center your face');
    }

    if (this.userFacingYaw(face) >= this.options.turnYawThresholdDeg) {
      return detected('turn_right');
    }

    return noSignal('Turn right');
  }

  private evaluateBlink(face: NormalizedFaceDetection): LivenessDetectionResult {
    const left = face.leftEyeOpenProbability;
    const right = face.rightEyeOpenProbability;
    if (left === undefined || right === undefined) {
      return noSignal('Blink');
    }

    const bothOpen = left >= this.options.eyeOpenThreshold && right >= this.options.eyeOpenThreshold;
    const oneClosed = left <= this.options.eyeClosedThreshold || right <= this.options.eyeClosedThreshold;

    if (!this.blinkEvidence.sawOpen && bothOpen) {
      this.blinkEvidence.sawOpen = true;
      return noSignal('Blink');
    }

    if (this.blinkEvidence.sawOpen && oneClosed) {
      this.blinkEvidence.sawClosed = true;
      return noSignal('Blink');
    }

    if (this.blinkEvidence.sawOpen && this.blinkEvidence.sawClosed && bothOpen) {
      return detected('blink');
    }

    return noSignal('Blink');
  }

  private evaluateHoldStill(face: NormalizedFaceDetection): LivenessDetectionResult {
    if (!this.isCentered(face)) {
      this.holdEvidence = { stableFrames: 0 };
      return noSignal('Center your face');
    }

    const yaw = Math.abs(this.userFacingYaw(face));
    if (
      yaw > this.options.holdYawToleranceDeg ||
      Math.abs(face.pitchAngle) > this.options.holdPitchToleranceDeg ||
      Math.abs(face.rollAngle) > this.options.holdRollToleranceDeg
    ) {
      this.holdEvidence = { stableFrames: 0 };
      return noSignal('Hold still');
    }

    const center = faceCenter(face);
    const size = faceSize(face);
    const previousCenterX = this.holdEvidence.previousCenterX;
    const previousCenterY = this.holdEvidence.previousCenterY;
    const previousSize = this.holdEvidence.previousSize;
    const moved =
      previousCenterX !== undefined &&
      previousCenterY !== undefined &&
      previousSize !== undefined &&
      (Math.abs(center.x - previousCenterX) > this.options.holdCenterMovementTolerance ||
        Math.abs(center.y - previousCenterY) > this.options.holdCenterMovementTolerance ||
        Math.abs(size - previousSize) > this.options.holdSizeMovementTolerance);

    this.holdEvidence = {
      stableFrames: moved ? 1 : this.holdEvidence.stableFrames + 1,
      previousCenterX: center.x,
      previousCenterY: center.y,
      previousSize: size,
    };

    if (this.holdEvidence.stableFrames >= this.options.holdConsecutiveFrames) {
      return detected('hold_still');
    }

    return noSignal('Hold still');
  }

  private isCentered(face: NormalizedFaceDetection): boolean {
    const center = faceCenter(face);
    return Math.abs(center.x - 0.5) <= this.options.centerTolerance && Math.abs(center.y - 0.5) <= this.options.centerTolerance;
  }

  private userFacingYaw(face: NormalizedFaceDetection): number {
    return this.options.frontCameraMirrored ? -face.yawAngle : face.yawAngle;
  }

  private resetStepEvidence(step: LivenessChallengeStepId): void {
    if (step === 'blink') {
      this.blinkEvidence = { sawOpen: false, sawClosed: false };
    }
    if (step === 'hold_still') {
      this.holdEvidence = { stableFrames: 0 };
    }
  }
}

function normalizeFace(face: Face): NormalizedFaceDetection {
  return {
    bounds: {
      x: face.bounds.x / face.frameWidth,
      y: face.bounds.y / face.frameHeight,
      width: face.bounds.width / face.frameWidth,
      height: face.bounds.height / face.frameHeight,
    },
    yawAngle: face.yawAngle,
    pitchAngle: face.pitchAngle,
    rollAngle: face.rollAngle,
    leftEyeOpenProbability: face.leftEyeOpenProbability,
    rightEyeOpenProbability: face.rightEyeOpenProbability,
    trackingId: face.trackingId,
  };
}

function faceCenter(face: NormalizedFaceDetection): { x: number; y: number } {
  return {
    x: face.bounds.x + face.bounds.width / 2,
    y: face.bounds.y + face.bounds.height / 2,
  };
}

function faceSize(face: NormalizedFaceDetection): number {
  return Math.max(face.bounds.width, face.bounds.height);
}

function noSignal(reason: LivenessGuidanceMessage): LivenessDetectionResult {
  return { type: 'no_signal', reason };
}

function detected(step: LivenessChallengeStepId): LivenessDetectionResult {
  return { type: 'step_detected', step };
}
