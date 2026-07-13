export type OnboardingRoute =
  | 'Welcome'
  | 'Login'
  | 'BasicInfo'
  | 'Liveness'
  | 'GitHub'
  | 'LinkedIn'
  | 'CV'
  | 'BuildingAgent'
  | 'AgentLive'
  | 'Profile';

export type Interest = 'Study abroad' | 'Internship' | 'Job' | 'Not sure yet';

export type RecommendedSourceState = 'not_started' | 'connected' | 'uploaded' | 'skipped';

export type LivenessStatus = 'intro' | 'capturing' | 'success' | 'retry';

export type GitHubStatus = 'not_started' | 'connecting' | 'connected' | 'error' | 'skipped';

export type LinkedInStatus = 'not_started' | 'uploaded' | 'skipped';

export interface AuthOnboarding {
  profile_exists: boolean;
  resume_uploaded: boolean;
  github_connected: boolean;
  linkedin_connected: boolean;
  setup_complete: boolean;
}

export interface AuthUser {
  id: number;
  email: string;
  name?: string;
  role: 'student' | 'university' | string;
  student_id?: string | null;
  university_id?: string | null;
  totp_enrolled: boolean;
  onboarding?: AuthOnboarding;
}

export interface AuthSession {
  access?: string;
  refresh?: string;
  mfaToken?: string;
  expiresIn?: number;
  user?: AuthUser;
  mustEnrollTotp: boolean;
  totpRequired?: boolean;
  profileCreated?: boolean;
}

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
  uri?: string;
  name?: string;
  type?: string;
  file?: Blob;
}

export interface SelectedCvFile {
  name: string;
  type: 'pdf' | 'doc' | 'docx';
  uri?: string;
  mimeType?: string;
  file?: Blob;
}

export interface OnboardingState {
  route: OnboardingRoute;
  basicInfo: BasicInfo;
  authSession?: AuthSession;
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
