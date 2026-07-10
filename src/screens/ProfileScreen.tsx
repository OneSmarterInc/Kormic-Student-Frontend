import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenShell } from '../components/ScreenShell';
import { SectionLabel } from '../components/SectionLabel';
import { colors, fonts, type } from '../theme/tokens';

type Project = {
  title: string;
  description: string;
  technologies: string[];
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

type StudentProfile = {
  name: string;
  email: string;
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
}

const sampleProfile: StudentProfile = {
  name: 'Kalyani Ghatol',
  email: 'ghatolkalyani2005@gmail.com',
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
      description: 'Developed a full-stack portfolio website to showcase projects, skills, and achievements with a responsive UI.',
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
    recommendations: ['Consider taking the GRE if the target universities recommend it.', 'Complete an English proficiency test before applying.'],
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
    strengths: ['Basic AI / Machine Learning knowledge', 'Strong Web Development skills', 'Good practical project experience', 'Strong industry experience'],
    weaknesses: ['No database experience.'],
    recommendations: ['Create and maintain an active GitHub profile.'],
    evidence: ['2 AI-related technologies identified.', '4 Web Development technologies identified.', '3 projects completed.', '7.0 months of professional experience.'],
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
  disciplines: ['Software Engineering', 'Full Stack Web Development', 'Data Engineering and Business Intelligence'],
  gaps: ['budget', 'target_disciplines', 'graduation_year', 'standardized_test_scores (GRE/TOEFL/IELTS)', 'research_experience', 'academic_awards_and_achievements'],
  parser_status: 'success',
  parser_engine: 'claude',
  response_mode: 'detailed',
  work_experience_summary:
    'Project Intern at ASEA Brown Boveri (ABB) India Ltd.; Full Stack Development Intern at Apexa IQ; Full Stack Development Intern at One Smarter Inc.',
  student_id: 'kalyani_ghatol',
  created_at: '2026-07-09 11:09:32',
  updated_at: '2026-07-09 11:10:12',
};

export function ProfileScreen({ profile = sampleProfile }: ProfileScreenProps) {
  return (
    <ScreenShell>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(profile.name)}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{profile.name}</Text>
          <Text style={styles.subhead}>{profile.email}</Text>
          <View style={styles.statusRow}>
            <Badge label={profile.verified ? 'Verified' : 'Not verified'} tone={profile.verified ? 'success' : 'warning'} />
            <Badge label={profile.source} />
          </View>
        </View>
      </View>

      <View style={styles.scoreGrid}>
        <MetricCard label="Overall" value={`${profile.overall_profile_score}/100`} caption={profile.overall_profile.profile_level} />
        <MetricCard label="Complete" value={`${profile.profile_completeness.percentage}%`} caption={`${profile.profile_completeness.completed}/${profile.profile_completeness.total} fields`} />
        <MetricCard label="Technical" value={`${profile.technical_intelligence.technical_score ?? 0}/100`} caption={profile.technical_intelligence.technical_level ?? 'Not scored'} />
      </View>

      <View style={styles.form}>
        <SectionLabel>Personal information</SectionLabel>
        <InfoCard>
          <FieldRow label="Student ID" value={profile.student_id} />
          <FieldRow label="Country" value={profile.country} />
          <FieldRow label="Institution" value={profile.institution} />
          <FieldRow label="Major" value={profile.major} />
          <FieldRow label="Program" value={profile.program} />
          <FieldRow label="Graduation year" value={formatValue(profile.graduation_year)} />
        </InfoCard>

        <SectionLabel>Academic profile</SectionLabel>
        <InfoCard>
          <FieldRow label="GPA" value={profile.gpa ? `${profile.gpa}/${profile.gpa_scale}` : profile.gpa_text} />
          <FieldRow label="GRE Quant" value={formatValue(profile.gre_quant)} />
          <FieldRow label="GRE Verbal" value={formatValue(profile.gre_verbal)} />
          <FieldRow label="TOEFL" value={formatValue(profile.toefl)} />
          <FieldRow label="IELTS" value={formatValue(profile.ielts)} />
          <FieldRow label="English score" value={profile.english_score_text} />
          <FieldRow label="Budget" value={profile.budget ? `$${profile.budget}` : profile.budget_text} />
        </InfoCard>

        <SectionLabel>Profile intelligence</SectionLabel>
        <IntelligenceCard
          title="Academic readiness"
          score={`${profile.academic_intelligence.academic_score ?? 0}/100`}
          level={profile.academic_intelligence.readiness}
          strengths={profile.academic_intelligence.strengths}
          weaknesses={profile.academic_intelligence.weaknesses}
          recommendations={profile.academic_intelligence.recommendations}
        />
        <IntelligenceCard
          title="Technical level"
          score={`${profile.technical_intelligence.technical_score ?? 0}/100`}
          level={profile.technical_intelligence.technical_level}
          strengths={profile.technical_intelligence.strengths}
          weaknesses={profile.technical_intelligence.weaknesses}
          recommendations={profile.technical_intelligence.recommendations}
        />
        <IntelligenceCard
          title="Research readiness"
          score={`${profile.research_intelligence.research_score ?? 0}/100`}
          strengths={profile.research_intelligence.strengths}
          weaknesses={profile.research_intelligence.weaknesses}
          recommendations={profile.research_intelligence.recommendations}
        />

        <SectionLabel>Skills</SectionLabel>
        <ChipGroup items={profile.technical_skills} />

        <SectionLabel>Target disciplines</SectionLabel>
        <ChipGroup items={profile.disciplines} />

        <SectionLabel>Projects</SectionLabel>
        {profile.projects.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}

        <SectionLabel>Experience and research</SectionLabel>
        <InfoCard>
          <FieldRow label="Work experience" value={profile.work_months ? `${profile.work_months} months` : ''} />
          <FieldRow label="Experience summary" value={profile.work_experience_summary} />
          <FieldRow label="Research" value={profile.research} />
          <FieldRow label="Publications" value={String(profile.publications_count)} />
          <FieldRow label="GitHub" value={profile.github} />
          <FieldRow label="LinkedIn" value={profile.linkedin_url} />
        </InfoCard>

        <SectionLabel>Missing information</SectionLabel>
        <ChipGroup items={profile.profile_completeness.missing} tone="warning" />

        <SectionLabel>Recommendations</SectionLabel>
        <InfoCard>
          <Text style={styles.bodyText}>{profile.overall_profile.recommendation}</Text>
          {profile.gaps.map((gap) => (
            <Text key={gap} style={styles.listItem}>
              {'\u2022'} {gap}
            </Text>
          ))}
        </InfoCard>

        <SectionLabel>Notes</SectionLabel>
        <InfoCard>
          <Text style={styles.bodyText}>{profile.notes}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>Created: {profile.created_at}</Text>
            <Text style={styles.metaText}>Updated: {profile.updated_at}</Text>
          </View>
        </InfoCard>
      </View>
    </ScreenShell>
  );
}

function MetricCard({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricCaption}>{caption}</Text>
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

function ChipGroup({ items, tone = 'default', compact = false }: { items: string[]; tone?: 'default' | 'warning'; compact?: boolean }) {
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
    <View style={[styles.badge, tone === 'success' && styles.successBadge, tone === 'warning' && styles.warningBadge]}>
      <Text style={[styles.badgeText, tone === 'success' && styles.successBadgeText, tone === 'warning' && styles.warningBadgeText]}>{label}</Text>
    </View>
  );
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return 'Not provided';
  }

  return String(value);
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
  title: type.title,
  subhead: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 6,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginBottom: 18,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#E9F0FF',
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    width: 52,
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
    gap: 10,
    marginBottom: 18,
  },
  metricCard: {
    backgroundColor: colors.panelInk,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  metricLabel: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  metricValue: {
    color: colors.offWhite,
    fontFamily: fonts.heading,
    fontSize: 20,
    marginTop: 4,
  },
  metricCaption: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  form: {
    gap: 14,
  },
  card: {
    backgroundColor: colors.panelInk,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  fieldRow: {
    gap: 4,
  },
  fieldLabel: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  fieldValue: {
    color: colors.offWhite,
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
    color: colors.offWhite,
    fontFamily: fonts.heading,
    fontSize: 16,
    lineHeight: 22,
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
    color: colors.offWhite,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  miniList: {
    gap: 4,
  },
  miniListTitle: {
    color: colors.offWhite,
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
    backgroundColor: '#F2F5FA',
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipText: {
    color: colors.ink,
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
  badge: {
    backgroundColor: '#F2F5FA',
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
