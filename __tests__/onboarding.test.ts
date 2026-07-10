import { initialOnboardingState, OnboardingState } from '../src/models/onboarding';
import { canAdvanceFrom, getProgress, missingRecommendedSources } from '../src/navigation/routes';
import { onboardingReducer } from '../src/state/onboardingReducer';
import { durationForMotion } from '../src/utils/motion';
import { isBasicInfoComplete, validateBasicInfo } from '../src/utils/validation';

function completeBasicInfo(state: OnboardingState): OnboardingState {
  const values: Record<string, string> = {
    fullName: 'Priya Sharma',
    email: 'priya@example.com',
    phone: '+1 555 123 4567',
    dateOfBirth: '02 / 03 / 2004',
    college: 'Kormic University',
    city: 'New York',
    region: 'NY',
    country: 'United States',
    fieldOfStudy: 'Computer Science',
    degreeLevel: "Bachelor's",
    yearInCollege: '3rd',
    expectedGraduation: '05 / 2027',
  };

  let next = state;
  Object.entries(values).forEach(([field, value]) => {
    next = onboardingReducer(next, { type: 'UPDATE_BASIC_INFO', field: field as never, value });
  });
  return onboardingReducer(next, { type: 'TOGGLE_INTEREST', interest: 'Internship' });
}

describe('onboarding validation and gates', () => {
  it('returns specific required-field validation errors', () => {
    const errors = validateBasicInfo(initialOnboardingState.basicInfo);

    expect(errors.fullName).toBe('Enter your full name');
    expect(errors.email).toBe('Enter your email');
    expect(errors.interests).toBe('Choose at least one interest');
    expect(isBasicInfoComplete(initialOnboardingState.basicInfo)).toBe(false);
  });

  it('validates email and reasonable international phone formats', () => {
    let state = completeBasicInfo(initialOnboardingState);
    state = onboardingReducer(state, { type: 'UPDATE_BASIC_INFO', field: 'email', value: 'not-an-email' });
    state = onboardingReducer(state, { type: 'UPDATE_BASIC_INFO', field: 'phone', value: '12' });

    const errors = validateBasicInfo(state.basicInfo);
    expect(errors.email).toBe('Enter a valid email address');
    expect(errors.phone).toBe('Enter a valid phone number');
  });

  it('toggles multiple interests on and off', () => {
    let state = onboardingReducer(initialOnboardingState, { type: 'TOGGLE_INTEREST', interest: 'Study abroad' });
    state = onboardingReducer(state, { type: 'TOGGLE_INTEREST', interest: 'Job' });
    expect(state.basicInfo.interests).toEqual(['Study abroad', 'Job']);

    state = onboardingReducer(state, { type: 'TOGGLE_INTEREST', interest: 'Study abroad' });
    expect(state.basicInfo.interests).toEqual(['Job']);
  });

  it('gates navigation until requirements are complete', () => {
    expect(canAdvanceFrom('BasicInfo', initialOnboardingState)).toBe(false);
    const state = completeBasicInfo(initialOnboardingState);
    expect(canAdvanceFrom('BasicInfo', state)).toBe(true);
  });

  it('prevents liveness forward navigation before simulated success', () => {
    const capturing = onboardingReducer(initialOnboardingState, { type: 'SET_LIVENESS', status: 'capturing' });
    const success = onboardingReducer(capturing, { type: 'SET_LIVENESS', status: 'success' });

    expect(canAdvanceFrom('Liveness', capturing)).toBe(false);
    expect(canAdvanceFrom('Liveness', success)).toBe(true);
  });

  it('preserves state when moving backward', () => {
    let state = completeBasicInfo(initialOnboardingState);
    state = onboardingReducer(state, { type: 'NAVIGATE', route: 'Liveness' });
    state = onboardingReducer(state, { type: 'BACK' });

    expect(state.route).toBe('BasicInfo');
    expect(state.basicInfo.fullName).toBe('Priya Sharma');
    expect(state.basicInfo.interests).toEqual(['Internship']);
  });

  it('records GitHub skip and marks the profile incomplete', () => {
    const state = onboardingReducer(initialOnboardingState, { type: 'SKIP_GITHUB' });

    expect(state.githubStatus).toBe('skipped');
    expect(state.profileIncomplete).toBe(true);
    expect(missingRecommendedSources(state)).toEqual(['GitHub']);
    expect(canAdvanceFrom('GitHub', state)).toBe(true);
  });

  it('adds and removes LinkedIn screenshots', () => {
    let state = onboardingReducer(initialOnboardingState, {
      type: 'ADD_LINKEDIN_SCREENSHOT',
      screenshot: { id: 'shot-1', label: 'Shot 1' },
    });

    expect(state.linkedinStatus).toBe('uploaded');
    expect(canAdvanceFrom('LinkedIn', state)).toBe(true);

    state = onboardingReducer(state, { type: 'REMOVE_LINKEDIN_SCREENSHOT', id: 'shot-1' });
    expect(state.linkedinStatus).toBe('not_started');
    expect(state.linkedinScreenshots).toHaveLength(0);
  });

  it('requires CV before building the agent', () => {
    expect(canAdvanceFrom('CV', initialOnboardingState)).toBe(false);
    const state = onboardingReducer(initialOnboardingState, {
      type: 'SELECT_CV',
      file: { name: 'Priya_CV.pdf', type: 'pdf' },
    });
    expect(canAdvanceFrom('CV', state)).toBe(true);
  });

  it('completes the full onboarding flow with required gates satisfied', () => {
    let state = onboardingReducer(initialOnboardingState, { type: 'NEXT' });
    expect(state.route).toBe('BasicInfo');

    state = completeBasicInfo(state);
    state = onboardingReducer(state, { type: 'NEXT' });
    state = onboardingReducer(state, { type: 'SET_LIVENESS', status: 'success' });
    state = onboardingReducer(state, { type: 'NEXT' });
    state = onboardingReducer(state, { type: 'SET_GITHUB_CONNECTED', handle: '@priya' });
    state = onboardingReducer(state, { type: 'NEXT' });
    state = onboardingReducer(state, {
      type: 'ADD_LINKEDIN_SCREENSHOT',
      screenshot: { id: 'shot-1', label: 'Shot 1' },
    });
    state = onboardingReducer(state, { type: 'NEXT' });
    state = onboardingReducer(state, {
      type: 'SELECT_CV',
      file: { name: 'Priya_CV.pdf', type: 'pdf' },
    });
    state = onboardingReducer(state, { type: 'NEXT' });
    state = onboardingReducer(state, { type: 'NEXT' });

    expect(state.route).toBe('AgentLive');
    expect(state.profileIncomplete).toBe(false);
  });

  it('supports reduced-motion-safe durations', () => {
    expect(durationForMotion(850, true)).toBe(0);
    expect(durationForMotion(850, false)).toBe(850);
  });
});
