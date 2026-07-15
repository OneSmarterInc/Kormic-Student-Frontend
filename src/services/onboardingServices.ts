import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { AuthSession, LinkedInScreenshot, SelectedCvFile } from '../models/onboarding';
import { analyzeGithub, uploadLinkedIn, uploadResume } from './api';

export interface LivenessService {
  startCheck(): Promise<'success' | 'retry'>;
}

export interface GitHubService {
  analyze(session: AuthSession | undefined): Promise<void>;
}

export interface LinkedInService {
  pickScreenshots(existingCount: number): Promise<LinkedInScreenshot[]>;
  upload(session: AuthSession | undefined, screenshots: LinkedInScreenshot[]): Promise<void>;
}

export interface CvService {
  pickFile(): Promise<SelectedCvFile>;
  upload(session: AuthSession | undefined, file: SelectedCvFile): Promise<void>;
}

export interface BuildAgentService {
  stages: string[];
}

export interface OnboardingServices {
  liveness: LivenessService;
  github: GitHubService;
  linkedin: LinkedInService;
  cv: CvService;
  buildAgent: BuildAgentService;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function pickWebFiles(accept: string, multiple: boolean): Promise<File[]> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('File picking is only available in the browser for this build.'));
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = 'none';

    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      input.remove();
      resolve(files);
    };

    input.oncancel = () => {
      input.remove();
      resolve([]);
    };

    document.body.appendChild(input);
    input.click();
  });
}

function cvTypeFromName(name: string): SelectedCvFile['type'] {
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'doc') {
    return 'doc';
  }
  if (extension === 'docx') {
    return 'docx';
  }
  return 'pdf';
}

function imageNameFromUri(uri: string, index: number) {
  return uri.split('/').pop() || `linkedin-${index + 1}.jpg`;
}

export const mockOnboardingServices: OnboardingServices = {
  liveness: {
    async startCheck() {
      await wait(900);
      return 'retry';
    },
  },
  github: {
    async analyze(session: AuthSession | undefined) {
      await wait(900);
      if (!session) {
        throw new Error('Missing auth session');
      }
      await analyzeGithub(session);
    },
  },
  linkedin: {
    async pickScreenshots(existingCount: number) {
      if (Platform.OS !== 'web') {
        const result = await DocumentPicker.getDocumentAsync({
          copyToCacheDirectory: true,
          multiple: true,
          type: 'image/*',
        });

        if (result.canceled || result.assets.length === 0) {
          throw new Error('Choose at least one LinkedIn screenshot.');
        }

        return result.assets.map((asset, index) => {
          const next = existingCount + index + 1;
          return {
            id: `linkedin-${Date.now()}-${next}`,
            label: asset.name || imageNameFromUri(asset.uri, index),
            uri: asset.uri,
            name: asset.name || imageNameFromUri(asset.uri, index),
            type: asset.mimeType || 'image/jpeg',
          };
        });
      }

      const files = await pickWebFiles('image/*', true);
      if (files.length === 0) {
        throw new Error('Choose at least one LinkedIn screenshot.');
      }

      return files.map((file, index) => {
        const next = existingCount + index + 1;
        return {
          id: `linkedin-${Date.now()}-${next}`,
          label: file.name || `Shot ${next}`,
          uri: typeof URL !== 'undefined' ? URL.createObjectURL(file) : undefined,
          name: file.name || `linkedin-${next}.jpg`,
          type: file.type || 'image/jpeg',
          file,
        };
      });
    },
    async upload(session: AuthSession | undefined, screenshots: LinkedInScreenshot[]) {
      if (!session) {
        throw new Error('Missing auth session');
      }
      await uploadLinkedIn(session, screenshots);
    },
  },
  cv: {
    async pickFile() {
      if (Platform.OS !== 'web') {
        const result = await DocumentPicker.getDocumentAsync({
          copyToCacheDirectory: true,
          multiple: false,
          type: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
        });

        if (result.canceled || result.assets.length === 0) {
          throw new Error('Choose a resume file.');
        }

        const asset = result.assets[0];
        if (!asset) {
          throw new Error('Choose a resume file.');
        }

        return {
          name: asset.name,
          type: cvTypeFromName(asset.name),
          uri: asset.uri,
          mimeType: asset.mimeType,
        };
      }

      const [file] = await pickWebFiles('.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document', false);
      if (!file) {
        throw new Error('Choose a resume file.');
      }

      return {
        name: file.name,
        type: cvTypeFromName(file.name),
        uri: typeof URL !== 'undefined' ? URL.createObjectURL(file) : undefined,
        file,
      };
    },
    async upload(session: AuthSession | undefined, file: SelectedCvFile) {
      if (!session) {
        throw new Error('Missing auth session');
      }
      await uploadResume(session, file);
    },
  },
  buildAgent: {
    stages: ['Reading your profile', 'Verifying your work', 'Confirming your identity', 'Putting it together'],
  },
};
