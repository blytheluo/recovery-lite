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