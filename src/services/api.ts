import { AuthSession, AuthUser, BasicInfo, LinkedInScreenshot, SelectedCvFile } from '../models/onboarding';
import { clearSavedTokens, getSavedRefreshToken, saveAccessToken, saveRefreshToken } from './tokenStorage';
import { parseGraduationYear } from '../utils/validation';

declare const process: { env?: Record<string, string | undefined> } | undefined;

const DEFAULT_API_BASE_URL = 'https://killing-derek-drawing-surgeons.trycloudflare.com/api';

export const API_BASE_URL =
  typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL : DEFAULT_API_BASE_URL;

interface ApiErrorBody {
  detail?: string;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export interface RegisterResponse {
  message?: string;
  must_enroll_totp?: boolean;
  access?: string;
  access_token?: string;
  refresh?: string;
  refresh_token?: string;
  user?: AuthUser;
  detail?: string;
}

export interface LoginResponse {
  must_enroll_totp?: boolean;
  access?: string;
  refresh?: string;
  user?: AuthUser;
  mfa_token?: string;
  totp_required?: boolean;
  expires_in?: number;
  access_token?: string;
  refresh_token?: string;
  detail?: string;
  message?: string;
}

export interface TotpEnrollResponse {
  secret?: string;
  provisioning_uri?: string;
  detail?: string;
  message?: string;
}

export interface TotpVerifyEnrollmentResponse {
  access?: string;
  access_token?: string;
  refresh?: string;
  refresh_token?: string;
  user?: AuthUser;
  backup_codes?: string[];
  detail?: string;
  message?: string;
}

export interface VerifyTotpLoginResponse {
  access: string;
  access_token?: string;
  refresh?: string;
  refresh_token?: string;
  user: AuthUser;
  detail?: string;
  message?: string;
}

export interface MeResponse extends AuthUser {}

export interface RefreshResponse {
  access: string;
  access_token?: string;
  refresh?: string;
  refresh_token?: string;
}

export interface ResumeRecord {
  id: number | string;
  original_filename?: string;
  resume_url?: string;
  extracted_data?: Record<string, unknown>;
  created_at?: string;
}

export interface ResumeListResponse {
  resumes: ResumeRecord[];
}

export interface LinkedInHistoryRecord {
  id?: number | string;
  image?: string;
  image_url?: string;
  file_path?: string;
  screenshot?: string;
  uploaded_image_url?: string;
  index?: number;
  original_filename?: string;
  filename?: string;
  extracted_data?: Record<string, unknown>;
  extracted?: Record<string, unknown>;
  created_at?: string;
  [key: string]: unknown;
}

export interface LinkedInAnalysisRecord {
  id?: number | string;
  images?: LinkedInHistoryRecord[];
  extracted?: Record<string, unknown>;
  created_at?: string;
  [key: string]: unknown;
}

export interface LinkedInHistoryResponse {
  analyses?: LinkedInAnalysisRecord[];
  images?: LinkedInHistoryRecord[];
  screenshots?: LinkedInHistoryRecord[];
  linkedin?: LinkedInHistoryRecord[];
  results?: LinkedInHistoryRecord[];
  history?: LinkedInHistoryRecord[];
}

export interface ProfileImageFile {
  uri?: string;
  name: string;
  type?: string;
  file?: Blob;
}

export interface ProfileImageResponse {
  status?: string;
  student_id?: string;
  profile_image_url?: string | null;
  message?: string;
}

export interface AriaChatResponse {
  agent?: string;
  student_id?: string;
  reply?: string;
  message?: string;
}

export interface UniversityChatResponse {
  agent?: string;
  university?: string;
  student_id?: string;
  reply?: string;
  pending?: boolean;
  query_id?: string | number | null;
  confidence?: number | null;
  message?: string;
}

export interface UniversityHistoryMessage {
  sender?: 'user' | 'assistant' | string;
  content?: string;
  created_at?: string;
  meta?: {
    pending?: boolean;
    query_id?: string | number | null;
    confidence?: number | null;
    [key: string]: unknown;
  };
}

export interface UniversityChatHistoryResponse {
  count?: number;
  messages?: UniversityHistoryMessage[];
}

export interface GithubConnectResponse {
  authorize_url: string;
}

export interface GithubStatusResponse {
  connected: boolean;
  github_username?: string;
  connected_at?: string;
}

export interface GithubAnalysisResponse {
  status?: string;
  student_id?: string;
  github_username?: string;
  skills_added?: string[];
  github_result?: Record<string, unknown>;
  message?: string;
}

export interface GithubHistoryResponse {
  student_id?: string;
  count?: number;
  analyses?: Array<{
    github_url?: string;
    github_username?: string;
    result?: Record<string, unknown>;
    github_result?: Record<string, unknown>;
    skills_added?: string[];
    created_at?: string;
  }>;
}

export interface AriaConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AriaHistoryMessage {
  sender: 'user' | 'assistant' | string;
  content: string;
  created_at?: string;
  meta?: Record<string, unknown>;
}

export interface AriaHistoryResponse {
  count?: number;
  messages?: AriaHistoryMessage[];
}

async function parseJson<T>(response: Response): Promise<T | undefined> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  return JSON.parse(text) as T;
}

function getApiError(data: ApiErrorBody | undefined, fallback: string) {
  if (!data) {
    return fallback;
  }

  if (data.message || data.detail || data.error) {
    return data.message || data.detail || data.error || fallback;
  }

  const fieldError = Object.entries(data).find(([, value]) => Array.isArray(value) && value.length > 0);
  if (fieldError) {
    const [field, value] = fieldError;
    return `${field}: ${(value as string[]).join(' ')}`;
  }

  if (data.errors && typeof data.errors === 'object') {
    const nestedFieldError = Object.entries(data.errors as Record<string, unknown>).find(
      ([, value]) => Array.isArray(value) && value.length > 0,
    );
    if (nestedFieldError) {
      const [field, value] = nestedFieldError;
      return `${field}: ${(value as string[]).join(' ')}`;
    }
  }

  return fallback;
}

async function requestJson<T>(path: string, init: RequestInit, fallbackError: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const data = await parseJson<T & ApiErrorBody>(response);

  if (!response.ok) {
    throw new Error(getApiError(data, fallbackError));
  }

  return (data ?? {}) as T;
}

export function getAccessToken(data: { access?: string; access_token?: string }) {
  return data.access ?? data.access_token;
}

export function getRefreshToken(data: { refresh?: string; refresh_token?: string }) {
  return data.refresh ?? data.refresh_token;
}

export async function refreshAccessToken(refreshToken: string) {
  const data = await requestJson<RefreshResponse>(
    '/auth/refresh/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    },
    'Unable to refresh session',
  );
  const access = getAccessToken(data);

  if (!access) {
    throw new Error('Unable to refresh session');
  }

  return {
    ...data,
    access,
    refresh: getRefreshToken(data),
  };
}

async function requestWithSession<T>(
  session: AuthSession,
  path: string,
  initForAccessToken: (accessToken: string) => RequestInit,
  fallbackError: string,
): Promise<T> {
  if (!session.access) {
    throw new Error('Missing auth token. Please sign in again.');
  }

  const firstResponse = await fetch(`${API_BASE_URL}${path}`, initForAccessToken(session.access));
  const firstData = await parseJson<T & ApiErrorBody>(firstResponse);

  if (firstResponse.ok) {
    return (firstData ?? {}) as T;
  }

  const refreshToken = session.refresh || (await getSavedRefreshToken());
  if (firstResponse.status !== 401 || !refreshToken) {
    throw new Error(getApiError(firstData, fallbackError));
  }

  try {
    const refreshed = await refreshAccessToken(refreshToken);
    session.access = refreshed.access;
    session.refresh = refreshed.refresh ?? refreshToken;
    await saveAccessToken(refreshed.access);
    if (session.refresh) {
      await saveRefreshToken(session.refresh);
    }
  } catch {
    await clearSavedTokens();
    throw new Error('Your session expired. Please sign in again.');
  }

  const retryResponse = await fetch(`${API_BASE_URL}${path}`, initForAccessToken(session.access));
  const retryData = await parseJson<T & ApiErrorBody>(retryResponse);

  if (!retryResponse.ok) {
    if (retryResponse.status === 401) {
      await clearSavedTokens();
    }
    throw new Error(getApiError(retryData, fallbackError));
  }

  return (retryData ?? {}) as T;
}

async function requestBlobWithSession(
  session: AuthSession,
  path: string,
  initForAccessToken: (accessToken: string) => RequestInit,
  fallbackError: string,
) {
  if (!session.access) {
    throw new Error('Missing auth token. Please sign in again.');
  }

  const firstResponse = await fetch(`${API_BASE_URL}${path}`, initForAccessToken(session.access));
  if (firstResponse.ok) {
    return firstResponse.blob();
  }

  const firstData = await parseJson<ApiErrorBody>(firstResponse);
  const refreshToken = session.refresh || (await getSavedRefreshToken());
  if (firstResponse.status !== 401 || !refreshToken) {
    throw new Error(getApiError(firstData, fallbackError));
  }

  try {
    const refreshed = await refreshAccessToken(refreshToken);
    session.access = refreshed.access;
    session.refresh = refreshed.refresh ?? refreshToken;
    await saveAccessToken(refreshed.access);
    if (session.refresh) {
      await saveRefreshToken(session.refresh);
    }
  } catch {
    await clearSavedTokens();
    throw new Error('Your session expired. Please sign in again.');
  }

  const retryResponse = await fetch(`${API_BASE_URL}${path}`, initForAccessToken(session.access));
  if (!retryResponse.ok) {
    const retryData = await parseJson<ApiErrorBody>(retryResponse);
    if (retryResponse.status === 401) {
      await clearSavedTokens();
    }
    throw new Error(getApiError(retryData, fallbackError));
  }

  return retryResponse.blob();
}

async function requestBlobUrlWithSession(
  session: AuthSession,
  url: string,
  initForAccessToken: (accessToken: string) => RequestInit,
  fallbackError: string,
) {
  if (!session.access) {
    throw new Error('Missing auth token. Please sign in again.');
  }

  const firstResponse = await fetch(url, initForAccessToken(session.access));
  if (firstResponse.ok) {
    return firstResponse.blob();
  }

  const firstData = await parseJson<ApiErrorBody>(firstResponse);
  const refreshToken = session.refresh || (await getSavedRefreshToken());
  if (firstResponse.status !== 401 || !refreshToken) {
    throw new Error(getApiError(firstData, fallbackError));
  }

  try {
    const refreshed = await refreshAccessToken(refreshToken);
    session.access = refreshed.access;
    session.refresh = refreshed.refresh ?? refreshToken;
    await saveAccessToken(refreshed.access);
    if (session.refresh) {
      await saveRefreshToken(session.refresh);
    }
  } catch {
    await clearSavedTokens();
    throw new Error('Your session expired. Please sign in again.');
  }

  const retryResponse = await fetch(url, initForAccessToken(session.access));
  if (!retryResponse.ok) {
    const retryData = await parseJson<ApiErrorBody>(retryResponse);
    if (retryResponse.status === 401) {
      await clearSavedTokens();
    }
    throw new Error(getApiError(retryData, fallbackError));
  }

  return retryResponse.blob();
}

function authHeaders(accessToken: string, contentType = 'application/json') {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(contentType ? { 'Content-Type': contentType } : {}),
  };
}

function normalizeProfileResponse(data: Record<string, unknown>) {
  const nestedProfile = data.profile;
  if (!nestedProfile || typeof nestedProfile !== 'object') {
    return data;
  }

  const profile = nestedProfile as Record<string, unknown>;
  return {
    ...data,
    ...profile,
    profile,
    student_id: profile.student_id ?? data.student_id,
    created_at: profile.created_at ?? data.created_at,
    updated_at: profile.updated_at ?? data.updated_at,
  };
}

export function registerStudent(payload: {
  email: string;
  password: string;
  name: string;
}) {
  return requestJson<RegisterResponse>(
    '/auth/register/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, role: 'student' }),
    },
    'Unable to create account',
  );
}

export function loginStudent(payload: { email: string; password: string }) {
  return requestJson<LoginResponse>(
    '/auth/login/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Unable to sign in',
  );
}

export function enrollTotp(accessToken: string) {
  return requestJson<TotpEnrollResponse>(
    '/auth/totp/enroll/',
    {
      method: 'POST',
      headers: authHeaders(accessToken, ''),
    },
    'Unable to start TOTP enrollment',
  );
}

export function verifyTotpEnrollment(accessToken: string, code: string) {
  return requestJson<TotpVerifyEnrollmentResponse>(
    '/auth/totp/verify-enrollment/',
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ code }),
    },
    'Unable to verify the TOTP code',
  );
}

export function verifyTotpLogin(mfaToken: string, code: string) {
  return requestJson<VerifyTotpLoginResponse>(
    '/auth/verify-totp/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mfa_token: mfaToken, code }),
    },
    'Unable to verify the TOTP code',
  );
}

export function getMe(accessToken: string) {
  return requestJson<MeResponse>(
    '/auth/me/',
    {
      method: 'GET',
      headers: authHeaders(accessToken),
    },
    'Unable to restore session',
  );
}

export function createStudentProfile(session: AuthSession, basicInfo: BasicInfo) {
  const graduationYear = parseGraduationYear(basicInfo.expectedGraduation);

  return requestWithSession<Record<string, unknown>>(
    session,
    '/profile/',
    (accessToken) => ({
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        name: session.user?.name || basicInfo.fullName,
        email: session.user?.email || basicInfo.email,
        phone: basicInfo.phone,
        date_of_birth: basicInfo.dateOfBirth,
        dateOfBirth: basicInfo.dateOfBirth,
        city: basicInfo.city,
        region: basicInfo.region,
        year_in_college: basicInfo.yearInCollege,
        yearInCollege: basicInfo.yearInCollege,
        country: basicInfo.country,
        institution: basicInfo.college,
        major: basicInfo.fieldOfStudy,
        program: basicInfo.degreeLevel,
        graduation_year: graduationYear,
        interests: basicInfo.interests,
        target_degree_or_field: basicInfo.targetDegreeOrField,
      }),
    }),
    'Unable to create student profile',
  ).catch((error: unknown) => {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('exist') || message.includes('already')) {
      return {};
    }

    throw error;
  });
}

export function uploadResume(session: AuthSession, file: SelectedCvFile) {
  const formData = new FormData();
  if (file.file) {
    formData.append('file', file.file, file.name);
  } else if (file.uri) {
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || (file.type === 'pdf' ? 'application/pdf' : 'application/msword'),
    } as unknown as Blob);
  } else {
    throw new Error('Choose a resume file before uploading.');
  }

  return requestWithSession<Record<string, unknown>>(
    session,
    '/profile/resume/',
    (accessToken) => ({
      method: 'POST',
      headers: authHeaders(accessToken, ''),
      body: formData,
    }),
    'Unable to upload resume',
  );
}

export function getGithubConnectUrl(session: AuthSession) {
  return requestWithSession<GithubConnectResponse>(
    session,
    '/auth/github/connect/',
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken),
    }),
    'Unable to start GitHub OAuth',
  );
}

export function getGithubStatus(session: AuthSession) {
  return requestWithSession<GithubStatusResponse>(
    session,
    '/auth/github/status/',
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken),
    }),
    'Unable to check GitHub connection',
  );
}

export function analyzeGithub(session: AuthSession) {
  return requestWithSession<GithubAnalysisResponse>(
    session,
    '/profile/github/',
    (accessToken) => ({
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({}),
    }),
    'Unable to analyze GitHub',
  );
}

export function getGithubHistory(session: AuthSession) {
  if (!session.user?.student_id) {
    throw new Error('Missing student ID. Please sign in again.');
  }

  return requestWithSession<GithubHistoryResponse>(
    session,
    `/profile/${encodeURIComponent(session.user.student_id)}/github-history/`,
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken),
    }),
    'Unable to load GitHub analysis history',
  );
}

export function disconnectGithub(session: AuthSession) {
  return requestWithSession<void>(
    session,
    '/auth/github/disconnect/',
    (accessToken) => ({
      method: 'DELETE',
      headers: authHeaders(accessToken),
    }),
    'Unable to disconnect GitHub',
  );
}

export function uploadLinkedIn(session: AuthSession, screenshots: LinkedInScreenshot[]) {
  const formData = new FormData();
  let imageCount = 0;
  screenshots.forEach((screenshot, index) => {
    if (screenshot.file) {
      formData.append('images', screenshot.file, screenshot.name || `linkedin-${index + 1}.jpg`);
      imageCount += 1;
    } else if (screenshot.uri) {
      formData.append('images', {
        uri: screenshot.uri,
        name: screenshot.name || `linkedin-${index + 1}.jpg`,
        type: screenshot.type || 'image/jpeg',
      } as unknown as Blob);
      imageCount += 1;
    }
  });

  if (imageCount === 0) {
    throw new Error('Choose at least one LinkedIn image before uploading.');
  }

  return requestWithSession<Record<string, unknown>>(
    session,
    '/profile/linkedin/',
    (accessToken) => ({
      method: 'POST',
      headers: authHeaders(accessToken, ''),
      body: formData,
    }),
    'Unable to upload LinkedIn profile',
  );
}

export function updateProfileFields(session: AuthSession, payload: Record<string, unknown>) {
  return requestWithSession<Record<string, unknown>>(
    session,
    '/profile/',
    (accessToken) => ({
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify(payload),
    }),
    'Unable to update profile',
  ).then(normalizeProfileResponse);
}

export function getStudentProfile(session: AuthSession) {
  if (!session.user?.student_id) {
    throw new Error('Missing student ID. Please sign in again.');
  }

  return requestWithSession<Record<string, unknown>>(
    session,
    `/profile/${encodeURIComponent(session.user.student_id)}/`,
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken),
    }),
    'Unable to load student profile',
  ).then(normalizeProfileResponse);
}

export function listStudentResumes(session: AuthSession) {
  if (!session.user?.student_id) {
    throw new Error('Missing student ID. Please sign in again.');
  }

  return requestWithSession<ResumeListResponse>(
    session,
    `/profile/${encodeURIComponent(session.user.student_id)}/resumes/`,
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken),
    }),
    'Unable to load resumes',
  );
}

export function deleteResume(session: AuthSession, resumeId: ResumeRecord['id']) {
  return requestWithSession<Record<string, unknown>>(
    session,
    `/profile/resume/${encodeURIComponent(String(resumeId))}/`,
    (accessToken) => ({
      method: 'DELETE',
      headers: authHeaders(accessToken, ''),
    }),
    'Unable to delete resume',
  );
}

export function listLinkedInHistory(session: AuthSession) {
  if (!session.user?.student_id) {
    throw new Error('Missing student ID. Please sign in again.');
  }

  return requestWithSession<LinkedInHistoryResponse | LinkedInHistoryRecord[]>(
    session,
    `/profile/${encodeURIComponent(session.user.student_id)}/linkedin-history/`,
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken),
    }),
    'Unable to load LinkedIn images',
  );
}

export function uploadProfileImage(session: AuthSession, image: ProfileImageFile) {
  const formData = new FormData();
  if (image.file) {
    formData.append('image', image.file, image.name);
  } else if (image.uri) {
    formData.append('image', {
      uri: image.uri,
      name: image.name,
      type: image.type || 'image/jpeg',
    } as unknown as Blob);
  } else {
    throw new Error('Choose a profile image before uploading.');
  }

  return requestWithSession<ProfileImageResponse>(
    session,
    '/profile/image/',
    (accessToken) => ({
      method: 'POST',
      headers: authHeaders(accessToken, ''),
      body: formData,
    }),
    'Unable to upload profile image',
  );
}

export function getProfileImage(session: AuthSession) {
  if (!session.user?.student_id) {
    throw new Error('Missing student ID. Please sign in again.');
  }

  return requestBlobWithSession(
    session,
    `/profile/${encodeURIComponent(session.user.student_id)}/image/`,
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken, ''),
    }),
    'Unable to load profile image',
  );
}

export function deleteProfileImage(session: AuthSession) {
  if (!session.user?.student_id) {
    throw new Error('Missing student ID. Please sign in again.');
  }

  return requestWithSession<ProfileImageResponse>(
    session,
    `/profile/${encodeURIComponent(session.user.student_id)}/image/`,
    (accessToken) => ({
      method: 'DELETE',
      headers: authHeaders(accessToken, ''),
    }),
    'Unable to delete profile image',
  );
}

export function getLinkedInImage(session: AuthSession, imageUrl: string) {
  return requestBlobUrlWithSession(
    session,
    imageUrl,
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken, ''),
    }),
    'Unable to load LinkedIn image',
  );
}

export function downloadResumeFile(session: AuthSession, resumeId: ResumeRecord['id']) {
  return requestBlobWithSession(
    session,
    `/profile/resume/${encodeURIComponent(String(resumeId))}/`,
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken, ''),
    }),
    'Unable to download resume',
  );
}

export function chatWithAria(
  session: AuthSession,
  message: string,
  conversation: AriaConversationMessage[] = [],
) {
  return requestWithSession<AriaChatResponse>(
    session,
    '/chat/aria/',
    (accessToken) => ({
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        message,
        conversation,
        history: conversation,
        messages: conversation,
      }),
    }),
    'Unable to chat with Aria',
  );
}

export function getAriaHistory(session: AuthSession) {
  return requestWithSession<AriaHistoryResponse>(
    session,
    '/chat/aria/history/',
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken),
    }),
    'Unable to load Aria chat history',
  );
}

export function chatWithUniversityAgent(session: AuthSession, universityId: string, message: string) {
  return requestWithSession<UniversityChatResponse>(
    session,
    `/chat/university/${encodeURIComponent(universityId)}/`,
    (accessToken) => ({
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ message }),
    }),
    'Unable to chat with university agent',
  );
}

export function getUniversityAgentHistory(session: AuthSession, universityId: string) {
  return requestWithSession<UniversityChatHistoryResponse>(
    session,
    `/chat/university/${encodeURIComponent(universityId)}/history/`,
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken),
    }),
    'Unable to load university chat history',
  );
}
