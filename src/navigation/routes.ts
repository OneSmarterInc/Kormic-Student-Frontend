import { OnboardingRoute, countedRoutes, orderedRoutes } from '../models/onboarding';
import { OnboardingState } from '../models/onboarding';
import { isBasicInfoComplete } from '../utils/validation';

export const routeTitles: Record<OnboardingRoute, string> = {
  Welcome: 'Welcome',
  Login: 'Login',
  BasicInfo: 'Basic information',
  SecuritySetup: 'Security setup',
  GitHub: 'GitHub',
  LinkedIn: 'LinkedIn',
  CV: 'CV',
  BuildingAgent: 'Building',
  AgentLive: 'Agent live',
  Profile: 'Profile',
  BotScreen: 'Agent chat',
};

export function getPreviousRoute(route: OnboardingRoute): OnboardingRoute | undefined {
  if (route === 'Login') {
    return 'Welcome';
  }
  if (route === 'Profile') {
    return 'AgentLive';
  }
  if (route === 'BotScreen') {
    return 'Profile';
  }
  const index = orderedRoutes.indexOf(route);
  return index > 0 ? orderedRoutes[index - 1] : undefined;
}

export function getNextRoute(route: OnboardingRoute): OnboardingRoute | undefined {
  const index = orderedRoutes.indexOf(route);
  return index >= 0 && index < orderedRoutes.length - 1 ? orderedRoutes[index + 1] : undefined;
}

export function getProgress(route: OnboardingRoute): { current: number; total: number; ratio: number } | undefined {
  const index = countedRoutes.indexOf(route);
  if (index === -1) {
    return undefined;
  }
  const current = index + 1;
  const total = countedRoutes.length;
  return { current, total, ratio: current / total };
}

export function canAdvanceFrom(route: OnboardingRoute, state: OnboardingState): boolean {
  switch (route) {
    case 'Welcome':
      return true;
    case 'Login':
      return Boolean(state.authSession);
    case 'BasicInfo':
      return isBasicInfoComplete(state.basicInfo);
    case 'SecuritySetup':
      return Boolean(state.authSession);
    case 'GitHub':
      return state.githubStatus === 'connected' || state.githubStatus === 'skipped';
    case 'LinkedIn':
      return state.linkedinStatus === 'uploaded' || state.linkedinStatus === 'skipped';
    case 'CV':
      return Boolean(state.cvFile);
    case 'BuildingAgent':
      return true;
    case 'AgentLive':
      return false;
    case 'Profile':
      return false;
    case 'BotScreen':
      return false;
  }
}

export function missingRecommendedSources(state: OnboardingState): string[] {
  const missing: string[] = [];
  if (state.githubStatus === 'skipped') {
    missing.push('GitHub');
  }
  if (state.linkedinStatus === 'skipped') {
    missing.push('LinkedIn');
  }
  return missing;
}
