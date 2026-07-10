export type OnboardingRoute =
  | 'Welcome'
  | 'BasicInfo'
  | 'Liveness'
  | 'GitHub'
  | 'LinkedIn'
  | 'CV'
  | 'BuildingAgent'
  | 'AgentLive';

export type Interest = 'Study abroad' | 'Internship' | 'Job' | 'Not sure yet';

export type RecommendedSourceState = 'not_started' | 'connected' | 'uploaded' | 'skipped';

export type LivenessStatus = 'intro' | 'capturing' | 'success' | 'retry';

export type GitHubStatus = 'not_started' | 'connecting' | 'connected' | 'error' | 'skipped';

export type LinkedInStatus = 'not_started' | 'uploaded' | 'skipped';

export interface BasicInfo {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  college: string;
  city: string;
  region: string;
  country: string;
  fieldOfStudy: string;
  degreeLevel: string;
  yearInCollege: string;
  expectedGraduation: string;
  interests: Interest[];
  targetDegreeOrField: string;
}

export interface LinkedInScreenshot {
  id: string;
  label: string;
}

export interface SelectedCvFile {
  name: string;
  type: 'pdf' | 'doc' | 'docx';
}

export interface OnboardingState {
  route: OnboardingRoute;
  basicInfo: BasicInfo;
  livenessStatus: LivenessStatus;
  githubStatus: GitHubStatus;
  githubHandle?: string;
  linkedinStatus: LinkedInStatus;
  linkedinScreenshots: LinkedInScreenshot[];
  cvFile?: SelectedCvFile;
  buildStage: number;
  profileIncomplete: boolean;
}

export type BasicInfoField = keyof BasicInfo;

export const orderedRoutes: OnboardingRoute[] = [
  'Welcome',
  'BasicInfo',
  'Liveness',
  'GitHub',
  'LinkedIn',
  'CV',
  'BuildingAgent',
  'AgentLive',
];

export const countedRoutes: OnboardingRoute[] = ['BasicInfo', 'Liveness', 'GitHub', 'LinkedIn', 'CV', 'BuildingAgent'];

export const interests: Interest[] = ['Study abroad', 'Internship', 'Job', 'Not sure yet'];

export const initialBasicInfo: BasicInfo = {
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  college: '',
  city: '',
  region: '',
  country: '',
  fieldOfStudy: '',
  degreeLevel: '',
  yearInCollege: '',
  expectedGraduation: '',
  interests: [],
  targetDegreeOrField: '',
};

export const initialOnboardingState: OnboardingState = {
  route: 'Welcome',
  basicInfo: initialBasicInfo,
  livenessStatus: 'intro',
  githubStatus: 'not_started',
  linkedinStatus: 'not_started',
  linkedinScreenshots: [],
  buildStage: 0,
  profileIncomplete: false,
};
