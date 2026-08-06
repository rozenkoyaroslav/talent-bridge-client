import { faker } from '@faker-js/faker';
import {
  ChatType,
  City,
  NotificationType,
  PracticeStatus,
  Role,
  Status,
  StudentStatus,
  WorkType,
  type Certificate,
  type EmployerProfile,
  type Message,
  type Specialization,
  type StudentBooking,
  type StudentEducation,
  type StudentLanguage,
  type StudentProfile,
  type StudentSkill,
  type StudentVacancyResponse,
  type StudentWorkExperience,
  type User,
  type Vacancy,
} from '@/entities/types';

/**
 * In-memory database behind the mock API.
 *
 * Seeded from a fixed faker seed so the demo looks identical on every visit —
 * screenshots stay valid and the end-to-end tests have something stable to assert.
 */

export type DbUser = User & { password: string };

export type DbNotification = {
  id: string;
  type: NotificationType;
  createdAt: string;
  actorId: string | null;
  subjectUserId: string | null;
  vacancyId: string | null;
  meta: Record<string, unknown> | null;
  recipients: { userId: string; isRead: boolean }[];
};

export type Db = {
  users: DbUser[];
  specializations: Specialization[];
  studentProfiles: StudentProfile[];
  employerProfiles: EmployerProfile[];
  educations: (StudentEducation & { studentId: string })[];
  languages: (StudentLanguage & { studentId: string })[];
  skills: (StudentSkill & { studentId: string })[];
  certificates: (Certificate & { studentId: string })[];
  experiences: StudentWorkExperience[];
  vacancies: Vacancy[];
  responses: StudentVacancyResponse[];
  bookings: StudentBooking[];
  notifications: DbNotification[];
  chats: { id: string; type: ChatType; createdAt: string; participantIds: string[] }[];
  messages: Message[];
};

const SEED = 20260406;
const STORAGE_KEY = 'talent-bridge-demo-db';

export const DEMO_PASSWORD = 'demo';
export const DEMO_ACCOUNTS = {
  student: 'student@demo.io',
  employer: 'employer@demo.io',
  admin: 'admin@demo.io',
} as const;

const SPECIALIZATIONS: Omit<Specialization, 'id'>[] = [
  {
    title: 'Software Engineering',
    description:
      'Software engineers design and build applications, automate workflows and ship digital products.',
    imgUrl: 'https://placehold.co/640x360/1e293b/e2e8f0?text=Software+Engineering',
    isActive: true,
  },
  {
    title: 'Product Design',
    description:
      'Designers turn product requirements into visual concepts, working on layouts, graphics and UX/UI.',
    imgUrl: 'https://placehold.co/640x360/1e293b/e2e8f0?text=Product+Design',
    isActive: true,
  },
  {
    title: 'Hospitality',
    description:
      'Chefs, waiters, bartenders and floor managers prepare food and drinks and deliver guest service.',
    imgUrl: 'https://placehold.co/640x360/1e293b/e2e8f0?text=Hospitality',
    isActive: true,
  },
  {
    title: 'Automotive Repair',
    description:
      'Automotive technicians diagnose and repair vehicles, keeping them safe and roadworthy.',
    imgUrl: 'https://placehold.co/640x360/1e293b/e2e8f0?text=Automotive+Repair',
    isActive: true,
  },
];

const LANGUAGE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const DEGREES = ["Bachelor's", "Master's", 'Associate', 'Doctoral'];

const iso = (date: Date) => date.toISOString();

const pickStatusWeighted = (): Status =>
  faker.helpers.weightedArrayElement([
    { weight: 7, value: Status.APPROVED },
    { weight: 2, value: Status.PENDING },
    { weight: 1, value: Status.REJECTED },
  ]);

const createSeededDb = (): Db => {
  faker.seed(SEED);

  const db: Db = {
    users: [],
    specializations: [],
    studentProfiles: [],
    employerProfiles: [],
    educations: [],
    languages: [],
    skills: [],
    certificates: [],
    experiences: [],
    vacancies: [],
    responses: [],
    bookings: [],
    notifications: [],
    chats: [],
    messages: [],
  };

  db.specializations = SPECIALIZATIONS.map((specialization, index) => ({
    ...specialization,
    id: `spec-${index + 1}`,
  }));

  const makeUser = (overrides: Partial<DbUser> & Pick<DbUser, 'role'>): DbUser => {
    const firstName = overrides.firstName ?? faker.person.firstName();
    const lastName = overrides.lastName ?? faker.person.lastName();

    return {
      id: overrides.id ?? faker.string.uuid(),
      email: overrides.email ?? faker.internet.email({ firstName, lastName }).toLowerCase(),
      firstName,
      lastName,
      patronymic: overrides.patronymic ?? null,
      password: overrides.password ?? DEMO_PASSWORD,
      role: overrides.role,
      status: overrides.status ?? Status.APPROVED,
      profileImage:
        overrides.profileImage ??
        `https://placehold.co/128x128/334155/e2e8f0?text=${firstName[0]}${lastName[0]}`,
      createdAt: overrides.createdAt ?? iso(faker.date.past({ years: 2 })),
      updatedAt: overrides.updatedAt ?? iso(new Date()),
    };
  };

  // ---- admins -------------------------------------------------------------
  const demoAdmin = makeUser({
    id: 'user-admin-demo',
    role: Role.ADMIN,
    email: DEMO_ACCOUNTS.admin,
    firstName: 'Ada',
    lastName: 'Admin',
  });
  db.users.push(demoAdmin, makeUser({ role: Role.ADMIN }));

  // ---- students -----------------------------------------------------------
  const addStudent = (user: DbUser, forceApproved = false) => {
    db.users.push(user);

    const specialization = faker.helpers.arrayElement(db.specializations);
    const profileStatus = forceApproved ? Status.APPROVED : pickStatusWeighted();

    const profile: StudentProfile = {
      id: `profile-${user.id}`,
      userId: user.id,
      profileStatus,
      status: faker.helpers.arrayElement(Object.values(StudentStatus)),
      specializationId: specialization.id,
      specialization,
      city: faker.helpers.arrayElement(Object.values(City)),
      dateOfBirth: iso(faker.date.birthdate({ mode: 'age', min: 19, max: 34 })),
      experience: faker.number.int({ min: 0, max: 8 }),
      aboutMe: faker.lorem.paragraph(),
      diplomaGrade: faker.number.int({ min: 60, max: 100 }),
      diplomaTopic: faker.company.catchPhrase(),
      cv: faker.datatype.boolean() ? 'demo://resume.pdf' : null,
      interview: faker.datatype.boolean({ probability: 0.3 }) ? 'demo://interview.mp4' : null,
      isLookingForJob: faker.datatype.boolean(),
      isLookingForPractice: faker.datatype.boolean(),
      createdAt: user.createdAt,
      approvedAt: profileStatus === Status.APPROVED ? iso(faker.date.past()) : null,
    };
    db.studentProfiles.push(profile);

    for (let i = 0; i < faker.number.int({ min: 1, max: 2 }); i++) {
      db.educations.push({
        id: faker.string.uuid(),
        studentId: profile.id,
        educationalInstitution: `${faker.location.city()} University`,
        degree: faker.helpers.arrayElement(DEGREES),
        specialization: faker.person.jobArea(),
        dateFrom: iso(faker.date.past({ years: 6 })),
        dateTo: iso(faker.date.past({ years: 1 })),
        stillStudying: faker.datatype.boolean({ probability: 0.3 }),
      });
    }

    for (let i = 0; i < faker.number.int({ min: 1, max: 3 }); i++) {
      db.languages.push({
        id: faker.string.uuid(),
        studentId: profile.id,
        name: faker.helpers.arrayElement(['English', 'German', 'Spanish', 'Polish', 'Dutch']),
        level: faker.helpers.arrayElement(LANGUAGE_LEVELS),
      });
    }

    db.skills.push({
      id: faker.string.uuid(),
      studentId: profile.id,
      techSkill: faker.helpers
        .arrayElements(['TypeScript', 'React', 'Node.js', 'SQL', 'Figma', 'Docker'], 3)
        .join(', '),
      flexibleSkill: faker.helpers
        .arrayElements(['Teamwork', 'Ownership', 'Communication', 'Mentoring'], 2)
        .join(', '),
      keySkills: faker.helpers.arrayElements(
        ['REST', 'Testing', 'CI/CD', 'Accessibility', 'Prototyping'],
        faker.number.int({ min: 2, max: 4 }),
      ),
    });

    if (faker.datatype.boolean({ probability: 0.6 })) {
      db.certificates.push({
        id: faker.string.uuid(),
        studentId: profile.id,
        title: `${faker.company.buzzNoun()} certificate`,
        url: 'demo://certificate.pdf',
        createdAt: iso(faker.date.past()),
      });
    }

    // Self-reported experience, separate from platform-generated practices.
    for (let i = 0; i < faker.number.int({ min: 0, max: 2 }); i++) {
      db.experiences.push({
        id: faker.string.uuid(),
        studentId: profile.id,
        company: faker.company.name(),
        specialization: faker.person.jobTitle(),
        dateFrom: iso(faker.date.past({ years: 4 })),
        dateTo: iso(faker.date.recent({ days: 300 })),
        stillWorking: false,
        type: WorkType.WORK,
        generatedBySystem: false,
        practiceStatus: null,
        approvedStartByStudent: null,
        approvedStartByEmployer: null,
        approvedEndByStudent: null,
        approvedEndByEmployer: null,
        gradePractice: null,
        feedback: null,
        vacancyId: null,
      });
    }

    return profile;
  };

  addStudent(
    makeUser({
      id: 'user-student-demo',
      role: Role.STUDENT,
      email: DEMO_ACCOUNTS.student,
      firstName: 'Stella',
      lastName: 'Novak',
    }),
    true,
  );

  for (let i = 0; i < 39; i++) {
    addStudent(makeUser({ role: Role.STUDENT, status: pickStatusWeighted() }));
  }

  // ---- employers ----------------------------------------------------------
  const addEmployer = (user: DbUser) => {
    db.users.push(user);

    const profile: EmployerProfile = {
      id: `employer-${user.id}`,
      userId: user.id,
      companyName: faker.company.name(),
      city: faker.helpers.arrayElement(Object.values(City)),
      phoneNumber: faker.phone.number(),
      workPosition: faker.person.jobTitle(),
      createdAt: user.createdAt,
    };
    db.employerProfiles.push(profile);

    return profile;
  };

  const demoEmployerProfile = addEmployer(
    makeUser({
      id: 'user-employer-demo',
      role: Role.EMPLOYER,
      email: DEMO_ACCOUNTS.employer,
      firstName: 'Erik',
      lastName: 'Lang',
    }),
  );
  demoEmployerProfile.companyName = 'Northwind Labs';

  for (let i = 0; i < 11; i++) {
    addEmployer(makeUser({ role: Role.EMPLOYER, status: pickStatusWeighted() }));
  }

  // ---- vacancies ----------------------------------------------------------
  for (let i = 0; i < 25; i++) {
    const employer =
      i < 4 ? demoEmployerProfile : faker.helpers.arrayElement(db.employerProfiles);
    const specialization = faker.helpers.arrayElement(db.specializations);
    const status = i < 4 ? Status.APPROVED : pickStatusWeighted();
    const createdAt = iso(faker.date.recent({ days: 120 }));

    db.vacancies.push({
      id: `vacancy-${i + 1}`,
      specializationId: specialization.id,
      specialization,
      candidateStatus: faker.helpers.arrayElement(Object.values(StudentStatus)),
      company: employer.companyName,
      location: faker.helpers.arrayElement(Object.values(City)),
      description: `${faker.company.catchPhrase()}. ${faker.lorem.paragraph()}`,
      status,
      createdById: employer.id,
      createdAt,
      updatedAt: createdAt,
      approvedAt: status === Status.APPROVED ? createdAt : null,
    });
  }

  // ---- responses, bookings, practices -------------------------------------
  const approvedStudents = db.studentProfiles.filter(p => p.profileStatus === Status.APPROVED);
  const approvedVacancies = db.vacancies.filter(v => v.status === Status.APPROVED);

  for (let i = 0; i < 30; i++) {
    const student = faker.helpers.arrayElement(approvedStudents);
    const vacancy = faker.helpers.arrayElement(approvedVacancies);

    if (db.responses.some(r => r.studentId === student.id && r.vacancyId === vacancy.id)) continue;

    db.responses.push({
      studentId: student.id,
      vacancyId: vacancy.id,
      workType: faker.helpers.arrayElement(Object.values(WorkType)),
      statusByEmployer: pickStatusWeighted(),
      createdAt: iso(faker.date.recent({ days: 60 })),
    });
  }

  for (let i = 0; i < 28; i++) {
    const student = faker.helpers.arrayElement(approvedStudents);
    const vacancy = faker.helpers.arrayElement(approvedVacancies);

    if (db.bookings.some(b => b.studentId === student.id && b.vacancyId === vacancy.id)) continue;

    const status = pickStatusWeighted();
    const createdAt = iso(faker.date.recent({ days: 90 }));

    db.bookings.push({
      studentId: student.id,
      vacancyId: vacancy.id,
      status,
      statusByEmployer: status,
      statusByStudent: status === Status.APPROVED ? Status.APPROVED : Status.PENDING,
      workType: faker.helpers.arrayElement(Object.values(WorkType)),
      createdAt,
      approvedAt: status === Status.APPROVED ? createdAt : null,
      rejectedAt: status === Status.REJECTED ? createdAt : null,
    });
  }

  // Approved bookings become platform-generated practices; most are graded.
  db.bookings
    .filter(booking => booking.status === Status.APPROVED)
    .forEach(booking => {
      const vacancy = db.vacancies.find(v => v.id === booking.vacancyId)!;
      const completed = faker.datatype.boolean({ probability: 0.65 });
      const dateFrom = faker.date.past({ years: 1 });

      db.experiences.push({
        id: faker.string.uuid(),
        studentId: booking.studentId,
        vacancyId: booking.vacancyId,
        company: vacancy.company,
        specialization: vacancy.specialization.title,
        type: booking.workType,
        generatedBySystem: true,
        dateFrom: iso(dateFrom),
        dateTo: completed ? iso(faker.date.between({ from: dateFrom, to: new Date() })) : null,
        stillWorking: !completed,
        approvedStartByStudent: true,
        approvedStartByEmployer: true,
        approvedEndByStudent: completed,
        approvedEndByEmployer: completed,
        practiceStatus: completed ? PracticeStatus.COMPLETED : PracticeStatus.APPROVED,
        gradePractice: completed ? faker.number.int({ min: 62, max: 98 }) : null,
        feedback: completed ? faker.lorem.sentence() : null,
      });
    });

  // ---- chats --------------------------------------------------------------
  const demoStudentUser = db.users.find(u => u.id === 'user-student-demo')!;
  const demoEmployerUser = db.users.find(u => u.id === 'user-employer-demo')!;

  const addChat = (participantIds: string[], type: ChatType, messageCount: number) => {
    const chatId = faker.string.uuid();
    const createdAt = iso(faker.date.recent({ days: 30 }));
    db.chats.push({ id: chatId, type, createdAt, participantIds });

    let cursor = new Date(createdAt);
    for (let i = 0; i < messageCount; i++) {
      cursor = faker.date.soon({ days: 1, refDate: cursor });
      const senderId = participantIds[i % participantIds.length];

      db.messages.push({
        id: faker.string.uuid(),
        chatId,
        content: faker.lorem.sentence(),
        createdAt: iso(cursor),
        sender: (({ id, firstName, lastName, profileImage }) => ({
          id,
          firstName,
          lastName,
          profileImage,
        }))(db.users.find(u => u.id === senderId)!),
      });
    }

    return chatId;
  };

  addChat([demoStudentUser.id, demoEmployerUser.id], ChatType.PRIVATE, 8);
  addChat([demoStudentUser.id, demoAdmin.id], ChatType.USER_WITH_ADMINS, 3);
  addChat([demoEmployerUser.id, demoAdmin.id], ChatType.USER_WITH_ADMINS, 2);

  const otherStudents = db.studentProfiles
    .filter(p => p.userId !== demoStudentUser.id)
    .slice(0, 3);

  otherStudents.forEach(profile => {
    addChat([demoEmployerUser.id, profile.userId], ChatType.PRIVATE, faker.number.int({ min: 2, max: 6 }));
  });

  // ---- notifications ------------------------------------------------------
  const notify = (
    type: NotificationType,
    recipientIds: string[],
    extra: Partial<DbNotification> = {},
  ) => {
    db.notifications.push({
      id: faker.string.uuid(),
      type,
      createdAt: iso(faker.date.recent({ days: 14 })),
      actorId: extra.actorId ?? null,
      subjectUserId: extra.subjectUserId ?? null,
      vacancyId: extra.vacancyId ?? null,
      meta: extra.meta ?? null,
      recipients: recipientIds.map(userId => ({
        userId,
        isRead: faker.datatype.boolean({ probability: 0.4 }),
      })),
    });
  };

  notify(NotificationType.NEW_VACANCIES_DIGEST, [demoStudentUser.id], {
    meta: { count: 6, specialization: db.specializations[0].title },
  });
  notify(NotificationType.NEW_VACANCIES_FOR_STUDENT, [demoStudentUser.id], {
    vacancyId: db.vacancies[0].id,
    actorId: demoEmployerUser.id,
  });
  notify(NotificationType.EMPLOYER_RESPONSE_TO_CANDIDATE, [demoAdmin.id], {
    actorId: demoEmployerUser.id,
    subjectUserId: demoStudentUser.id,
    vacancyId: db.vacancies[0].id,
  });
  notify(NotificationType.CANDIDATE_BOOKING_CONFIRMED, [demoEmployerUser.id], {
    subjectUserId: demoStudentUser.id,
    vacancyId: db.vacancies[1].id,
    meta: { status: Status.APPROVED },
  });
  notify(NotificationType.VACANCY_RESPONSE, [demoEmployerUser.id, demoStudentUser.id], {
    actorId: demoStudentUser.id,
    vacancyId: db.vacancies[2].id,
  });
  notify(NotificationType.NEW_CANDIDATES_DIGEST, [demoAdmin.id], { meta: { count: 4 } });

  db.users
    .filter(user => user.status === Status.PENDING)
    .slice(0, 5)
    .forEach(user => notify(NotificationType.USER_AWAITS_APPROVAL, [demoAdmin.id], { actorId: user.id }));

  db.vacancies
    .filter(vacancy => vacancy.status === Status.PENDING)
    .slice(0, 4)
    .forEach(vacancy =>
      notify(NotificationType.VACANCY_AWAITS_APPROVAL, [demoAdmin.id], { vacancyId: vacancy.id }),
    );

  return db;
};

/**
 * Demo state survives a reload but not a new visit: sessionStorage keeps a reviewer's
 * changes visible while they explore, and hands the next visitor a clean demo.
 */
const load = (): Db => {
  if (typeof sessionStorage === 'undefined') return createSeededDb();

  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return createSeededDb();

  try {
    return JSON.parse(stored) as Db;
  } catch {
    return createSeededDb();
  }
};

export let db: Db = load();

export const persistDb = () => {
  if (typeof sessionStorage === 'undefined') return;

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Quota exceeded is not worth breaking the demo over.
  }
};

export const resetDb = () => {
  db = createSeededDb();
  persistDb();
};
