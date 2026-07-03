export type MoodScore = 1 | 2 | 3 | 4 | 5;
export type EnergyScore = 1 | 2 | 3 | 4 | 5;
export type DiscomfortLevel = '无' | '有一点' | '明显';
export type TaskPriority = 'must' | 'optional';
export type SleepState = '差' | '一般' | '还可以';
export type AppetiteState = '差' | '一般' | '可以';

export type TrackingMode = 'hospital' | 'postOp' | 'recovery';
export type SurgeryStage = 'planned' | 'past' | 'recovery';
export type SurgeryTemplateKey = 'appendectomy_laparoscopy' | 'teratoma_laparoscopy';

export type RecoveryProfile = {
  mode: TrackingMode;
  startDate: string;
  enabled: boolean;
};

export type DailyState = {
  date: string;
  dayNumber: number;
  energy: EnergyScore;
  mood: MoodScore;
  discomfort: DiscomfortLevel;
  mustDoToday: boolean;
};

export type ReminderItem = {
  id: string;
  title: string;
  priority: TaskPriority;
  time: string;
  repeat: boolean;
  done: boolean;
  note: string;
  doctorAssigned: boolean;
};

export type BodyRecord = {
  date: string;
  pain: number;
  sleep: SleepState;
  appetite: AppetiteState;
  energy: EnergyScore;
  mood: MoodScore;
  newSymptoms: string;
  temperature: string;
  stool: string;
  notes: string;
};

export type DoctorNote = {
  id: string;
  date: string;
  summary: string;
  unclear: string;
  nextQuestion: string;
  followUpDate: string;
};

export type AlertNote = {
  id: string;
  title: string;
  description: string;
};

export type DiaryEntry = {
  id: string;
  date: string;
  prompt: string;
  content: string;
};

export type SurgeryItem = {
  id: string;
  templateKey: SurgeryTemplateKey;
  name: string;
  stage: SurgeryStage;
  date: string;
  active: boolean;
  note: string;
};

export type AppData = {
  profile: RecoveryProfile;
  daily: DailyState;
  surgeries: SurgeryItem[];
  reminders: ReminderItem[];
  records: BodyRecord[];
  doctorNotes: DoctorNote[];
  alertNotes: AlertNote[];
  diaries: DiaryEntry[];
  hospital: {
    testPlan: string;
    fastingReminder: string;
    questions: { id: string; text: string; asked: boolean }[];
    bagList: { id: string; text: string; packed: boolean }[];
    lowEnergyIdeas: string[];
  };
};