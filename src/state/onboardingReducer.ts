import {
  BasicInfoField,
  Interest,
  LinkedInScreenshot,
  OnboardingRoute,
  OnboardingState,
  SelectedCvFile,
  initialOnboardingState,
} from '../models/onboarding';
import { getNextRoute, getPreviousRoute, missingRecommendedSources } from '../navigation/routes';

export type OnboardingAction =
  | { type: 'NAVIGATE'; route: OnboardingRoute }
  | { type: 'BACK' }
  | { type: 'NEXT' }
  | { type: 'UPDATE_BASIC_INFO'; field: BasicInfoField; value: string }
  | { type: 'TOGGLE_INTEREST'; interest: Interest }
  | { type: 'SET_LIVENESS'; status: OnboardingState['livenessStatus'] }
  | { type: 'SET_BIOMETRIC'; status: OnboardingState['biometricStatus'] }
  | { type: 'SET_GITHUB_CONNECTING' }
  | { type: 'SET_GITHUB_CONNECTED'; handle: string }
  | { type: 'SET_GITHUB_ERROR' }
  | { type: 'SKIP_GITHUB' }
  | { type: 'ADD_LINKEDIN_SCREENSHOT'; screenshot: LinkedInScreenshot }
  | { type: 'REMOVE_LINKEDIN_SCREENSHOT'; id: string }
  | { type: 'SKIP_LINKEDIN' }
  | { type: 'SELECT_CV'; file: SelectedCvFile }
  | { type: 'REMOVE_CV' }
  | { type: 'SET_BUILD_STAGE'; stage: number };

function withProfileStatus(state: OnboardingState): OnboardingState {
  return {
    ...state,
    profileIncomplete: missingRecommendedSources(state).length > 0,
  };
}

export function onboardingReducer(
  state: OnboardingState = initialOnboardingState,
  action: OnboardingAction,
): OnboardingState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, route: action.route };
    case 'BACK': {
      const previous = getPreviousRoute(state.route);
      return previous ? { ...state, route: previous } : state;
    }
    case 'NEXT': {
      const next = getNextRoute(state.route);
      return next ? { ...state, route: next } : state;
    }
    case 'UPDATE_BASIC_INFO':
      return {
        ...state,
        basicInfo: {
          ...state.basicInfo,
          [action.field]: action.value,
        },
      };
    case 'TOGGLE_INTEREST': {
      const exists = state.basicInfo.interests.includes(action.interest);
      return {
        ...state,
        basicInfo: {
          ...state.basicInfo,
          interests: exists
            ? state.basicInfo.interests.filter((interest) => interest !== action.interest)
            : [...state.basicInfo.interests, action.interest],
        },
      };
    }
    case 'SET_LIVENESS':
      return { ...state, livenessStatus: action.status };
    case 'SET_BIOMETRIC':
      return { ...state, biometricStatus: action.status };
    case 'SET_GITHUB_CONNECTING':
      return { ...state, githubStatus: 'connecting' };
    case 'SET_GITHUB_CONNECTED':
      return withProfileStatus({
        ...state,
        githubStatus: 'connected',
        githubHandle: action.handle,
      });
    case 'SET_GITHUB_ERROR':
      return { ...state, githubStatus: 'error' };
    case 'SKIP_GITHUB':
      return withProfileStatus({ ...state, githubStatus: 'skipped' });
    case 'ADD_LINKEDIN_SCREENSHOT':
      return withProfileStatus({
        ...state,
        linkedinStatus: 'uploaded',
        linkedinScreenshots: [...state.linkedinScreenshots, action.screenshot],
      });
    case 'REMOVE_LINKEDIN_SCREENSHOT': {
      const linkedinScreenshots = state.linkedinScreenshots.filter((screenshot) => screenshot.id !== action.id);
      return withProfileStatus({
        ...state,
        linkedinScreenshots,
        linkedinStatus: linkedinScreenshots.length > 0 ? 'uploaded' : 'not_started',
      });
    }
    case 'SKIP_LINKEDIN':
      return withProfileStatus({ ...state, linkedinStatus: 'skipped', linkedinScreenshots: [] });
    case 'SELECT_CV':
      return { ...state, cvFile: action.file };
    case 'REMOVE_CV': {
      const nextState = { ...state };
      delete nextState.cvFile;
      return nextState;
    }
    case 'SET_BUILD_STAGE':
      return { ...state, buildStage: action.stage };
  }
}

