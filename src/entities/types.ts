/**
 * Domain types mirroring the API's Prisma models and DTOs.
 *
 * Kept hand-written rather than generated: the API exposes a subset of each model
 * and reshapes some responses (for example `averageGrade` is computed, not stored),
 * so a generated client would describe the database, not the contract.
 */

export const Role = {
  ADMIN: 'ADMIN',
  STUDENT: 'STUDENT',
  EMPLOYER: 'EMPLOYER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Status = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type Status = (typeof Status)[keyof typeof Status];

export const PracticeStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED',
} as const;
export type PracticeStatus = (typeof PracticeStatus)[keyof typeof PracticeStatus];

export const StudentStatus = {
  STUDENT: 'STUDENT',
  GRADUATE: 'GRADUATE',
} as const;
export type StudentStatus = (typeof StudentStatus)[keyof typeof StudentStatus];

export const WorkType = {
  WORK: 'WORK',
  TRAINING: 'TRAINING',
} as const;
export type WorkType = (typeof WorkType)[keyof typeof WorkType];

export const City = {
  AMSTERDAM: 'AMSTERDAM',
  BERLIN: 'BERLIN',
  LISBON: 'LISBON',
  WARSAW: 'WARSAW',
} as const;
export type City = (typeof City)[keyof typeof City];

export const ChatType = {
  PRIVATE: 'PRIVATE',
  USER_WITH_ADMINS: 'USER_WITH_ADMINS',
} as const;
export type ChatType = (typeof ChatType)[keyof typeof ChatType];

export const NotificationType = {
  USER_AWAITS_APPROVAL: 'USER_AWAITS_APPROVAL',
  PROFILE_AWAITS_APPROVAL: 'PROFILE_AWAITS_APPROVAL',
  VACANCY_AWAITS_APPROVAL: 'VACANCY_AWAITS_APPROVAL',
  EMPLOYER_RESPONSE_TO_CANDIDATE: 'EMPLOYER_RESPONSE_TO_CANDIDATE',
  VACANCY_UPDATED: 'VACANCY_UPDATED',
  VACANCY_DELETED: 'VACANCY_DELETED',
  NEW_VACANCIES_DIGEST: 'NEW_VACANCIES_DIGEST',
  NEW_VACANCIES_FOR_STUDENT: 'NEW_VACANCIES_FOR_STUDENT',
  CANDIDATE_BOOKING_CONFIRMED: 'CANDIDATE_BOOKING_CONFIRMED',
  NEW_CANDIDATES_DIGEST: 'NEW_CANDIDATES_DIGEST',
  VACANCY_RESPONSE: 'VACANCY_RESPONSE',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  patronymic: string | null;
  role: Role;
  status: Status;
  profileImage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Specialization = {
  id: string;
  title: string;
  description: string;
  imgUrl: string;
  isActive: boolean;
};

export type StudentEducation = {
  id: string;
  educationalInstitution: string;
  degree: string;
  specialization: string;
  dateFrom: string | null;
  dateTo: string | null;
  stillStudying: boolean;
};

export type StudentLanguage = {
  id: string;
  name: string;
  level: string;
};

export type StudentSkill = {
  id: string;
  techSkill: string;
  flexibleSkill: string;
  keySkills: string[];
};

/**
 * One table backs two things: experiences a student typed in themselves and
 * practices the platform generated from an approved booking. `generatedBySystem`
 * tells them apart, and only generated + COMPLETED ones carry a grade.
 */
export type StudentWorkExperience = {
  id: string;
  company: string;
  specialization: string;
  dateFrom: string | null;
  dateTo: string | null;
  stillWorking: boolean | null;
  type: WorkType | null;
  generatedBySystem: boolean;
  practiceStatus: PracticeStatus | null;
  approvedStartByStudent: boolean | null;
  approvedStartByEmployer: boolean | null;
  approvedEndByStudent: boolean | null;
  approvedEndByEmployer: boolean | null;
  gradePractice: number | null;
  feedback: string | null;
  vacancyId: string | null;
  studentId: string;
};

export type Certificate = {
  id: string;
  title: string;
  url: string;
  createdAt: string;
};

export type StudentProfile = {
  id: string;
  userId: string;
  profileStatus: Status;
  status: StudentStatus | null;
  specializationId: string | null;
  specialization: Specialization | null;
  city: City | null;
  dateOfBirth: string | null;
  experience: number | null;
  aboutMe: string | null;
  diplomaGrade: number | null;
  diplomaTopic: string | null;
  cv: string | null;
  interview: string | null;
  isLookingForJob: boolean;
  isLookingForPractice: boolean;
  createdAt: string;
  approvedAt: string | null;
  educations?: StudentEducation[];
  workExperiences?: StudentWorkExperience[];
  languages?: StudentLanguage[];
  skill?: StudentSkill | null;
  certificates?: Certificate[];
  /** Mean of every completed, system-generated practice grade. Computed per request. */
  averageGrade?: number;
};

/** Shape returned by the candidate list: a profile with its user embedded. */
export type StudentListItem = StudentProfile & {
  user: User;
  averageGrade: number;
  workExperiences: StudentWorkExperience[];
};

export type EmployerProfile = {
  id: string;
  userId: string;
  companyName: string;
  city: string;
  phoneNumber: string | null;
  workPosition: string | null;
  createdAt: string;
};

export type Vacancy = {
  id: string;
  specializationId: string;
  specialization: Specialization;
  candidateStatus: StudentStatus;
  company: string;
  location: City;
  description: string;
  status: Status;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
};

export type StudentVacancyResponse = {
  studentId: string;
  vacancyId: string;
  workType: WorkType;
  statusByEmployer: Status;
  createdAt: string;
  vacancy?: Vacancy;
  student?: StudentProfile & { user: User };
};

export type StudentBooking = {
  studentId: string;
  vacancyId: string;
  status: Status;
  statusByEmployer: Status;
  statusByStudent: Status;
  workType: WorkType;
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  vacancy?: Vacancy;
  student?: StudentProfile & { user: User };
  studentWorkExperiences?: StudentWorkExperience[];
};

export type NotificationItem = {
  id: string;
  type: NotificationType;
  createdAt: string;
  isRead: boolean;
  actor: Pick<User, 'id' | 'firstName' | 'lastName' | 'role' | 'profileImage'> | null;
  subjectUser: Pick<User, 'id' | 'firstName' | 'lastName' | 'role' | 'profileImage'> | null;
  vacancy: Pick<Vacancy, 'id' | 'company'> | null;
  meta: Record<string, unknown> | null;
};

export type ChatParticipant = Pick<
  User,
  'id' | 'firstName' | 'lastName' | 'patronymic' | 'role' | 'profileImage'
> & { companyName?: string };

export type Message = {
  id: string;
  chatId: string;
  content: string;
  createdAt: string;
  sender: Pick<User, 'id' | 'firstName' | 'lastName' | 'profileImage'>;
};

export type Chat = {
  id: string;
  type: ChatType;
  createdAt: string;
  participants: ChatParticipant[];
  latestMessage: Message | null;
};

export type AuthResponse = {
  user: User & {
    studentProfile?: StudentProfile | null;
    employerProfile?: EmployerProfile | null;
  };
  accessToken: string;
};

export type UserAnalytics = {
  total: number;
  byRole: Record<Role, number>;
};

export type EmployerAnalyticsRow = {
  id: string;
  companyName: string;
  city: string;
  createdAt: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  status: Status;
  activeVacancies: number;
  studentsInPractice: number;
  studentsInWork: number;
};
