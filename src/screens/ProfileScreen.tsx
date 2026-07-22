import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { SectionLabel } from '../components/SectionLabel';
import { TextField } from '../components/TextField';
import { AuthSession, LinkedInScreenshot } from '../models/onboarding';
import { ConfirmModal } from '../components/ConfirmModal';
import { AriaBotScreen } from './AriaBotScreen';
import {
  API_BASE_URL,
  analyzeGithub,
  deleteProfileImage,
  deleteResume,
  downloadResumeFile,
  getGithubHistory,
  getLinkedInImage,
  getProfileImage,
  GithubAnalysisResponse,
  GithubHistoryResponse,
  LinkedInHistoryRecord,
  listLinkedInHistory,
  listStudentResumes,
  ProfileImageFile,
  ResumeRecord,
  updateProfileFields,
  uploadLinkedIn,
  uploadProfileImage,
} from '../services/api';
import { OnboardingServices } from '../services/onboardingServices';
import { colors, fonts, type } from '../theme/tokens';

type Project = {
  title: string;
  description: string;
  technologies: string[];
};

type GithubRepository = {
  name: string;
  language?: string;
  score?: string;
  reason?: string;
  url?: string;
  stars?: string;
  forks?: string;
  topics: string[];
};

type IntelligenceBlock = {
  academic_score?: number;
  readiness?: string;
  technical_score?: number;
  technical_level?: string;
  research_score?: number;
  behaviour_score?: number;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  evidence?: string[];
};

export type StudentProfile = {
  name: string;
  email: string;
  profile_image_url?: string | null;
  country: string;
  institution: string;
  major: string;
  program: string;
  graduation_year: number | null;
  gpa: number | null;
  gpa_scale: string;
  gpa_text: string;
  gre_quant: number | null;
  gre_verbal: number | null;
  toefl: number | null;
  ielts: number | null;
  english_score?: string;
  english_score_text: string;
  budget: number | null;
  budget_text: string;
  work_months: number | null;
  github: string;
  linkedin_url: string;
  notes: string;
  source: string;
  verified: boolean;
  skills: string[];
  technical_skills: string[];
  soft_skills: string[];
  projects: Project[];
  research: string;
  research_interests: string[];
  publications_count: number;
  career_goals: string[];
  academic_intelligence: IntelligenceBlock;
  technical_intelligence: IntelligenceBlock & {
    skill_matrix?: Record<string, number>;
  };
  research_intelligence: IntelligenceBlock;
  behaviour_intelligence: {
    behaviour_score: number;
    evidence_count: number;
    summary: string;
  };
  overall_profile_score: number;
  overall_profile: {
    overall_score: number;
    profile_level: string;
    recommendation: string;
  };
  profile_completeness: {
    completed: number;
    total: number;
    percentage: number;
    missing: string[];
  };
  disciplines: string[];
  gaps: string[];
  parser_status: string;
  parser_engine: string;
  response_mode: string;
  work_experience_summary: string;
  student_id: string;
  created_at: string;
  updated_at: string;
};

interface ProfileScreenProps {
  profile?: StudentProfile;
  loading?: boolean;
  error?: string;
  session?: AuthSession;
  services?: OnboardingServices;
  onRetry?: () => void;
  onProfileChanged?: (profile?: StudentProfile) => void | Promise<void>;
  onLogout?: () => void;
  onAriaSectionActiveChange?: (active: boolean) => void;
}

type ProfileSection = 'overview' | 'edit' | 'resumes' | 'github' | 'linkedin' | 'aria';

const EXTRACTED_DATA_SECTIONS = [
  {
    title: 'Basic details',
    featured: true,
    keys: [
      'name',
      'email',
      'phone',
      'student_id',
      'country',
      'location',
      'institution',
      'major',
      'program',
      'graduation_year',
    ],
  },
  {
    title: 'Academic details',
    keys: [
      'gpa',
      'gpa_scale',
      'gpa_text',
      'gre_quant',
      'gre_verbal',
      'toefl',
      'ielts',
      'english_score',
      'english_score_text',
      'budget',
      'budget_text',
    ],
  },
  {
    title: 'Skills',
    keys: [
      'skills',
      'technical_skills',
      'soft_skills',
      'tools',
      'technologies',
      'programming_languages',
      'frameworks',
    ],
  },
  {
    title: 'Projects',
    keys: ['projects', 'academic_projects', 'personal_projects'],
  },
  {
    title: 'Experience',
    keys: [
      'work_months',
      'work_experience_summary',
      'experience',
      'internships',
      'certifications',
      'achievements',
    ],
  },
  {
    title: 'Research and goals',
    keys: [
      'research',
      'research_interests',
      'publications_count',
      'career_goals',
      'disciplines',
      'gaps',
      'notes',
    ],
  },
  {
    title: 'Profile intelligence',
    keys: [
      'academic_intelligence',
      'technical_intelligence',
      'research_intelligence',
      'behaviour_intelligence',
      'overall_profile',
      'overall_profile_score',
      'profile_completeness',
    ],
  },
];

const sampleProfile: StudentProfile = {
  name: 'Kalyani Ghatol',
  email: 'ghatolkalyani2005@gmail.com',
  profile_image_url: null,
  country: '',
  institution: 'Shri Sant Gajanan Maharaj College of Engineering, Shegaon',
  major: 'Computer Science and Engineering',
  program: 'MS Computer Science',
  graduation_year: null,
  gpa: 8.8,
  gpa_scale: '10.0',
  gpa_text: '',
  gre_quant: null,
  gre_verbal: null,
  toefl: null,
  ielts: null,
  english_score_text: '',
  budget: null,
  budget_text: '',
  work_months: 7,
  github: '',
  linkedin_url: '',
  notes:
    'Profile from resume. Student is currently pursuing B.E. Graduation year, budget, target disciplines, standardized tests, research experience, and academic achievements should be collected.',
  source: 'resume',
  verified: false,
  skills: [
    'C',
    'Java',
    'JavaScript',
    'Python',
    'HTML',
    'CSS',
    'MERN Stack',
    'React.js',
    'Node.js',
    'Power BI',
    'Docker',
    'Kubernetes',
    'RESTful APIs',
    'OpenCV',
    'Postman',
  ],
  technical_skills: [
    'C',
    'Java',
    'JavaScript',
    'Python',
    'HTML',
    'CSS',
    'MERN Stack',
    'React.js',
    'Node.js',
    'Power Apps',
    'Power BI',
    'Power Automate',
    'Excel',
    'SharePoint',
    'Figma',
    'Canva',
    'Git/GitHub',
    'Docker',
    'Kubernetes',
    'RESTful APIs',
    'OpenCV',
    'Easy OCR',
    'Postman',
    'OOPS',
    'DBMS',
    'Data Structures and Algorithms',
  ],
  soft_skills: [],
  projects: [
    {
      title: 'SmartChat AI',
      description:
        'A full-stack project that answers user questions and displays a fallback message if no answer is found. Tested and validated API responses using Postman.',
      technologies: ['HTML', 'CSS', 'MERN Stack', 'Postman'],
    },
    {
      title: 'Offline OCR System',
      description:
        'Built an offline OCR tool using Easy OCR. Implemented OpenCV image preprocessing to enhance accuracy and managed local document processing.',
      technologies: ['Easy OCR', 'OpenCV', 'JavaScript'],
    },
    {
      title: 'Portfolio',
      description:
        'Developed a full-stack portfolio website to showcase projects, skills, and achievements with a responsive UI.',
      technologies: ['HTML', 'CSS', 'JavaScript', 'React.js', 'Node.js'],
    },
  ],
  research: 'None stated',
  research_interests: [],
  publications_count: 0,
  career_goals: [],
  academic_intelligence: {
    academic_score: 40,
    readiness: 'Needs Improvement',
    strengths: ['Outstanding academic performance'],
    weaknesses: ['GRE score not available.', 'TOEFL score unavailable.'],
    recommendations: [
      'Consider taking the GRE if the target universities recommend it.',
      'Complete an English proficiency test before applying.',
    ],
    evidence: ['GPA of 8.8 demonstrates excellent academic consistency.'],
  },
  technical_intelligence: {
    technical_score: 85,
    technical_level: 'Very Strong',
    skill_matrix: {
      'AI / Machine Learning': 2,
      'Web Development': 4,
      Databases: 0,
      Projects: 3,
      'Industry Experience Months': 7,
    },
    strengths: [
      'Basic AI / Machine Learning knowledge',
      'Strong Web Development skills',
      'Good practical project experience',
      'Strong industry experience',
    ],
    weaknesses: ['No database experience.'],
    recommendations: ['Create and maintain an active GitHub profile.'],
    evidence: [
      '2 AI-related technologies identified.',
      '4 Web Development technologies identified.',
      '3 projects completed.',
      '7.0 months of professional experience.',
    ],
  },
  research_intelligence: {
    research_score: 40,
    strengths: ['Research experience mentioned.'],
    weaknesses: ['Research interests are missing.'],
    recommendations: ['Try to publish or document research-based work.'],
  },
  behaviour_intelligence: {
    behaviour_score: 0,
    evidence_count: 0,
    summary: 'Behaviour analysis is based on stored conversation insights.',
  },
  overall_profile_score: 60,
  overall_profile: {
    overall_score: 60,
    profile_level: 'Moderate',
    recommendation: 'Strengthen the profile before applying to competitive universities.',
  },
  profile_completeness: {
    completed: 8,
    total: 12,
    percentage: 67,
    missing: ['gre_quant', 'toefl', 'budget', 'github'],
  },
  disciplines: [
    'Software Engineering',
    'Full Stack Web Development',
    'Data Engineering and Business Intelligence',
  ],
  gaps: [
    'budget',
    'target_disciplines',
    'graduation_year',
    'standardized_test_scores (GRE/TOEFL/IELTS)',
    'research_experience',
    'academic_awards_and_achievements',
  ],
  parser_status: 'success',
  parser_engine: 'claude',
  response_mode: 'detailed',
  work_experience_summary:
    'Project Intern at ASEA Brown Boveri (ABB) India Ltd.; Full Stack Development Intern at Apexa IQ; Full Stack Development Intern at One Smarter Inc.',
  student_id: 'kalyani_ghatol',
  created_at: '2026-07-09 11:09:32',
  updated_at: '2026-07-09 11:10:12',
};

export function ProfileScreen({
  profile: loadedProfile,
  loading = false,
  error,
  session,
  services,
  onRetry,
  onProfileChanged,
  onLogout,
  onAriaSectionActiveChange,
}: ProfileScreenProps) {
  const profile = useMemo(() => normalizeStudentProfile(loadedProfile ?? sampleProfile), [loadedProfile]);
  const overallProfile = profile.overall_profile ?? {};
  const profileCompleteness = profile.profile_completeness ?? {};
  const academicIntelligence = profile.academic_intelligence ?? {};
  const technicalIntelligence = profile.technical_intelligence ?? {};
  const researchIntelligence = profile.research_intelligence ?? {};
  const skills = profile.technical_skills?.length ? profile.technical_skills : profile.skills;
  const [section, setSection] = useState<ProfileSection>('aria');
  const [menuOpen, setMenuOpen] = useState(false);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [linkedinImages, setLinkedinImages] = useState<LinkedInHistoryRecord[]>([]);
  const [linkedinPreviews, setLinkedinPreviews] = useState<LinkedInScreenshot[]>([]);
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [githubAnalysis, setGithubAnalysis] = useState<GithubAnalysisResponse | undefined>();
  const [githubHistory, setGithubHistory] = useState<GithubHistoryResponse['analyses']>([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState(
    getRenderableMediaUrl(profile.profile_image_url) ?? '',
  );
  const [profileImageLoading, setProfileImageLoading] = useState(false);
  const [resumesLoading, setResumesLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [sectionError, setSectionError] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedin_url ?? '');
  const [profileDraft, setProfileDraft] = useState({
    name: profile.name ?? '',
    email: profile.email ?? '',
    country: profile.country ?? '',
    institution: profile.institution ?? '',
    major: profile.major ?? '',
    program: profile.program ?? '',
    graduation_year: formatDraftValue(profile.graduation_year),
    gpa: formatDraftValue(profile.gpa),
    gpa_scale: profile.gpa_scale ?? '',
    gre_quant: formatDraftValue(profile.gre_quant),
    gre_verbal: formatDraftValue(profile.gre_verbal),
    toefl: formatDraftValue(profile.toefl),
    ielts: formatDraftValue(profile.ielts),
    english_score_text: profile.english_score_text || profile.english_score || '',
    budget: formatDraftValue(profile.budget),
  });

  useEffect(() => {
    onAriaSectionActiveChange?.(section === 'aria');
  }, [onAriaSectionActiveChange, section]);

  useEffect(() => {
    setLinkedinUrl(profile.linkedin_url ?? '');
    setProfileImageUrl(getRenderableMediaUrl(profile.profile_image_url) ?? '');
    setProfileDraft({
      name: profile.name ?? '',
      email: profile.email ?? '',
      country: profile.country ?? '',
      institution: profile.institution ?? '',
      major: profile.major ?? '',
      program: profile.program ?? '',
      graduation_year: formatDraftValue(profile.graduation_year),
      gpa: formatDraftValue(profile.gpa),
      gpa_scale: profile.gpa_scale ?? '',
      gre_quant: formatDraftValue(profile.gre_quant),
      gre_verbal: formatDraftValue(profile.gre_verbal),
      toefl: formatDraftValue(profile.toefl),
      ielts: formatDraftValue(profile.ielts),
      english_score_text: profile.english_score_text || profile.english_score || '',
      budget: formatDraftValue(profile.budget),
    });
  }, [profile]);

  const loadProfileImage = async () => {
    if (!session) {
      return;
    }

    try {
      setProfileImageLoading(true);
      const imageBlob = await getProfileImage(session);
      if (imageBlob.type.includes('application/json')) {
        const data = JSON.parse(await imageBlob.text()) as { profile_image_url?: string | null };

        if (data.profile_image_url) {
          setProfileImageUrl(`${data.profile_image_url}?t=${Date.now()}`);
        }

        return;
      }

      const dataUri = await blobToDataUri(imageBlob);
      setProfileImageUrl(dataUri);
    } catch {
      setProfileImageUrl(getRenderableMediaUrl(profile.profile_image_url) ?? '');
    } finally {
      setProfileImageLoading(false);
    }
  };

  function blobToDataUri(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }

        reject(new Error('Unable to read profile image'));
      };

      reader.onerror = () => reject(new Error('Unable to read profile image'));
      reader.readAsDataURL(blob);
    });
  }

  useEffect(() => {
    loadProfileImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access, session?.user?.student_id, profile.profile_image_url]);

  const loadResumes = async () => {
    if (!session) {
      setSectionError('Please sign in again to manage resumes.');
      return;
    }

    try {
      setSectionError('');
      setResumesLoading(true);
      const data = await listStudentResumes(session);
      setResumes(data.resumes ?? []);
    } catch (resumeError) {
      setSectionError(resumeError instanceof Error ? resumeError.message : 'Unable to load resumes');
    } finally {
      setResumesLoading(false);
    }
  };

  useEffect(() => {
    if (section === 'resumes') {
      loadResumes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, session?.access, session?.user?.student_id]);

  const loadLinkedinImages = async () => {
    if (!session) {
      setSectionError('Please sign in again to view LinkedIn images.');
      return;
    }

    try {
      setSectionError('');
      setLinkedinLoading(true);
      const data = await listLinkedInHistory(session);
      setLinkedinImages(normalizeLinkedinHistory(data));
    } catch (linkedinError) {
      setSectionError(
        linkedinError instanceof Error ? linkedinError.message : 'Unable to load LinkedIn images',
      );
    } finally {
      setLinkedinLoading(false);
    }
  };

  useEffect(() => {
    if (section === 'linkedin') {
      loadLinkedinImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, session?.access, session?.user?.student_id]);

  const loadGithubHistory = async () => {
    if (!session) {
      setSectionError('Please sign in again to view GitHub details.');
      return;
    }

    try {
      setSectionError('');
      setGithubLoading(true);
      const data = await getGithubHistory(session);
      setGithubHistory(data.analyses ?? []);
    } catch (githubError) {
      setSectionError(githubError instanceof Error ? githubError.message : 'Unable to load GitHub details');
    } finally {
      setGithubLoading(false);
    }
  };

  useEffect(() => {
    if (section === 'github') {
      loadGithubHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, session?.access, session?.user?.student_id]);

  const selectSection = (nextSection: ProfileSection) => {
    setSection(nextSection);
    setMenuOpen(false);
    setSectionError('');
  };

  const uploadNewResume = async () => {
    if (!session || !services) {
      setSectionError('Please sign in again to upload a resume.');
      return;
    }

    try {
      setActionLoading(true);
      setSectionError('');
      const file = await services.cv.pickFile();
      await services.cv.upload(session, file);
      await loadResumes();
      await onProfileChanged?.();
    } catch (uploadError) {
      setSectionError(uploadError instanceof Error ? uploadError.message : 'Unable to upload resume');
    } finally {
      setActionLoading(false);
    }
  };

  const downloadResume = async (resume: ResumeRecord) => {
    if (!session) {
      setSectionError('Please sign in again to download a resume.');
      return;
    }

    try {
      setActionLoading(true);
      setSectionError('');
      const fileBlob = await downloadResumeFile(session, resume.id);
      const fileUrl = URL.createObjectURL(fileBlob);
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = resume.original_filename || `resume-${resume.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(fileUrl);
    } catch (downloadError) {
      setSectionError(downloadError instanceof Error ? downloadError.message : 'Unable to download resume');
    } finally {
      setActionLoading(false);
    }
  };

  const removeResume = async (resumeId: ResumeRecord['id']) => {
    if (!session) {
      setSectionError('Please sign in again to delete a resume.');
      return;
    }

    try {
      setActionLoading(true);
      setSectionError('');
      await deleteResume(session, resumeId);
      await loadResumes();
      await onProfileChanged?.();
    } catch (deleteError) {
      setSectionError(deleteError instanceof Error ? deleteError.message : 'Unable to delete resume');
    } finally {
      setActionLoading(false);
    }
  };

  const savePlainUrl = async (field: 'github' | 'linkedin_url', value: string) => {
    if (!session) {
      setSectionError('Please sign in again to update your profile.');
      return;
    }

    try {
      setActionLoading(true);
      setSectionError('');
      await updateProfileFields(session, { [field]: value.trim() });
      await onProfileChanged?.();
    } catch (saveError) {
      setSectionError(saveError instanceof Error ? saveError.message : 'Unable to update profile');
    } finally {
      setActionLoading(false);
    }
  };

  const saveProfileDetails = async () => {
    if (!session) {
      setSectionError('Please sign in again to update your profile.');
      return;
    }

    try {
      setActionLoading(true);
      setSectionError('');
      const updatedProfile = await updateProfileFields(session, {
        name: profileDraft.name.trim(),
        email: profileDraft.email.trim(),
        country: profileDraft.country.trim(),
        institution: profileDraft.institution.trim(),
        major: profileDraft.major.trim(),
        program: profileDraft.program.trim(),
        graduation_year: toOptionalNumber(profileDraft.graduation_year),
        gpa: toOptionalNumber(profileDraft.gpa),
        gpa_scale: profileDraft.gpa_scale.trim(),
        gre_quant: toOptionalNumber(profileDraft.gre_quant),
        gre_verbal: toOptionalNumber(profileDraft.gre_verbal),
        toefl: toOptionalNumber(profileDraft.toefl),
        ielts: toOptionalNumber(profileDraft.ielts),
        english_score_text: profileDraft.english_score_text.trim(),
        english_score: profileDraft.english_score_text.trim(),
        budget: toOptionalNumber(profileDraft.budget),
      });
      await onProfileChanged?.(normalizeStudentProfile(updatedProfile));
      setSection('overview');
    } catch (saveError) {
      setSectionError(saveError instanceof Error ? saveError.message : 'Unable to update profile');
    } finally {
      setActionLoading(false);
    }
  };

  const replaceProfileImage = async () => {
    if (!session || !services) {
      setSectionError('Please sign in again to update your profile image.');
      return;
    }

    try {
      setActionLoading(true);
      setSectionError('');
      const [image] = await services.linkedin.pickScreenshots(0);
      if (!image) {
        throw new Error('Choose a profile image before uploading.');
      }
      const response = await uploadProfileImage(session, toProfileImageFile(image));

      const previewUrl =
        getRenderableMediaUrl(image.uri) ?? getRenderableMediaUrl(response.profile_image_url);

      if (previewUrl) {
        setProfileImageUrl(previewUrl);
      }

      await onProfileChanged?.({
        ...profile,
        profile_image_url: response.profile_image_url ?? profile.profile_image_url,
      });
    } catch (imageError) {
      setSectionError(imageError instanceof Error ? imageError.message : 'Unable to upload profile image');
    } finally {
      setActionLoading(false);
    }
  };

  const removeProfileImage = async () => {
    if (!session) {
      setSectionError('Please sign in again to delete your profile image.');
      return;
    }

    try {
      setActionLoading(true);
      setSectionError('');
      await deleteProfileImage(session);
      setProfileImageUrl('');
      await onProfileChanged?.();
    } catch (imageError) {
      setSectionError(imageError instanceof Error ? imageError.message : 'Unable to delete profile image');
    } finally {
      setActionLoading(false);
    }
  };

  const runGithubAnalysis = async () => {
    if (!session) {
      setSectionError('Please sign in again to update GitHub.');
      return;
    }

    try {
      setActionLoading(true);
      setSectionError('');
      const result = await analyzeGithub(session);
      setGithubAnalysis(result);
      await loadGithubHistory();
      await onProfileChanged?.();
    } catch (githubError) {
      setSectionError(githubError instanceof Error ? githubError.message : 'Unable to analyze GitHub');
    } finally {
      setActionLoading(false);
    }
  };

  const uploadLinkedinImages = async () => {
    if (!session || !services) {
      setSectionError('Please sign in again to upload LinkedIn images.');
      return;
    }

    try {
      setActionLoading(true);
      setSectionError('');
      const screenshots = await services.linkedin.pickScreenshots(0);
      await uploadLinkedIn(session, screenshots);
      setLinkedinPreviews(screenshots);
      await loadLinkedinImages();
      await onProfileChanged?.();
    } catch (linkedinError) {
      setSectionError(
        linkedinError instanceof Error ? linkedinError.message : 'Unable to upload LinkedIn images',
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !loadedProfile) {
    return (
      <ScreenShell>
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.coral} />
          <Text style={styles.loadingText}>Loading your complete profile...</Text>
        </View>
      </ScreenShell>
    );
  }
  if (error && !loadedProfile) {
    return (
      <ScreenShell>
        <ProfileError message={error} onRetry={onRetry} loading={loading} />
      </ScreenShell>
    );
  }

  const confirmLogout = () => {
    setLogoutConfirmVisible(false);
    onLogout?.();
  };

  return (
    <ScreenShell>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile menu"
          onPress={() => setMenuOpen((value) => !value)}
          style={styles.menuButton}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </Pressable>

        {menuOpen ? (
          <></>
        ) : (
          <Text style={styles.topBarTitle}>
            {section === 'overview' ? 'Complete profile' : sectionTitle(section)}
          </Text>
        )}

        {onLogout ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            onPress={() => setLogoutConfirmVisible(true)}
            style={styles.logoutButton}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        ) : null}
      </View>

      <ConfirmModal
        visible={logoutConfirmVisible}
        title="Log out?"
        message="You will need to sign in again to access your profile and agent chat."
        primaryLabel="Logout"
        secondaryLabel="Cancel"
        onPrimary={confirmLogout}
        onSecondary={() => setLogoutConfirmVisible(false)}
        onRequestClose={() => setLogoutConfirmVisible(false)}
      />

      {menuOpen ? (
        <ProfileMenu active={section} onSelect={selectSection} />
      ) : (
        <>
          {error ? <ProfileError message={error} onRetry={onRetry} loading={loading} /> : null}

          {loading ? <ActivityIndicator color={colors.coral} style={styles.inlineLoader} /> : null}

          {section === 'resumes' ? (
            <ResumeManager
              resumes={resumes}
              loading={resumesLoading}
              actionLoading={actionLoading}
              error={sectionError}
              onUpload={uploadNewResume}
              onDownload={downloadResume}
              onDelete={removeResume}
              onRefresh={loadResumes}
            />
          ) : null}

          {section === 'edit' ? (
            <EditProfileForm
              draft={profileDraft}
              imageUrl={profileImageUrl}
              imageLoading={profileImageLoading}
              loading={actionLoading}
              error={sectionError}
              onChange={(field, value) => setProfileDraft((current) => ({ ...current, [field]: value }))}
              onReplaceImage={replaceProfileImage}
              onRemoveImage={removeProfileImage}
              onSave={saveProfileDetails}
            />
          ) : null}

          {section === 'github' ? (
            <View style={styles.form}>
              <SourceEditor
                title="GitHub"
                description={
                  profile.github
                    ? 'Run a fresh analysis on your connected GitHub account.'
                    : 'Connect GitHub with OAuth before running analysis.'
                }
                value=""
                onChange={() => undefined}
                primaryLabel="Save"
                secondaryLabel="Analyze GitHub"
                showUrlField={false}
                showPrimaryAction={false}
                disabled={actionLoading}
                error={sectionError}
                onPrimary={() => undefined}
                onSecondary={runGithubAnalysis}
              />
              <GithubAnalysisDetails
                loading={githubLoading}
                currentAnalysis={githubAnalysis}
                history={githubHistory}
                onRefresh={loadGithubHistory}
              />
            </View>
          ) : null}

          {section === 'linkedin' ? (
            <SourceEditor
              title="LinkedIn"
              description={
                profile.linkedin_url
                  ? 'Update the saved URL or upload screenshots for a fresh analysis.'
                  : 'Upload profile screenshots.'
              }
              value={linkedinUrl}
              onChange={setLinkedinUrl}
              placeholder="https://www.linkedin.com/in/username"
              primaryLabel="Save URL"
              secondaryLabel="Upload images"
              showUrlField={false}
              showPrimaryAction={false}
              disabled={actionLoading}
              error={sectionError}
              onPrimary={() => savePlainUrl('linkedin_url', linkedinUrl)}
              onSecondary={uploadLinkedinImages}
            />
          ) : null}

          {section === 'linkedin' ? (
            <LinkedinImageHistory
              session={session}
              loading={linkedinLoading}
              localPreviews={linkedinPreviews}
              records={linkedinImages}
              onRefresh={loadLinkedinImages}
              actionLoading={actionLoading}
            />
          ) : null}

          {section === 'aria' ? <AriaBotScreen session={session} /> : null}

          {section === 'overview' ? (
            <>
              <View style={styles.profileHero}>
                <View style={styles.header}>
                  <ProfileAvatar
                    name={profile.name || profile.email || ''}
                    imageUrl={profileImageUrl}
                    accessToken={session?.access}
                    loading={profileImageLoading}
                  />
                  <View style={styles.headerText}>
                    <Text style={styles.title}>{profile.name}</Text>
                    <Text style={styles.subhead}>{profile.email}</Text>
                    {/* <View style={styles.statusRow}>
                  <Badge label={profile.verified ? 'Verified' : 'Not verified'} tone={profile.verified ? 'success' : 'warning'} />
                  <Badge label={profile.source} />
                </View> */}
                  </View>
                </View>
              </View>

              {/* <View style={styles.scoreGrid}>
        <MetricCard label="Overall" value={`${profile.overall_profile_score ?? 0}/100`} caption={overallProfile.profile_level ?? 'Not scored'} />
        <MetricCard
          label="Complete"
          value={`${profileCompleteness.percentage ?? 0}%`}
          caption={`${profileCompleteness.completed ?? 0}/${profileCompleteness.total ?? 0} fields`}
        />
        <MetricCard
          label="Technical"
          value={`${technicalIntelligence.technical_score ?? 0}/100`}
          caption={technicalIntelligence.technical_level ?? 'Not scored'}
        />
      </View> */}

              <View style={styles.form}>
                <SectionLabel>Personal information</SectionLabel>
                <InfoCard>
                  <FieldRow label="Institution" value={profile.institution} />
                  <FieldRow label="Branch" value={profile.major} />
                  <FieldRow label="Program" value={profile.program} />
                  <FieldRow label="Country" value={profile.country} />
                  <FieldRow label="Graduation year" value={formatValue(profile.graduation_year)} />
                </InfoCard>

                <SectionLabel>Academic profile</SectionLabel>
                <InfoCard>
                  <FieldRow
                    label="GPA"
                    value={
                      profile.gpa !== null && profile.gpa !== undefined
                        ? `${profile.gpa}/${profile.gpa_scale || 10}`
                        : profile.gpa_text
                    }
                  />
                  <FieldRow label="GRE Quant" value={formatValue(profile.gre_quant)} />
                  <FieldRow label="GRE Verbal" value={formatValue(profile.gre_verbal)} />
                  <FieldRow label="TOEFL" value={formatValue(profile.toefl)} />
                  <FieldRow label="IELTS" value={formatValue(profile.ielts)} />
                  <FieldRow
                    label="English score"
                    value={profile.english_score_text || profile.english_score}
                  />
                  <FieldRow
                    label="Budget"
                    value={
                      profile.budget !== null && profile.budget !== undefined
                        ? `$${profile.budget}`
                        : profile.budget_text
                    }
                  />
                </InfoCard>

                {/* <SectionLabel>Profile intelligence</SectionLabel>
        <IntelligenceCard
          title="Academic readiness"
          score={`${academicIntelligence.academic_score ?? 0}/100`}
          level={academicIntelligence.readiness}
          strengths={academicIntelligence.strengths}
          weaknesses={academicIntelligence.weaknesses}
          recommendations={academicIntelligence.recommendations}
        />
        <IntelligenceCard
          title="Technical level"
          score={`${technicalIntelligence.technical_score ?? 0}/100`}
          level={technicalIntelligence.technical_level}
          strengths={technicalIntelligence.strengths}
          weaknesses={technicalIntelligence.weaknesses}
          recommendations={technicalIntelligence.recommendations}
        />
        <IntelligenceCard
          title="Research readiness"
          score={`${researchIntelligence.research_score ?? 0}/100`}
          strengths={researchIntelligence.strengths}
          weaknesses={researchIntelligence.weaknesses}
          recommendations={researchIntelligence.recommendations}
        /> */}

                <SectionLabel>Skills</SectionLabel>
                <ChipGroup items={skills} />

                <SectionLabel>Target disciplines</SectionLabel>
                <ChipGroup items={profile.disciplines} />

                <SectionLabel>Projects</SectionLabel>
                {(profile.projects ?? []).map((project) => (
                  <ProjectCard key={project.title} project={project} />
                ))}

                <SectionLabel>Experience and research</SectionLabel>
                <InfoCard>
                  <FieldRow
                    label="Work experience"
                    value={
                      profile.work_months !== null && profile.work_months !== undefined
                        ? `${profile.work_months} months`
                        : ''
                    }
                  />
                  <FieldRow label="Experience summary" value={profile.work_experience_summary} />
                  <FieldRow label="Research" value={profile.research} />
                  <FieldRow label="Publications" value={profile.publications_count} />
                  <FieldRow label="GitHub" value={profile.github} />
                  <FieldRow label="LinkedIn" value={profile.linkedin_url} />
                </InfoCard>

                {/* <SectionLabel>Missing information</SectionLabel>
        <ChipGroup items={profileCompleteness.missing ?? profile.gaps} tone="warning" />

        <SectionLabel>Recommendations</SectionLabel>
        <InfoCard>
          <Text style={styles.bodyText}>{formatValue(overallProfile.recommendation)}</Text>
          {(profile.gaps ?? []).map((gap) => (
            <Text key={gap} style={styles.listItem}>
              {'\u2022'} {gap}
            </Text>
          ))}
        </InfoCard> */}

                <SectionLabel>Notes</SectionLabel>
                <InfoCard>
                  <Text style={styles.bodyText}>{profile.notes}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>Created: {profile.created_at}</Text>
                    <Text style={styles.metaText}>Updated: {profile.updated_at}</Text>
                  </View>
                </InfoCard>
              </View>
            </>
          ) : null}
        </>
      )}
    </ScreenShell>
  );
}

function ProfileError({
  message,
  onRetry,
  loading = false,
}: {
  message: string;
  onRetry?: () => void;
  loading?: boolean;
}) {
  return (
    <View style={styles.errorCard}>
      <Text style={styles.errorTitle}>Profile could not be loaded</Text>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <PrimaryButton label="Try again" onPress={onRetry} variant="secondary" loading={loading} />
      ) : null}
    </View>
  );
}

function ProfileAvatar({
  name,
  imageUrl,
  accessToken,
  loading = false,
  large = false,
}: {
  name: string;
  imageUrl?: string;
  accessToken?: string;
  loading?: boolean;
  large?: boolean;
}) {
  const normalizedUrl = getRenderableMediaUrl(imageUrl);
  const imageSource = normalizedUrl
    ? {
        uri: normalizedUrl,
        ...(accessToken && isProtectedProfileImageUrl(normalizedUrl)
          ? { headers: { Authorization: `Bearer ${accessToken}` } }
          : {}),
      }
    : undefined;

  return (
    <View style={[styles.avatar, large && styles.avatarLarge]}>
      {imageSource ? (
        <Image source={imageSource} style={styles.avatarImage} resizeMode="cover" />
      ) : (
        <Text style={styles.avatarText}>{getInitials(name)}</Text>
      )}
      {loading ? (
        <View style={styles.avatarLoading}>
          <ActivityIndicator color={colors.coral} size="small" />
        </View>
      ) : null}
    </View>
  );
}

function normalizeStudentProfile(profile: StudentProfile | Record<string, unknown>): StudentProfile {
  const maybeWrappedProfile = (profile as Record<string, unknown>).profile;
  const wrapper = profile as Record<string, unknown>;
  const rawProfile =
    maybeWrappedProfile && typeof maybeWrappedProfile === 'object'
      ? (maybeWrappedProfile as Record<string, unknown>)
      : wrapper;
  const evidence = getRecord(wrapper.evidence) || getRecord(rawProfile.evidence) || {};
  const resumeEvidence = getRecord(evidence.resume);
  const testScores = getRecord(wrapper.test_scores) || getRecord(rawProfile.test_scores) || {};
  const financials = getRecord(wrapper.financials) || getRecord(rawProfile.financials) || {};
  const workExperience = getRecord(wrapper.work_experience) || getRecord(rawProfile.work_experience) || {};
  const skillsBlock = getRecord(wrapper.skills) || getRecord(rawProfile.skills) || {};
  const researchBlock = getRecord(wrapper.research) || getRecord(rawProfile.research) || {};
  const careerBlock = getRecord(wrapper.career) || getRecord(rawProfile.career) || {};
  const meta = getRecord(wrapper.meta) || getRecord(rawProfile.meta) || {};
  const intelligence = getRecord(wrapper.intelligence) || {};
  const profileScoring = getRecord(wrapper.profile_scoring) || {};
  const githubAssessment =
    getRecord(rawProfile.github_assessment) || getRecord(getRecord(evidence.github)?.result);
  const linkedinProfile =
    getRecord(rawProfile.linkedin_profile) || getRecord(getRecord(evidence.linkedin)?.result);
  const manualProfile = getRecord(evidence.manual_profile_api);
  const publications = getArray(researchBlock.publications) || getArray(rawProfile.publications);
  const skills =
    getStringArray(skillsBlock.all_skills) ||
    getStringArray(rawProfile.skills) ||
    getStringArray(rawProfile.technical_skills) ||
    getStringArray(resumeEvidence?.skills) ||
    getStringArray(linkedinProfile?.skills) ||
    getStringArray(githubAssessment?.frameworks_and_tools) ||
    [];
  const technicalSkills =
    getStringArray(skillsBlock.technical_skills) ||
    getStringArray(rawProfile.technical_skills) ||
    getStringArray(resumeEvidence?.technical_skills) ||
    getStringArray(githubAssessment?.frameworks_and_tools) ||
    [];
  const disciplines =
    getStringArray(careerBlock.target_disciplines) ||
    getStringArray(rawProfile.disciplines) ||
    getStringArray(resumeEvidence?.disciplines) ||
    [];
  const projects =
    getProjectArray(wrapper.projects) ||
    getProjectArray(rawProfile.projects) ||
    getProjectArray(resumeEvidence?.projects) ||
    getProjectArray(linkedinProfile?.projects) ||
    [];

  return {
    ...rawProfile,
    student_id: rawProfile.student_id ?? wrapper.student_id,
    profile_image_url: rawProfile.profile_image_url ?? wrapper.profile_image_url,
    name: rawProfile.name ?? resumeEvidence?.name ?? linkedinProfile?.name ?? manualProfile?.name ?? '',
    email: rawProfile.email ?? resumeEvidence?.email ?? manualProfile?.email ?? '',
    country: rawProfile.country ?? linkedinProfile?.location ?? manualProfile?.country ?? '',
    institution: rawProfile.institution ?? resumeEvidence?.institution ?? manualProfile?.institution ?? '',
    major: rawProfile.major ?? resumeEvidence?.major ?? manualProfile?.major ?? '',
    program: rawProfile.program ?? resumeEvidence?.program ?? '',
    graduation_year:
      rawProfile.graduation_year ?? resumeEvidence?.graduation_year ?? manualProfile?.graduation_year ?? null,
    gpa: rawProfile.gpa ?? resumeEvidence?.gpa ?? manualProfile?.gpa ?? null,
    gpa_scale: rawProfile.gpa_scale ?? resumeEvidence?.gpa_scale ?? manualProfile?.gpa_scale ?? '',
    gpa_text: rawProfile.gpa_text ?? '',
    gre_quant:
      rawProfile.gre_quant ??
      testScores.gre_quant ??
      resumeEvidence?.gre_quant ??
      manualProfile?.gre_quant ??
      null,
    gre_verbal:
      rawProfile.gre_verbal ??
      testScores.gre_verbal ??
      resumeEvidence?.gre_verbal ??
      manualProfile?.gre_verbal ??
      null,
    toefl: rawProfile.toefl ?? testScores.toefl ?? resumeEvidence?.toefl ?? manualProfile?.toefl ?? null,
    ielts: rawProfile.ielts ?? testScores.ielts ?? resumeEvidence?.ielts ?? manualProfile?.ielts ?? null,
    english_score_text: rawProfile.english_score_text ?? testScores.english_score_text ?? '',
    budget: rawProfile.budget ?? financials.budget ?? resumeEvidence?.budget ?? manualProfile?.budget ?? null,
    budget_text: rawProfile.budget_text ?? financials.budget_text ?? '',
    work_months: rawProfile.work_months ?? workExperience.work_months ?? resumeEvidence?.work_months ?? null,
    github:
      rawProfile.github ??
      rawProfile.github_url ??
      manualProfile?.github ??
      getRecord(evidence.github)?.github_url ??
      '',
    linkedin_url: rawProfile.linkedin_url ?? linkedinProfile?.linkedin_url ?? '',
    notes: rawProfile.notes ?? wrapper.resume_notes ?? resumeEvidence?.notes ?? '',
    source: rawProfile.source ?? resumeEvidence?.source ?? '',
    verified: Boolean(rawProfile.verified ?? false),
    skills,
    technical_skills: technicalSkills,
    soft_skills: getStringArray(skillsBlock.soft_skills) || getStringArray(rawProfile.soft_skills) || [],
    projects,
    research: rawProfile.research ?? researchBlock.research ?? resumeEvidence?.research ?? '',
    research_interests:
      getStringArray(researchBlock.research_interests) || getStringArray(rawProfile.research_interests) || [],
    publications_count:
      rawProfile.publications_count ??
      researchBlock.publications_count ??
      publications?.length ??
      resumeEvidence?.publications_count ??
      0,
    career_goals: getStringArray(careerBlock.career_goals) || getStringArray(rawProfile.career_goals) || [],
    academic_intelligence:
      getRecord(intelligence.academic_intelligence) || getRecord(rawProfile.academic_intelligence) || {},
    technical_intelligence:
      getRecord(intelligence.technical_intelligence) || getRecord(rawProfile.technical_intelligence) || {},
    research_intelligence:
      getRecord(intelligence.research_intelligence) || getRecord(rawProfile.research_intelligence) || {},
    behaviour_intelligence:
      getRecord(intelligence.behaviour_intelligence) || getRecord(rawProfile.behaviour_intelligence) || {},
    overall_profile_score: profileScoring.overall_profile_score ?? rawProfile.overall_profile_score ?? 0,
    overall_profile: getRecord(profileScoring.overall_profile) || getRecord(rawProfile.overall_profile) || {},
    profile_completeness:
      getRecord(profileScoring.profile_completeness) || getRecord(rawProfile.profile_completeness) || {},
    disciplines,
    gaps: getStringArray(rawProfile.gaps) || getStringArray(resumeEvidence?.gaps) || [],
    parser_status: rawProfile.parser_status ?? meta.parser_status ?? resumeEvidence?.parser_status ?? '',
    parser_engine: rawProfile.parser_engine ?? meta.parser_engine ?? resumeEvidence?.parser_engine ?? '',
    response_mode: rawProfile.response_mode ?? meta.response_mode ?? '',
    work_experience_summary:
      rawProfile.work_experience_summary ??
      workExperience.summary ??
      resumeEvidence?.work_experience_summary ??
      getExperienceSummary(linkedinProfile?.experience) ??
      '',
    created_at: rawProfile.created_at ?? wrapper.created_at ?? '',
    updated_at: rawProfile.updated_at ?? wrapper.updated_at ?? '',
  } as StudentProfile;
}

function formatDraftValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function getArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function getStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  const items = value.map((item) => String(item)).filter(Boolean);
  return items.length ? items : undefined;
}

function getProjectArray(value: unknown): Project[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  const projects = value
    .map((item) => {
      const record = getRecord(item);
      if (!record) {
        return undefined;
      }

      return {
        title: String(record.title ?? record.name ?? 'Project'),
        description: String(record.description ?? record.summary ?? ''),
        technologies: getStringArray(record.technologies) || getStringArray(record.tools) || [],
      };
    })
    .filter(Boolean) as Project[];

  return projects.length ? projects : undefined;
}

function getExperienceSummary(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  return value
    .map((item) => {
      const record = getRecord(item);
      if (!record) {
        return undefined;
      }

      const title = record.title || record.role;
      const company = record.company;
      const summary = record.summary;
      return [title, company, summary].filter(Boolean).join(' - ');
    })
    .filter(Boolean)
    .join('; ');
}

function sectionTitle(section: ProfileSection) {
  switch (section) {
    case 'overview':
      return 'Complete profile';
    case 'edit':
      return 'Edit profile';
    case 'resumes':
      return 'Resume history';
    case 'github':
      return 'GitHub';
    case 'linkedin':
      return 'LinkedIn';
    case 'aria':
      return 'Chat with Agent';
  }
}

function ProfileMenu({
  active,
  onSelect,
}: {
  active: ProfileSection;
  onSelect: (section: ProfileSection) => void;
}) {
  const items: Array<{ key: ProfileSection; label: string }> = [
    { key: 'aria', label: 'Chat with Agent' },
    { key: 'overview', label: 'Overview' },
    { key: 'edit', label: 'Edit Profile' },
    { key: 'resumes', label: 'Resume update/view' },
    { key: 'github', label: 'GitHub' },
    { key: 'linkedin', label: 'LinkedIn images' },
  ];

  return (
    <View style={styles.sidebar}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityState={{ selected: active === item.key }}
          onPress={() => onSelect(item.key)}
          style={[styles.sidebarItem, active === item.key && styles.sidebarItemActive]}
        >
          <Text style={[styles.sidebarItemText, active === item.key && styles.sidebarItemTextActive]}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function EditProfileForm({
  draft,
  imageUrl,
  imageLoading,
  loading,
  error,
  onChange,
  onReplaceImage,
  onRemoveImage,
  onSave,
}: {
  draft: {
    name: string;
    email: string;
    country: string;
    institution: string;
    major: string;
    program: string;
    graduation_year: string;
    gpa: string;
    gpa_scale: string;
    gre_quant: string;
    gre_verbal: string;
    toefl: string;
    ielts: string;
    english_score_text: string;
    budget: string;
  };
  imageUrl: string;
  imageLoading: boolean;
  loading: boolean;
  error: string;
  onChange: (field: keyof typeof draft, value: string) => void;
  onReplaceImage: () => void;
  onRemoveImage: () => void;
  onSave: () => void;
}) {
  return (
    <View style={styles.form}>
      <View style={styles.resumeIntroCard}>
        <Text style={styles.resumeIntroTitle}>Edit basic details</Text>
        <Text style={styles.sectionIntro}>
          Update the student information shown on your complete profile.
        </Text>
      </View>
      <View style={styles.editBlock}>
        <View style={styles.editBlockHeader}>
          <Text style={styles.editBlockTitle}>Profile image</Text>
          <Text style={styles.editBlockCaption}>
            Upload, replace, or remove the avatar shown on your complete profile
          </Text>
        </View>
        <View style={styles.profileImageEditor}>
          <ProfileAvatar
            name={draft.name || draft.email || ''}
            imageUrl={imageUrl}
            loading={imageLoading}
            large
          />
          <View style={styles.profileImageActions}>
            <PrimaryButton
              label={imageUrl ? 'Replace image' : 'Upload image'}
              onPress={onReplaceImage}
              loading={loading}
              disabled={loading}
            />
            {imageUrl ? (
              <PrimaryButton
                label="Delete image"
                onPress={onRemoveImage}
                variant="secondary"
                loading={loading}
                disabled={loading}
              />
            ) : null}
          </View>
        </View>
      </View>
      <View style={styles.editBlock}>
        <View style={styles.editBlockHeader}>
          <Text style={styles.editBlockTitle}>Basic details</Text>
          <Text style={styles.editBlockCaption}>Personal and program information</Text>
        </View>
        <TextField label="Full name" value={draft.name} onChangeText={(value) => onChange('name', value)} />
        <TextField
          label="Email"
          value={draft.email}
          onChangeText={(value) => onChange('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextField
          label="Country"
          value={draft.country}
          onChangeText={(value) => onChange('country', value)}
        />
        <TextField
          label="Institution"
          value={draft.institution}
          onChangeText={(value) => onChange('institution', value)}
        />
        <TextField label="Branch" value={draft.major} onChangeText={(value) => onChange('major', value)} />
        <TextField
          label="Program"
          value={draft.program}
          onChangeText={(value) => onChange('program', value)}
        />
        <TextField
          label="Graduation year"
          value={draft.graduation_year}
          onChangeText={(value) => onChange('graduation_year', value)}
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.editBlock}>
        <View style={styles.editBlockHeader}>
          <Text style={styles.editBlockTitle}>Academic details</Text>
          <Text style={styles.editBlockCaption}>Scores, GPA, tests, and budget</Text>
        </View>
        <TextField
          label="GPA"
          value={draft.gpa}
          onChangeText={(value) => onChange('gpa', value)}
          keyboardType="decimal-pad"
        />
        <TextField
          label="GPA scale"
          value={draft.gpa_scale}
          onChangeText={(value) => onChange('gpa_scale', value)}
          keyboardType="decimal-pad"
        />
        <TextField
          label="GRE Quant"
          value={draft.gre_quant}
          onChangeText={(value) => onChange('gre_quant', value)}
          keyboardType="number-pad"
        />
        <TextField
          label="GRE Verbal"
          value={draft.gre_verbal}
          onChangeText={(value) => onChange('gre_verbal', value)}
          keyboardType="number-pad"
        />
        <TextField
          label="TOEFL"
          value={draft.toefl}
          onChangeText={(value) => onChange('toefl', value)}
          keyboardType="number-pad"
        />
        <TextField
          label="IELTS"
          value={draft.ielts}
          onChangeText={(value) => onChange('ielts', value)}
          keyboardType="decimal-pad"
        />
        <TextField
          label="English score"
          value={draft.english_score_text}
          onChangeText={(value) => onChange('english_score_text', value)}
        />
        <TextField
          label="Budget"
          value={draft.budget}
          onChangeText={(value) => onChange('budget', value)}
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.editFooter}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton label="Save profile" onPress={onSave} loading={loading} disabled={loading} />
      </View>
    </View>
  );
}

function ResumeManager({
  resumes,
  loading,
  actionLoading,
  error,
  onUpload,
  onDownload,
  onDelete,
  onRefresh,
}: {
  resumes: ResumeRecord[];
  loading: boolean;
  actionLoading: boolean;
  error: string;
  onUpload: () => void;
  onDownload: (resume: ResumeRecord) => void;
  onDelete: (resumeId: ResumeRecord['id']) => void;
  onRefresh: () => void;
}) {
  return (
    <View style={styles.form}>
      <View style={styles.resumeIntroCard}>
        <Text style={styles.resumeIntroTitle}>Resume history</Text>
        <Text style={styles.sectionIntro}>
          Upload a new resume, review previous files, and inspect the parsed profile data from each upload.
        </Text>
      </View>
      <View style={styles.resumeActions}>
        <PrimaryButton
          label="Upload new resume"
          onPress={onUpload}
          disabled={actionLoading}
          loading={actionLoading}
        />
        <PrimaryButton
          label="Refresh resumes"
          onPress={onRefresh}
          variant="secondary"
          disabled={loading || actionLoading}
          loading={loading}
        />
      </View>
      {/* {error ? <Text style={styles.errorText}>{error}</Text> : null} */}
      {loading ? <ActivityIndicator color={colors.coral} /> : null}
      {!loading && resumes.length === 0 ? (
        <Text style={styles.emptyText}>No resumes uploaded yet.</Text>
      ) : null}
      {resumes.map((resume) => (
        <View key={String(resume.id)} style={styles.resumeCard}>
          <View style={styles.resumeHeader}>
            <View style={styles.fileBadge}>
              <Text style={styles.fileBadgeText}>PDF</Text>
            </View>
            <View style={styles.resumeTitleWrap}>
              <Text style={styles.cardTitle}>{resume.original_filename || `Resume ${resume.id}`}</Text>
              <Text style={styles.metaText}>Uploaded {formatDate(resume.created_at)}</Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              disabled={actionLoading}
              onPress={() => onDownload(resume)}
              style={[styles.smallButton, actionLoading && styles.disabledButton]}
            >
              {actionLoading ? (
                <ActivityIndicator color={colors.offWhite} />
              ) : (
                <Text style={styles.smallButtonText}>View</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={actionLoading}
              onPress={() => onDelete(resume.id)}
              style={[styles.smallButton, styles.dangerButton, actionLoading && styles.disabledButton]}
            >
              {actionLoading ? (
                <ActivityIndicator color={colors.error} />
              ) : (
                <Text style={[styles.smallButtonText, styles.dangerButtonText]}>Delete</Text>
              )}
            </Pressable>
          </View>
          <SectionLabel>Extracted data</SectionLabel>
          <ExtractedData data={resume.extracted_data} />
        </View>
      ))}
    </View>
  );
}

function SourceEditor({
  title,
  description,
  value,
  onChange,
  placeholder,
  primaryLabel,
  secondaryLabel,
  showUrlField = true,
  showPrimaryAction = true,
  disabled,
  error,
  onPrimary,
  onSecondary,
}: {
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  primaryLabel: string;
  secondaryLabel: string;
  showUrlField?: boolean;
  showPrimaryAction?: boolean;
  disabled: boolean;
  error: string;
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  return (
    <View style={styles.form}>
      <Text style={styles.sectionIntro}>{description}</Text>
      <InfoCard>
        <Text style={styles.cardTitle}>{title}</Text>
        {showUrlField ? (
          <TextField
            label={`${title} URL`}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            autoCapitalize="none"
            keyboardType="url"
          />
        ) : null}
        {/* {error ? <Text style={styles.errorText}>{error}</Text> : null} */}
        {showPrimaryAction ? (
          <PrimaryButton label={primaryLabel} onPress={onPrimary} disabled={disabled} loading={disabled} />
        ) : null}
        <PrimaryButton
          label={secondaryLabel}
          onPress={onSecondary}
          variant="secondary"
          disabled={disabled}
          loading={disabled}
        />
      </InfoCard>
    </View>
  );
}

function GithubAnalysisDetails({
  loading,
  currentAnalysis,
  history = [],
  onRefresh,
}: {
  loading: boolean;
  currentAnalysis?: GithubAnalysisResponse;
  history?: NonNullable<GithubHistoryResponse['analyses']>;
  onRefresh: () => void;
}) {
  const latestHistory = history[0];
  const result =
    currentAnalysis?.github_result ?? latestHistory?.github_result ?? latestHistory?.result ?? {};
  const resultRecord = getRecord(result) ?? {};
  const username =
    currentAnalysis?.github_username ??
    latestHistory?.github_username ??
    getString(resultRecord.github_username) ??
    getGithubHandleFromUrl(latestHistory?.github_url);
  const skillsAdded =
    currentAnalysis?.skills_added ??
    latestHistory?.skills_added ??
    getStringArray(resultRecord.skills_added) ??
    [];
  const languages =
    getGithubItemLabels(resultRecord.languages) ?? getGithubItemLabels(resultRecord.language_breakdown) ?? [];
  const frameworks =
    getGithubItemLabels(resultRecord.frameworks_and_tools) ??
    getGithubItemLabels(resultRecord.frameworks) ??
    getGithubItemLabels(resultRecord.tools) ??
    [];
  const repositories =
    getGithubItemLabels(
      resultRecord.repositories ??
        resultRecord.top_repositories ??
        resultRecord.projects ??
        resultRecord.notable_projects,
    ) ?? [];
  const strongestRepositories =
    getGithubRepositories(
      resultRecord.strongest_repositories ??
        resultRecord.strongest_repos ??
        resultRecord.strongest_projects ??
        resultRecord.top_repositories,
    ) ?? [];
  const summary =
    getString(resultRecord.summary) ??
    getString(resultRecord.profile_summary) ??
    getString(resultRecord.technical_summary) ??
    getString(resultRecord.assessment);

  return (
    <View style={styles.githubDetails}>
      <View style={styles.linkedinHistoryHeader}>
        <View style={styles.linkedinHistoryTitleWrap}>
          <Text style={styles.cardTitle}>GitHub details</Text>
          <Text style={styles.metaText}>Latest connected-account analysis and history.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onRefresh}
          disabled={loading}
          style={[styles.smallButton, loading && styles.disabledButton]}
        >
          {loading ? (
            <ActivityIndicator color={colors.offWhite} size="small" />
          ) : (
            <Text style={styles.smallButtonText}>Refresh</Text>
          )}
        </Pressable>
      </View>

      {loading && !currentAnalysis && history.length === 0 ? (
        <ActivityIndicator color={colors.coral} />
      ) : null}

      {!loading && !currentAnalysis && history.length === 0 ? (
        <Text style={styles.emptyText}>
          No GitHub analysis found yet. Run Analyze GitHub to fetch details.
        </Text>
      ) : null}

      {currentAnalysis || history.length > 0 ? (
        <InfoCard>
          <FieldRow label="GitHub username" value={username ? `@${username}` : undefined} />
          <FieldRow label="Primary language" value={getString(resultRecord.primary_language)} />
          <FieldRow
            label="Latest run"
            value={latestHistory?.created_at ? formatDate(latestHistory.created_at) : undefined}
          />

          <Text style={styles.extractedSectionTitle}>Languages</Text>
          <ChipGroup items={languages} compact />

          <Text style={styles.extractedSectionTitle}>Frameworks and tools</Text>
          <ChipGroup items={frameworks} compact />

          <GithubRepositoryList repositories={strongestRepositories} />

          <MiniList title="Repositories / projects" items={repositories} />

          {summary ? (
            <View style={styles.githubSummary}>
              <Text style={styles.extractedSectionTitle}>Summary</Text>
              <Text style={styles.bodyText}>{summary}</Text>
            </View>
          ) : null}
        </InfoCard>
      ) : null}
    </View>
  );
}

function GithubRepositoryList({ repositories }: { repositories: GithubRepository[] }) {
  if (!repositories.length) {
    return null;
  }

  return (
    <View style={styles.githubRepoSection}>
      <Text style={styles.extractedSectionTitle}>Strongest repositories</Text>
      {repositories.map((repository, index) => (
        <GithubRepositoryCard
          key={`${repository.name}-${repository.url ?? index}`}
          repository={repository}
          rank={index + 1}
        />
      ))}
    </View>
  );
}

function GithubRepositoryCard({ repository, rank }: { repository: GithubRepository; rank: number }) {
  return (
    <View style={styles.githubRepoCard}>
      <View style={styles.githubRepoHeader}>
        <View style={styles.githubRepoRank}>
          <Text style={styles.githubRepoRankText}>{rank}</Text>
        </View>
        <View style={styles.githubRepoTitleWrap}>
          <Text style={styles.githubRepoName}>{repository.name}</Text>
          {repository.url ? <Text style={styles.githubRepoUrl}>{repository.url}</Text> : null}
        </View>
      </View>

      <View style={styles.githubRepoMetaRow}>
        {repository.language ? <Text style={styles.githubRepoPill}>{repository.language}</Text> : null}
        {repository.score ? <Text style={styles.githubRepoPill}>{repository.score}</Text> : null}
        {repository.stars ? <Text style={styles.githubRepoPill}>{repository.stars}</Text> : null}
        {repository.forks ? <Text style={styles.githubRepoPill}>{repository.forks}</Text> : null}
      </View>

      {repository.reason ? <Text style={styles.githubRepoReason}>{repository.reason}</Text> : null}
      {repository.topics.length > 0 ? <ChipGroup items={repository.topics} compact /> : null}
    </View>
  );
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function getGithubHandleFromUrl(value: unknown) {
  const url = getString(value);
  if (!url) {
    return undefined;
  }

  return url.replace(/\/$/, '').split('/').filter(Boolean).pop();
}

function getGithubRepositories(value: unknown): GithubRepository[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const repositories = value
    .map((item) => {
      if (typeof item === 'string') {
        return {
          name: item,
          topics: [],
        };
      }

      const record = getRecord(item);
      if (!record) {
        return undefined;
      }

      const name =
        getString(record.name) ??
        getString(record.repository) ??
        getString(record.repo) ??
        getString(record.title) ??
        getString(record.full_name);

      if (!name) {
        return undefined;
      }

      const score =
        typeof record.score === 'number'
          ? `Score ${record.score}`
          : typeof record.strength_score === 'number'
            ? `Score ${record.strength_score}`
            : typeof record.percent === 'number'
              ? `${record.percent}%`
              : undefined;

      const stars =
        typeof record.stars === 'number'
          ? `${record.stars} stars`
          : typeof record.stargazers_count === 'number'
            ? `${record.stargazers_count} stars`
            : undefined;
      const forks =
        typeof record.forks === 'number'
          ? `${record.forks} forks`
          : typeof record.forks_count === 'number'
            ? `${record.forks_count} forks`
            : undefined;

      return {
        name,
        language: getString(record.language) ?? getString(record.primary_language),
        score,
        reason:
          getString(record.reason) ??
          getString(record.why) ??
          getString(record.strength) ??
          getString(record.description) ??
          getString(record.summary),
        url: getString(record.url) ?? getString(record.html_url) ?? getString(record.github_url),
        stars,
        forks,
        topics:
          getStringArray(record.topics) ??
          getStringArray(record.technologies) ??
          getStringArray(record.frameworks_and_tools) ??
          [],
      };
    })
    .filter(Boolean) as GithubRepository[];

  return repositories.length ? repositories : undefined;
}

function getGithubItemLabels(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const labels = value
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      const record = getRecord(item);
      if (!record) {
        return '';
      }

      const name =
        getString(record.name) ??
        getString(record.repository) ??
        getString(record.repo) ??
        getString(record.title) ??
        getString(record.package);
      const percent =
        typeof record.percent === 'number'
          ? `${record.percent}%`
          : typeof record.percentage === 'number'
            ? `${record.percentage}%`
            : undefined;
      const level = getString(record.level);
      const score =
        typeof record.score === 'number'
          ? `Score ${record.score}`
          : typeof record.strength_score === 'number'
            ? `Score ${record.strength_score}`
            : undefined;
      const language = getString(record.language) ?? getString(record.primary_language);
      const reason = getString(record.reason) ?? getString(record.why) ?? getString(record.strength);
      const description = getString(record.description) ?? getString(record.summary) ?? reason;

      if (percent || level) {
        return [name, percent, level].filter(Boolean).join(' • ');
      }

      return [name, language, score, description].filter(Boolean).join(' - ');
    })
    .filter(Boolean);

  return labels.length ? labels : undefined;
}

function LinkedinImageHistory({
  session,
  loading,
  localPreviews,
  records,
  actionLoading,
  onRefresh,
}: {
  session?: AuthSession;
  loading: boolean;
  localPreviews: LinkedInScreenshot[];
  records: LinkedInHistoryRecord[];
  actionLoading: boolean;
  onRefresh: () => void;
}) {
  const [authorizedImageUris, setAuthorizedImageUris] = useState<Record<string, string>>({});
  const savedImages = records
    .map((record, index) => ({
      id: String(
        record.id ??
          record.image_url ??
          record.image ??
          record.file_path ??
          record.filename ??
          `linkedin-${index}`,
      ),
      title: String(record.original_filename ?? record.filename ?? 'LinkedIn screenshot'),
      uri: getLinkedinRecordImageUri(record),
      createdAt: typeof record.created_at === 'string' ? record.created_at : undefined,
    }))
    .filter((record) => Boolean(record.uri));

  useEffect(() => {
    let cancelled = false;
    let objectUrls: string[] = [];

    const loadAuthorizedImages = async () => {
      if (!session || typeof URL === 'undefined') {
        setAuthorizedImageUris({});
        return;
      }

      const protectedImages = savedImages.filter((image) =>
        image.uri ? isProtectedLinkedinImageUrl(image.uri) : false,
      );
      if (protectedImages.length === 0) {
        setAuthorizedImageUris({});
        return;
      }

      const entries = await Promise.all(
        protectedImages.map(async (image) => {
          try {
            const blob = await getLinkedInImage(session, image.uri ?? '');
            const objectUrl = URL.createObjectURL(blob);
            objectUrls = [...objectUrls, objectUrl];
            return [image.id, objectUrl] as const;
          } catch {
            return [image.id, ''] as const;
          }
        }),
      );

      if (cancelled) {
        objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
        return;
      }

      setAuthorizedImageUris(Object.fromEntries(entries.filter(([, uri]) => Boolean(uri))));
    };

    loadAuthorizedImages();

    return () => {
      cancelled = true;
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, session?.access, session?.user?.student_id]);

  return (
    <View style={styles.linkedinHistory}>
      <View style={styles.linkedinHistoryHeader}>
        <View style={styles.linkedinHistoryTitleWrap}>
          <Text style={styles.cardTitle}>Uploaded screenshots</Text>
          <Text style={styles.metaText}>Review the LinkedIn images used for profile analysis.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onRefresh}
          disabled={loading || actionLoading}
          style={[styles.smallButton, (loading || actionLoading) && styles.disabledButton]}
        >
          {loading ? (
            <ActivityIndicator color={colors.offWhite} size="small" />
          ) : (
            <Text style={styles.smallButtonText}>Refresh</Text>
          )}
        </Pressable>
      </View>

      {localPreviews.length > 0 ? (
        <View style={styles.linkedinPreviewBlock}>
          <Text style={styles.extractedSectionTitle}>Just uploaded</Text>
          <View style={styles.linkedinGrid}>
            {localPreviews.map((preview) => (
              <LinkedinImageCard
                key={preview.id}
                title={preview.label || preview.name || 'Selected image'}
                uri={preview.uri}
              />
            ))}
          </View>
        </View>
      ) : null}

      {savedImages.length > 0 ? (
        <View style={styles.linkedinPreviewBlock}>
          <Text style={styles.extractedSectionTitle}>Saved images</Text>
          <View style={styles.linkedinGrid}>
            {savedImages.map((image) => (
              <LinkedinImageCard
                key={image.id}
                title={image.title}
                uri={
                  image.uri && isProtectedLinkedinImageUrl(image.uri)
                    ? Platform.OS === 'web'
                      ? authorizedImageUris[image.id]
                      : image.uri
                    : image.uri
                }
                accessToken={
                  image.uri && isProtectedLinkedinImageUrl(image.uri) ? session?.access : undefined
                }
                caption={image.createdAt ? `Uploaded ${formatDate(image.createdAt)}` : undefined}
              />
            ))}
          </View>
        </View>
      ) : null}

      {!loading && localPreviews.length === 0 && savedImages.length === 0 ? (
        <Text style={styles.emptyText}>No uploaded LinkedIn images found yet.</Text>
      ) : null}
    </View>
  );
}

function LinkedinImageCard({
  title,
  uri,
  caption,
  accessToken,
}: {
  title: string;
  uri?: string;
  caption?: string;
  accessToken?: string;
}) {
  return (
    <View style={styles.linkedinImageCard}>
      {uri ? (
        <Image
          source={{
            uri,
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          }}
          style={styles.linkedinImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.linkedinImagePlaceholder} />
      )}
      <Text numberOfLines={2} style={styles.linkedinImageTitle}>
        {title}
      </Text>
      {caption ? <Text style={styles.metaText}>{caption}</Text> : null}
    </View>
  );
}

function ExtractedData({ data }: { data?: Record<string, unknown> }) {
  if (!data || Object.keys(data).length === 0) {
    return <Text style={styles.emptyText}>No extracted data available.</Text>;
  }

  const usedKeys = new Set<string>();
  const sections = EXTRACTED_DATA_SECTIONS.map((section) => {
    const entries = section.keys
      .filter((key) => hasExtractedValue(data[key]))
      .map((key) => {
        usedKeys.add(key);
        return [key, data[key]] as [string, unknown];
      });

    return { ...section, entries };
  }).filter((section) => section.entries.length > 0);

  const remainingEntries = Object.entries(data).filter(
    ([key, value]) => !usedKeys.has(key) && hasExtractedValue(value),
  );

  return (
    <View style={styles.extractedList}>
      {sections.map((section) => (
        <ExtractedGroup
          key={section.title}
          title={section.title}
          entries={section.entries}
          featured={section.featured}
        />
      ))}

      {remainingEntries.length > 0 ? (
        <ExtractedGroup title="Additional details" entries={remainingEntries} />
      ) : null}
    </View>
  );
}

function ExtractedGroup({
  title,
  entries,
  featured = false,
}: {
  title: string;
  entries: [string, unknown][];
  featured?: boolean;
}) {
  return (
    <View style={[styles.extractedGroup, featured && styles.extractedGroupFeatured]}>
      <Text style={styles.extractedGroupTitle}>{title}</Text>
      <View style={featured ? styles.extractedSummary : styles.extractedGroupBody}>
        {entries.map(([key, value]) =>
          featured ? (
            <View
              key={key}
              style={[
                styles.extractedSummaryItem,
                shouldUseFullWidthSummaryItem(key, value) && styles.extractedSummaryItemWide,
              ]}
            >
              <Text style={styles.extractedLabel}>{humanizeKey(key)}</Text>
              <Text style={styles.extractedValue}>{formatExtractedValue(value)}</Text>
            </View>
          ) : (
            <ExtractedField key={key} label={humanizeKey(key)} value={value} />
          ),
        )}
      </View>
    </View>
  );
}

function ExtractedField({ label, value }: { label: string; value: unknown }) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return null;
    }

    if (value.every((item) => typeof item === 'string' || typeof item === 'number')) {
      return (
        <View style={styles.extractedSection}>
          <Text style={styles.extractedSectionTitle}>{label}</Text>
          <View style={styles.extractedChipWrap}>
            {value.map((item, index) => (
              <View key={`${String(item)}-${index}`} style={styles.extractedChip}>
                <Text style={styles.extractedChipText}>{String(item)}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.extractedSection}>
        <Text style={styles.extractedSectionTitle}>{label}</Text>
        {value.map((item, index) => (
          <View key={`${label}-${index}`} style={styles.extractedMiniCard}>
            {typeof item === 'object' && item !== null ? (
              <ObjectExtractedRows value={item as Record<string, unknown>} />
            ) : (
              <Text style={styles.extractedMiniText}>{formatExtractedValue(item)}</Text>
            )}
          </View>
        ))}
      </View>
    );
  }

  if (typeof value === 'object' && value !== null) {
    return (
      <View style={styles.extractedSection}>
        <Text style={styles.extractedSectionTitle}>{label}</Text>
        <View style={styles.extractedMiniCard}>
          <ObjectExtractedRows value={value as Record<string, unknown>} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.extractedSection}>
      <Text style={styles.extractedSectionTitle}>{label}</Text>
      <Text style={styles.extractedParagraph}>{formatExtractedValue(value)}</Text>
    </View>
  );
}

function ObjectExtractedRows({ value }: { value: Record<string, unknown> }) {
  return (
    <>
      {Object.entries(value)
        .filter(([, nestedValue]) => hasExtractedValue(nestedValue))
        .map(([nestedKey, nestedValue]) => (
          <View key={nestedKey} style={styles.extractedNestedRow}>
            <Text style={styles.extractedLabel}>{humanizeKey(nestedKey)}</Text>
            <Text style={styles.extractedMiniText}>{formatExtractedValue(nestedValue)}</Text>
          </View>
        ))}
    </>
  );
}

function MetricCard({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricCaption}>{formatValue(caption)}</Text>
    </View>
  );
}

function IntelligenceCard({
  title,
  score,
  level,
  strengths = [],
  weaknesses = [],
  recommendations = [],
}: {
  title: string;
  score: string;
  level?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
}) {
  return (
    <InfoCard>
      <View style={styles.intelligenceHeader}>
        <View>
          <Text style={styles.cardTitle}>{title}</Text>
          {level ? <Text style={styles.cardCaption}>{level}</Text> : null}
        </View>
        <Text style={styles.scoreText}>{score}</Text>
      </View>
      <MiniList title="Strengths" items={strengths} />
      <MiniList title="Weaknesses" items={weaknesses} />
      <MiniList title="Recommendations" items={recommendations} />
    </InfoCard>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <InfoCard>
      <Text style={styles.cardTitle}>{project.title}</Text>
      <Text style={styles.bodyText}>{project.description}</Text>
      <ChipGroup items={project.technologies} compact />
    </InfoCard>
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function FieldRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{formatValue(value)}</Text>
    </View>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <View style={styles.miniList}>
      <Text style={styles.miniListTitle}>{title}</Text>
      {items.map((item) => (
        <Text key={item} style={styles.listItem}>
          {'\u2022'} {item}
        </Text>
      ))}
    </View>
  );
}

function ChipGroup({
  items = [],
  tone = 'default',
  compact = false,
}: {
  items?: string[];
  tone?: 'default' | 'warning';
  compact?: boolean;
}) {
  if (!items.length) {
    return <Text style={styles.emptyText}>Not provided</Text>;
  }

  return (
    <View style={[styles.chipWrap, compact && styles.compactChipWrap]}>
      {items.map((item) => (
        <View key={item} style={[styles.chip, tone === 'warning' && styles.warningChip]}>
          <Text style={[styles.chipText, tone === 'warning' && styles.warningChipText]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function Badge({ label, tone = 'default' }: { label: string; tone?: 'default' | 'success' | 'warning' }) {
  return (
    <View
      style={[
        styles.badge,
        tone === 'success' && styles.successBadge,
        tone === 'warning' && styles.warningBadge,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          tone === 'success' && styles.successBadgeText,
          tone === 'warning' && styles.warningBadgeText,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return 'Not provided';
  }

  return String(value);
}

function formatDate(value: string | undefined) {
  if (!value) {
    return 'Not provided';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeLinkedinHistory(data: unknown): LinkedInHistoryRecord[] {
  if (Array.isArray(data)) {
    return data.filter(isLinkedinHistoryRecord);
  }

  if (!data || typeof data !== 'object') {
    return [];
  }

  const record = data as Record<string, unknown>;
  const analyses = Array.isArray(record.analyses) ? record.analyses : [];
  if (analyses.length > 0) {
    return analyses.flatMap((analysis, analysisIndex) => {
      if (!analysis || typeof analysis !== 'object') {
        return [];
      }

      const analysisRecord = analysis as Record<string, unknown>;
      const images = Array.isArray(analysisRecord.images) ? analysisRecord.images : [];
      return images.filter(isLinkedinHistoryRecord).map((image, imageIndex) => ({
        ...image,
        id: `${String(analysisRecord.id ?? analysisIndex)}-${String(image.index ?? imageIndex)}`,
        original_filename:
          image.original_filename ??
          image.filename ??
          `Analysis #${String(analysisRecord.id ?? analysisIndex + 1)} image ${imageIndex + 1}`,
        extracted_data:
          image.extracted_data ??
          (typeof analysisRecord.extracted === 'object' && analysisRecord.extracted
            ? (analysisRecord.extracted as Record<string, unknown>)
            : undefined),
        created_at:
          typeof analysisRecord.created_at === 'string' ? analysisRecord.created_at : image.created_at,
        analysis_id: analysisRecord.id,
      }));
    });
  }

  const possibleLists = [record.images, record.screenshots, record.linkedin, record.results, record.history];
  const list = possibleLists.find(Array.isArray);
  return Array.isArray(list) ? list.filter(isLinkedinHistoryRecord) : [];
}

function isLinkedinHistoryRecord(value: unknown): value is LinkedInHistoryRecord {
  return Boolean(value && typeof value === 'object');
}

function shouldUseFullWidthSummaryItem(key: string, value: unknown) {
  const textValue = formatExtractedValue(value);
  return key === 'institution' || key === 'email' || textValue.length > 34;
}

function getLinkedinRecordImageUri(record: LinkedInHistoryRecord) {
  const rawValue =
    record.uploaded_image_url ?? record.image_url ?? record.image ?? record.file_path ?? record.screenshot;
  if (typeof rawValue !== 'string' || rawValue.length === 0) {
    return undefined;
  }

  return normalizeMediaUrl(rawValue);
}

function normalizeMediaUrl(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  if (/^https?:\/\//i.test(value) || value.startsWith('blob:') || value.startsWith('data:')) {
    return value;
  }

  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${apiOrigin}${value.startsWith('/') ? value : `/${value}`}`;
}

function getRenderableMediaUrl(value: string | null | undefined) {
  return normalizeMediaUrl(value);
}

function isProtectedProfileImageUrl(value: string) {
  return /\/api\/profile\/[^/]+\/image\/?(?:\?.*)?$/i.test(value);
}

function isProtectedLinkedinImageUrl(value: string) {
  return /\/api\/profile\/linkedin\/[^/]+\/images\/[^/]+\/?$/i.test(value);
}

function toProfileImageFile(image: LinkedInScreenshot): ProfileImageFile {
  return {
    uri: image.uri,
    name: image.name || image.label || 'profile-image.jpg',
    type: image.type || 'image/jpeg',
    file: image.file,
  };
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatExtractedValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'Not provided';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'Not provided';
    }

    return value
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          return JSON.stringify(item);
        }

        return String(item);
      })
      .join(', ');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const title = record.title || record.name;
    const description = record.description || record.why || record.summary;
    if (title && description) {
      return `${String(title)}: ${String(description)}`;
    }
    if (title) {
      return String(title);
    }

    return Object.entries(record)
      .map(([key, item]) => `${humanizeKey(key)}: ${formatExtractedValue(item)}`)
      .join('\n');
  }

  return String(value);
}

function hasExtractedValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(hasExtractedValue);
  }

  return true;
}

function humanizeKey(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

const styles = StyleSheet.create({
  title: {
    ...type.title,
    fontSize: 28,
    lineHeight: 32,
  },
  subhead: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 6,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  menuButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
    marginTop: 24,
  },
  menuIcon: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
  },
  topBarTitle: {
    color: colors.offWhite,
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 17,
    marginTop: 18,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,176,157,0.10)',
    borderColor: 'rgba(255,176,157,0.34)',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 10,
    marginTop: 24,
  },
  logoutText: {
    color: colors.error,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  sidebar: {
    backgroundColor: colors.panelInk,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
    padding: 10,
  },
  sidebarItem: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sidebarItemActive: {
    backgroundColor: 'rgba(255,107,74,0.16)',
  },
  sidebarItemText: {
    color: colors.textSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  sidebarItemTextActive: {
    color: colors.coral,
  },
  sectionIntro: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  resumeIntroCard: {
    backgroundColor: 'rgba(91,141,239,0.10)',
    borderColor: 'rgba(91,141,239,0.22)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  resumeIntroTitle: {
    color: colors.offWhite,
    fontFamily: fonts.heading,
    fontSize: 22,
    lineHeight: 27,
  },
  resumeActions: {
    gap: 10,
  },
  editBlock: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.11)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 13,
    padding: 15,
  },
  editBlockHeader: {
    backgroundColor: 'rgba(91,141,239,0.10)',
    borderColor: 'rgba(91,141,239,0.18)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    marginBottom: 2,
    padding: 12,
  },
  editBlockTitle: {
    color: colors.offWhite,
    fontFamily: fonts.heading,
    fontSize: 18,
    lineHeight: 23,
  },
  editBlockCaption: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  editFooter: {
    gap: 10,
    paddingTop: 174,
  },
  loadingState: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  inlineLoader: {
    marginBottom: 12,
  },
  errorCard: {
    backgroundColor: 'rgba(255,176,157,0.10)',
    borderColor: 'rgba(255,176,157,0.35)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginBottom: 16,
    padding: 14,
  },
  errorTitle: {
    color: colors.error,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  errorText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  profileHero: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#E9F0FF',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 56,
  },
  avatarLarge: {
    borderRadius: 42,
    height: 84,
    width: 84,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  avatarLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(9,10,27,0.42)',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#3156A3',
    fontFamily: fonts.heading,
    fontSize: 18,
  },
  headerText: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  scoreGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 22,
  },
  metricCard: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.11)',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 88,
    padding: 11,
  },
  metricLabel: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  metricValue: {
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 22,
    lineHeight: 26,
    marginTop: 4,
  },
  metricCaption: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  form: {
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  profileImageEditor: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  profileImageActions: {
    flex: 1,
    gap: 10,
  },
  smallButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(214, 6, 6, 0.14)',
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 56,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  smallButtonText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  dangerButton: {
    borderColor: 'rgba(255,176,157,0.45)',
    backgroundColor: 'rgba(255,176,157,0.08)',
  },
  dangerButtonText: {
    color: colors.error,
  },
  disabledButton: {
    opacity: 0.45,
  },
  githubDetails: {
    gap: 12,
  },
  githubSummary: {
    gap: 6,
    marginTop: 4,
  },
  githubRepoSection: {
    gap: 10,
  },
  githubRepoCard: {
    backgroundColor: 'rgba(91,141,239,0.10)',
    borderColor: 'rgba(91,141,239,0.24)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  githubRepoHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  githubRepoRank: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  githubRepoRankText: {
    color: colors.ink,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  githubRepoTitleWrap: {
    flex: 1,
    gap: 3,
  },
  githubRepoName: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 20,
  },
  githubRepoUrl: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  githubRepoMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  githubRepoPill: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  githubRepoReason: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.11)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 15,
  },
  resumeCard: {
    backgroundColor: 'rgba(255,255,255,0.052)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 15,
  },
  resumeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  fileBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,74,0.15)',
    borderColor: 'rgba(255,107,74,0.34)',
    borderRadius: 8,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  fileBadgeText: {
    color: colors.coral,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  resumeTitleWrap: {
    flex: 1,
    gap: 3,
  },
  fieldRow: {
    gap: 5,
  },
  fieldLabel: {
    color: '#A6A7C2',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  fieldValue: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  intelligenceHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 17,
    lineHeight: 23,
    marginBottom: 24,
  },
  cardCaption: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  scoreText: {
    color: '#3156A3',
    fontFamily: fonts.heading,
    fontSize: 16,
  },
  bodyText: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  miniList: {
    gap: 4,
  },
  miniListTitle: {
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 13,
  },
  listItem: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactChipWrap: {
    marginTop: 2,
  },
  chip: {
    backgroundColor: '#21498b',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipText: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  warningChip: {
    backgroundColor: '#FFF7E6',
    borderColor: '#F3C877',
  },
  warningChipText: {
    color: '#8A5A00',
  },
  emptyText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  linkedinHistory: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.11)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    marginTop: 14,
    padding: 14,
  },
  linkedinHistoryHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  linkedinHistoryTitleWrap: {
    flex: 1,
  },
  linkedinPreviewBlock: {
    gap: 9,
  },
  linkedinGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  linkedinImageCard: {
    backgroundColor: 'rgba(11,12,29,0.38)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 7,
    overflow: 'hidden',
    padding: 8,
    width: '47%',
  },
  linkedinImage: {
    aspectRatio: 0.78,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 7,
    width: '100%',
  },
  linkedinImagePlaceholder: {
    aspectRatio: 0.78,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 7,
    width: '100%',
  },
  linkedinImageTitle: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 17,
  },
  extractedList: {
    gap: 12,
  },
  extractedTitle: {
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 17,
    lineHeight: 22,
  },
  extractedSubtitle: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  extractedGroup: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  extractedGroupFeatured: {
    backgroundColor: 'rgba(91,141,239,0.08)',
    borderColor: 'rgba(91,141,239,0.18)',
  },
  extractedGroupTitle: {
    color: colors.offWhite,
    fontFamily: fonts.heading,
    fontSize: 16,
    lineHeight: 20,
  },
  extractedGroupBody: {
    gap: 12,
  },
  extractedSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  extractedSummaryItem: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
    maxWidth: '100%',
    padding: 10,
    width: '47%',
  },
  extractedSummaryItemWide: {
    width: '100%',
  },
  extractedLabel: {
    color: '#A6A7C2',
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  extractedValue: {
    color: colors.offWhite,
    flexShrink: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    width: '100%',
  },
  extractedSection: {
    gap: 9,
  },
  extractedSectionTitle: {
    color: '#C7C9E0',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  extractedParagraph: {
    color: colors.offWhite,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  extractedChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  extractedChip: {
    backgroundColor: 'rgba(91,141,239,0.18)',
    borderColor: 'rgba(91,141,239,0.34)',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  extractedChipText: {
    color: '#DCE7FF',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  extractedMiniCard: {
    backgroundColor: 'rgba(11,12,29,0.34)',
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 11,
  },
  extractedMiniText: {
    color: colors.offWhite,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
  extractedNestedRow: {
    borderBottomColor: 'rgba(255,255,255,0.06)',
    borderBottomWidth: 1,
    gap: 5,
    paddingBottom: 9,
  },
  badge: {
    backgroundColor: '#284a82',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  badgeText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  successBadge: {
    backgroundColor: '#EAF7EF',
  },
  successBadgeText: {
    color: '#237A3B',
  },
  warningBadge: {
    backgroundColor: '#FFF7E6',
  },
  warningBadgeText: {
    color: '#8A5A00',
  },
  metaRow: {
    gap: 4,
    marginTop: 4,
  },
  metaText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 12,
  },
});
