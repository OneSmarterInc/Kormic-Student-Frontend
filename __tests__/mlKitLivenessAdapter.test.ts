import {
  LIVENESS_CHALLENGE_STEPS,
  LivenessChallengeController,
  MlKitLivenessAdapter,
  NormalizedFaceDetection,
  NormalizedFaceEvent,
} from '../src/identity';

let now = 1_000;

function context(step: (typeof LIVENESS_CHALLENGE_STEPS)[number]['id']) {
  return {
    currentStep: LIVENESS_CHALLENGE_STEPS.find((candidate) => candidate.id === step)!,
    challengeStartedAtMs: 1_000,
    currentStepStartedAtMs: 1_000,
    nowMs: now,
  };
}

function face(overrides: Partial<NormalizedFaceDetection> = {}): NormalizedFaceDetection {
  return {
    bounds: { x: 0.3, y: 0.3, width: 0.4, height: 0.4 },
    yawAngle: 0,
    pitchAngle: 0,
    rollAngle: 0,
    leftEyeOpenProbability: 0.9,
    rightEyeOpenProbability: 0.9,
    ...overrides,
  };
}

function event(faces: NormalizedFaceDetection[], timestampMs = now): NormalizedFaceEvent {
  return { faces, timestampMs };
}

async function analyze(step: (typeof LIVENESS_CHALLENGE_STEPS)[number]['id'], faces: NormalizedFaceDetection[]) {
  const adapter = new MlKitLivenessAdapter();
  adapter.ingestNormalizedEvent(event(faces));
  return adapter.analyze(context(step));
}

describe('ML Kit liveness adapter rules', () => {
  beforeEach(() => {
    now = 1_000;
  });

  it('returns no signal when no face is visible', async () => {
    await expect(analyze('center_face', [])).resolves.toEqual({ type: 'no_signal', reason: 'More light is needed' });
  });

  it('rejects multiple faces', async () => {
    await expect(analyze('center_face', [face(), face()])).resolves.toEqual({
      type: 'no_signal',
      reason: 'Only one person should be visible',
    });
  });

  it('detects a centered face', async () => {
    await expect(analyze('center_face', [face()])).resolves.toEqual({ type: 'step_detected', step: 'center_face' });
  });

  it('asks the student to move closer when the face is too small', async () => {
    await expect(analyze('center_face', [face({ bounds: { x: 0.45, y: 0.45, width: 0.1, height: 0.1 } })])).resolves.toEqual({
      type: 'no_signal',
      reason: 'Move closer',
    });
  });

  it('detects left threshold with front-camera mirroring accounted for', async () => {
    await expect(analyze('turn_left', [face({ yawAngle: 22 })])).resolves.toEqual({ type: 'step_detected', step: 'turn_left' });
  });

  it('detects right threshold after the left turn has been completed', async () => {
    const adapter = new MlKitLivenessAdapter();
    adapter.ingestNormalizedEvent(event([face({ yawAngle: 22 })]));
    await adapter.analyze(context('turn_left'));

    adapter.ingestNormalizedEvent(event([face({ yawAngle: -22 })]));
    await expect(adapter.analyze(context('turn_right'))).resolves.toEqual({ type: 'step_detected', step: 'turn_right' });
  });

  it('does not complete when the student turns the wrong direction', async () => {
    await expect(analyze('turn_left', [face({ yawAngle: -22 })])).resolves.toEqual({ type: 'no_signal', reason: 'Turn left' });
  });

  it('detects blink open closed open', async () => {
    const adapter = new MlKitLivenessAdapter();
    adapter.ingestNormalizedEvent(event([face({ leftEyeOpenProbability: 0.9, rightEyeOpenProbability: 0.92 })]));
    expect(await adapter.analyze(context('blink'))).toEqual({ type: 'no_signal', reason: 'Blink' });

    adapter.ingestNormalizedEvent(event([face({ leftEyeOpenProbability: 0.2, rightEyeOpenProbability: 0.88 })]));
    expect(await adapter.analyze(context('blink'))).toEqual({ type: 'no_signal', reason: 'Blink' });

    adapter.ingestNormalizedEvent(event([face({ leftEyeOpenProbability: 0.91, rightEyeOpenProbability: 0.9 })]));
    expect(await adapter.analyze(context('blink'))).toEqual({ type: 'step_detected', step: 'blink' });
  });

  it('does not pass an incomplete blink', async () => {
    const adapter = new MlKitLivenessAdapter();
    adapter.ingestNormalizedEvent(event([face({ leftEyeOpenProbability: 0.9, rightEyeOpenProbability: 0.9 })]));
    await adapter.analyze(context('blink'));

    adapter.ingestNormalizedEvent(event([face({ leftEyeOpenProbability: 0.88, rightEyeOpenProbability: 0.91 })]));
    await expect(adapter.analyze(context('blink'))).resolves.toEqual({ type: 'no_signal', reason: 'Blink' });
  });

  it('requires consecutive stable frames before hold still completes', async () => {
    const adapter = new MlKitLivenessAdapter();
    for (let index = 0; index < 3; index += 1) {
      adapter.ingestNormalizedEvent(event([face()]));
      await expect(adapter.analyze(context('hold_still'))).resolves.toEqual({ type: 'no_signal', reason: 'Hold still' });
    }

    adapter.ingestNormalizedEvent(event([face()]));
    await expect(adapter.analyze(context('hold_still'))).resolves.toEqual({ type: 'step_detected', step: 'hold_still' });
  });

  it('resets hold-still evidence when movement exceeds tolerance', async () => {
    const adapter = new MlKitLivenessAdapter();
    adapter.ingestNormalizedEvent(event([face()]));
    await adapter.analyze(context('hold_still'));
    adapter.ingestNormalizedEvent(event([face()]));
    await adapter.analyze(context('hold_still'));

    adapter.ingestNormalizedEvent(event([face({ bounds: { x: 0.38, y: 0.3, width: 0.4, height: 0.4 } })]));
    await expect(adapter.analyze(context('hold_still'))).resolves.toEqual({ type: 'no_signal', reason: 'Hold still' });

    adapter.ingestNormalizedEvent(event([face()]));
    await expect(adapter.analyze(context('hold_still'))).resolves.toEqual({ type: 'no_signal', reason: 'Hold still' });
  });

  it('rejects out-of-order controller signals', async () => {
    const detector = {
      name: 'out-of-order-test',
      analyze: jest.fn(async () => ({ type: 'step_detected' as const, step: 'turn_right' as const })),
    };
    const controller = new LivenessChallengeController(detector, { now: () => now });

    controller.start();
    expect((await controller.analyzeCurrentStep()).status).toBe('failed');
  });

  it('fails when one step exceeds its timeout', async () => {
    const detector = { name: 'timeout-test', analyze: jest.fn(async () => ({ type: 'no_signal' as const })) };
    const controller = new LivenessChallengeController(detector, { now: () => now, stepTimeoutMs: 100, totalTimeoutMs: 1_000 });

    controller.start();
    now += 101;
    const state = await controller.analyzeCurrentStep();
    expect(state.status).toBe('failed');
    expect(state.failureReason).toBe('That step took too long. Please try again.');
  });

  it('fails when total challenge duration exceeds its timeout', async () => {
    const detector = { name: 'timeout-test', analyze: jest.fn(async () => ({ type: 'no_signal' as const })) };
    const controller = new LivenessChallengeController(detector, { now: () => now, stepTimeoutMs: 1_000, totalTimeoutMs: 100 });

    controller.start();
    now += 101;
    const state = await controller.analyzeCurrentStep();
    expect(state.status).toBe('failed');
    expect(state.failureReason).toBe('The liveness challenge took too long. Please try again.');
  });

  it('retry clears accumulated evidence', async () => {
    const adapter = new MlKitLivenessAdapter();
    adapter.ingestNormalizedEvent(event([face({ leftEyeOpenProbability: 0.9, rightEyeOpenProbability: 0.9 })]));
    await adapter.analyze(context('blink'));
    adapter.ingestNormalizedEvent(event([face({ leftEyeOpenProbability: 0.2, rightEyeOpenProbability: 0.9 })]));
    await adapter.analyze(context('blink'));

    adapter.reset();
    adapter.ingestNormalizedEvent(event([face({ leftEyeOpenProbability: 0.9, rightEyeOpenProbability: 0.9 })]));
    await expect(adapter.analyze(context('blink'))).resolves.toEqual({ type: 'no_signal', reason: 'Blink' });
  });

  it('keeps the unavailable fallback behavior', async () => {
    const controller = new LivenessChallengeController(undefined, { now: () => now });
    controller.start();

    const state = await controller.analyzeCurrentStep();
    expect(state.status).toBe('unavailable');
  });
});
