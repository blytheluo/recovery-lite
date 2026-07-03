export const STORAGE_KEY = 'recovery-middle-state-v1';

export const todayISO = () => {
  const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const formatDayNumber = (startDate: string, date = todayISO()) => {
  const start = new Date(startDate);
  const current = new Date(date);
  const diff = Math.floor((current.getTime() - start.getTime()) / 86400000) + 1;
  return Math.max(1, diff);
};

export const recoveryPrompt = [
  '今天不需要恢复成平时的样子。',
  '吃饭、休息、按时完成医嘱，已经是今天的正事。',
  '状态好一点，不等于要把之前落下的事情都补回来。',
  '今天的任务可以小一点，身体正在处理更重要的事情。',
];

export const relaxCards = [
  '不回复所有消息，也不算失礼。',
  '今天不用证明自己恢复得很好。',
  '休息不是暂停进度，休息本身就是进度。',
  '可以只做最基本的事。',
  '不想解释时，简单说“这两天在恢复，晚点回复”就够了。',
  '把今天过得省一点，不是退步。',
];

export const defaultLowEnergyIdeas = [
  '闭眼躺一会儿，什么都不处理。',
  '把手机放远一点，先喝两口水。',
  '只回一条必须回的信息。',
  '慢慢换个更舒服的姿势。',
];

export const surgeryTemplates = {
  appendectomy_laparoscopy: {
    key: 'appendectomy_laparoscopy',
    name: '阑尾炎腹腔镜',
    description: '适合用于回顾短期恢复重点，页面会优先提醒你稳住疼痛、饮食、活动和复诊。',
    homePrompt: {
      planned: '这是阑尾炎腹腔镜的准备阶段，今天更适合确认医嘱、安排陪同和把必需事项收拢。',
      recovery: '这是阑尾炎腹腔镜的恢复阶段，今天优先稳住休息、伤口观察和按医嘱完成要做的事。',
      past: '这是阑尾炎腹腔镜的历史记录页，可以作为你以后恢复参考，不用把现在和那次混在一起。',
    },
    must: ['按医生交代完成用药或护理', '观察伤口、疼痛和体温变化', '把今天真正不能拖的事情缩到最少'],
    optional: ['少量多次补水', '短时间下床或轻微活动', '联系家属或同住的人确认安排'],
    defer: ['整理房间', '复杂工作沟通', '长时间外出', '强度高的运动', '密集社交'],
    lowEnergy: ['只做最必要的恢复动作', '其余内容先放一边', '把休息放在第一位'],
    reminders: [
      { title: '按医嘱吃药/护理', priority: 'must' as const, note: '按医生给的时间来' },
      { title: '观察伤口和体温', priority: 'must' as const, note: '留意变化，不自己判断' },
      { title: '少量多次补水', priority: 'optional' as const, note: '能喝一点就可以' },
      { title: '短时间活动一下', priority: 'optional' as const, note: '按身体状态来' },
    ],
    recordFocus: ['疼痛', '体温', '饮食', '活动', '伤口感觉'],
  },
  teratoma_laparoscopy: {
    key: 'teratoma_laparoscopy',
    name: '畸胎瘤腹腔镜',
    description: '适合用于手术前准备和术后恢复追踪，重点放在沟通、待带物品、疼痛、饮食和复诊。',
    homePrompt: {
      planned: '这是畸胎瘤腹腔镜的准备阶段，今天适合确认医生交代、检查安排和要带的东西。',
      recovery: '这是畸胎瘤腹腔镜的恢复阶段，今天优先把休息、饮食耐受、活动安排和复诊放在前面。',
      past: '这是畸胎瘤腹腔镜的历史记录页，可以用来回看之前怎么恢复、怎么记医嘱。',
    },
    must: ['按医生交代完成准备或护理', '把手术相关问题整理好', '确认今天最重要的安排'],
    optional: ['整理待带物品', '记录医生说过的话', '跟家属确认陪同和交通'],
    defer: ['临时加班', '不必要的社交安排', '重体力家务', '长时间久站', '让自己太累的计划'],
    lowEnergy: ['只保留必须步骤', '把问题写下来，不用硬记', '其余安排能少就少'],
    reminders: [
      { title: '记录医生交代', priority: 'must' as const, note: '方便之后回看' },
      { title: '确认检查/手术安排', priority: 'must' as const, note: '按当天实际情况写' },
      { title: '整理待带物品', priority: 'optional' as const, note: '能提前准备就先放好' },
      { title: '把想问的问题写下来', priority: 'optional' as const, note: '到时候直接问' },
    ],
    recordFocus: ['疼痛', '腹部感觉', '饮食', '活动', '复诊'],
  },
} as const;

export type SurgeryTemplateKey = keyof typeof surgeryTemplates;

export type SurgeryTemplate = (typeof surgeryTemplates)[SurgeryTemplateKey];

export const getSurgeryTemplate = (key: SurgeryTemplateKey) => surgeryTemplates[key];

export const createSurgeryItem = (
  key: SurgeryTemplateKey,
  overrides: Partial<{ date: string; active: boolean; note: string; stage: 'planned' | 'past' | 'recovery' }> = {},
) => {
  const template = getSurgeryTemplate(key);
  return {
    id: makeId(),
    templateKey: key,
    name: template.name,
    stage: overrides.stage ?? (key === 'appendectomy_laparoscopy' ? 'past' : 'planned'),
    date: overrides.date ?? '',
    active: overrides.active ?? false,
    note: overrides.note ?? '',
  };
};

export const getActiveSurgery = <T extends { active: boolean }>(surgeries: T[]) => surgeries.find((item) => item.active) ?? surgeries[0] ?? null;

export const uniq = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

export const buildHomePlan = (params: {
  surgery?: { name: string; stage: 'planned' | 'past' | 'recovery'; templateKey: SurgeryTemplateKey };
  energy: number;
  discomfort: string;
  mustDoToday: boolean;
  reminders: Array<{ title: string; priority: string; done: boolean; doctorAssigned: boolean }>;
}) => {
  const generic = summarizeThreeThings(params);
  if (!params.surgery) {
    return {
      title: '恢复计划',
      prompt: todaysPrompt({ energy: params.energy, discomfort: params.discomfort, mustDoToday: params.mustDoToday }),
      must: generic.must,
      optional: generic.optional,
      defer: generic.defer,
      lowEnergy: defaultLowEnergyIdeas,
    };
  }

  const template = getSurgeryTemplate(params.surgery.templateKey);
  return {
    title: params.surgery.name,
    prompt: template.homePrompt[params.surgery.stage],
    must: uniq([...template.must, ...generic.must]).slice(0, 4),
    optional: uniq([...template.optional, ...generic.optional]).slice(0, 4),
    defer: uniq([...template.defer, ...generic.defer]).slice(0, 5),
    lowEnergy: template.lowEnergy,
  };
};

export const todaysPrompt = (state: { energy: number; discomfort: string; mustDoToday: boolean }) => {
  if (state.energy <= 2 || state.discomfort === '明显') {
    return '今天优先低配版本生活：医嘱、补水、吃点能接受的东西，其余默认可以往后放。';
  }
  if (state.mustDoToday) {
    return '今天把必须事项做完就够了，其他部分可以更松一点。';
  }
  return '今天可以稳一点，照顾身体优先，不必把自己拉回原来的节奏。';
};

export const summarizeThreeThings = (state: { energy: number; discomfort: string; reminders: Array<{ title: string; priority: string; done: boolean; doctorAssigned: boolean }> }) => {
  const must = state.reminders.filter((item) => item.priority === 'must' && !item.done).slice(0, 3).map((item) => item.title);
  const optional = state.reminders.filter((item) => item.priority === 'optional' && !item.done).slice(0, 3).map((item) => item.title);
  const mustFallback = ['按医嘱吃药/护理', '喝几口水', '确认今天没有漏掉必须事项'];
  const optionalFallback = ['洗漱一下', '看一会儿书/听一点轻内容', '回一条必要消息'];
  const lowEnergy = state.energy <= 2 || state.discomfort === '明显';
  return {
    must: must.length ? must : mustFallback.slice(0, lowEnergy ? 2 : 3),
    optional: lowEnergy ? ['休息', '吃点能接受的食物'] : optional.length ? optional : optionalFallback,
    defer: lowEnergy
      ? ['整理房间', '回复所有消息', '学习计划', '复杂决策', '社交安排']
      : ['整理房间', '回复所有消息', '学习计划', '复杂决策', '社交安排'].slice(0, 4),
  };
};