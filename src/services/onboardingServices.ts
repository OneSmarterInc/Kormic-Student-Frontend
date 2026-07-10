import { LinkedInScreenshot, SelectedCvFile } from '../models/onboarding';

export interface GitHubService {
  connect(): Promise<{ handle: string }>;
}

export interface LinkedInService {
  pickScreenshots(existingCount: number): Promise<LinkedInScreenshot[]>;
}

export interface CvService {
  pickFile(): Promise<SelectedCvFile>;
}

export interface BuildAgentService {
  stages: string[];
}

export interface OnboardingServices {
  github: GitHubService;
  linkedin: LinkedInService;
  cv: CvService;
  buildAgent: BuildAgentService;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockOnboardingServices: OnboardingServices = {
  github: {
    async connect() {
      await wait(900);
      return { handle: '@kormic-student' };
    },
  },
  linkedin: {
    async pickScreenshots(existingCount: number) {
      await wait(250);
      const next = existingCount + 1;
      return [{ id: `linkedin-${Date.now()}-${next}`, label: `Shot ${next}` }];
    },
  },
  cv: {
    async pickFile() {
      await wait(250);
      return { name: 'Kormic_Student_CV.pdf', type: 'pdf' };
    },
  },
  buildAgent: {
    stages: ['Reading your profile', 'Verifying your work', 'Confirming your identity', 'Putting it together'],
  },
};
