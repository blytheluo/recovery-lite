import { useEffect, useMemo, useState } from 'react';
import type { AppData, BodyRecord, DiaryEntry, ReminderItem, SurgeryPhase } from './types';
import './styles.css';

const KEY = 'recovery-lite-data-v2';
const today = () => new Date().toISOString().slice(0, 10);
const id = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const defaultData = (): AppData => ({
  profile: {
    surgeryName: '畸胎瘤腹腔镜',
    admissionDate: '2026-07-06',
    surgeryStartDate: '2026-07-09',
    surgeryEndDate: '2026-07-10',
    dischargeDate: '2026-07-13',
    restUntilDate: '2026-07-27',
  },
  daily: { date: today(), energy: 3, mood: 3, discomfort: '无', mustDoToday: false },
  reminders: [
    { id: id(), title: '按医嘱吃药 / 做检查', priority: 'must', time: '', repeat: false, done: false, note: '', doctorAssigned: true },
    { id: id(), title: '喝一点水、慢慢活动', priority: 'optional', time: '', repeat: true, done: false, note: '', doctorAssigned: false },
  ],
  records: [], doctorNotes: [],
  alertNotes: [{ id: id(), title: '需要担心时优先联系医院', description: '这个工具不提供医学判断；有让你担心的症状，以医生建议和就医为先。' }],
  diaries: [],
});

const load = (): AppData => {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? { ...defaultData(), ...JSON.parse(saved) } : defaultData();
  } catch { return defaultData(); }
};

const phaseFor = (data: AppData): SurgeryPhase => {
  const d = data.daily.date;
  const p = data.profile;
  if (d < p.admissionDate) return 'preOp';
  if (d < p.surgeryStartDate) return 'admission';
  if (d <= p.surgeryEndDate) return 'surgery';
  if (d <= p.dischargeDate) return 'recovery';
  return 'rest';
};

const phaseLabel: Record<SurgeryPhase, string> = {
  preOp: '术前准备', admission: '住院与检查', surgery: '手术窗口', recovery: '住院恢复', rest: '出院后休息',
};

function planFor(data: AppData, phase: SurgeryPhase) {
  const must = data.reminders.filter((r) => r.priority === 'must' && !r.done).map((r) => r.title);
  const base = phase === 'preOp' ? ['确认入院和检查安排', '只准备最必要的住院物品']
    : phase === 'admission' ? ['按通知完成检查和禁食准备', '把想问医生的问题写下来']
    : phase === 'surgery' ? ['按医嘱配合，其他事先放下', '有人陪伴或能联系到即可']
    : phase === 'recovery' ? ['按医嘱休息、观察与活动', '只处理必要沟通']
    : ['吃饭、休息、短暂走动', '把工作和家务降到最低配'];
  const low = data.daily.energy <= 2 || data.daily.discomfort === '明显';
  return {
    must: [...must, ...base].slice(0, 3),
    defer: low ? ['非紧急工作和社交可以往后放。', '家务只做最必要的一点。', '不需要证明自己恢复得很快。'] : ['不急的事可以留到明天。', '不必把恢复期排满。'],
    prompt: low ? '今天的标准可以低一点。先照顾身体，再谈效率。' : '身体允许时做一点点即可，不需要赶进度。',
  };
}

function App() {
  const [data, setData] = useState<AppData>(load);
  const [tab, setTab] = useState<'today' | 'reminders' | 'records' | 'relax'>('today');
  const [note, setNote] = useState('');
  const [diary, setDiary] = useState('');
  const [reminder, setReminder] = useState('');
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(data)), [data]);
  useEffect(() => { if ('serviceWorker' in navigator) navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined); }, []);
  const phase = phaseFor(data);
  const plan = useMemo(() => planFor(data, phase), [data, phase]);
  const updateDaily = (patch: Partial<AppData['daily']>) => setData((v) => ({ ...v, daily: { ...v.daily, ...patch } }));
  const toggle = (item: ReminderItem) => setData((v) => ({ ...v, reminders: v.reminders.map((r) => r.id === item.id ? { ...r, done: !r.done } : r) }));
  const addReminder = () => {
    if (!reminder.trim()) return;
    setData((v) => ({ ...v, reminders: [{ id: id(), title: reminder.trim(), priority: 'optional', time: '', repeat: false, done: false, note: '', doctorAssigned: false }, ...v.reminders] }));
    setReminder('');
  };
  const saveRecord = () => {
    const item: BodyRecord = { date: today(), pain: 0, sleep: '一般', appetite: '一般', energy: data.daily.energy, mood: data.daily.mood, newSymptoms: note, temperature: '', stool: '', notes: '' };
    setData((v) => ({ ...v, records: [item, ...v.records.filter((r) => r.date !== item.date)] }));
    setNote('');
  };
  const saveDiary = () => {
    if (!diary.trim()) return;
    const item: DiaryEntry = { id: id(), date: today(), prompt: '今天有什么小事让你舒服一点？', content: diary.trim() };
    setData((v) => ({ ...v, diaries: [item, ...v.diaries] }));
    setDiary('');
  };

  return <div className="app-shell">
    <header className="hero"><p>恢复中</p><h1>今天先这样</h1><span>{phaseLabel[phase]}</span></header>
    <main>
      {tab === 'today' && <>
        <section className="card"><h2>当前流程</h2><p className="muted">围绕畸胎瘤腹腔镜：术前准备、住院、术后恢复与两周休息。</p><div className="timeline"><span>入院<br/><b>{data.profile.admissionDate}</b></span><span>手术<br/><b>{data.profile.surgeryStartDate}</b></span><span>出院<br/><b>{data.profile.dischargeDate}</b></span><span>休息到<br/><b>{data.profile.restUntilDate}</b></span></div></section>
        <section className="card"><h2>今天的状态</h2><label>体力 <input type="range" min="1" max="5" value={data.daily.energy} onChange={(e) => updateDaily({ energy: Number(e.target.value) as 1|2|3|4|5 })}/><b>{data.daily.energy}/5</b></label><label>心情 <input type="range" min="1" max="5" value={data.daily.mood} onChange={(e) => updateDaily({ mood: Number(e.target.value) as 1|2|3|4|5 })}/><b>{data.daily.mood}/5</b></label><div className="chips">{(['无','有一点','明显'] as const).map((v) => <button className={data.daily.discomfort === v ? 'active' : ''} onClick={() => updateDaily({ discomfort: v })}>{v}</button>)}</div></section>
        <section className="card soft"><h2>今天只做三件事</h2><p>{plan.prompt}</p><ol>{plan.must.map((v) => <li key={v}>{v}</li>)}</ol></section>
        <section className="card"><h2>今天可以取消什么</h2><p>{plan.defer[0]}</p></section>
      </>}
      {tab === 'reminders' && <section className="card"><h2>提醒</h2><div className="add-row"><input value={reminder} onChange={(e) => setReminder(e.target.value)} placeholder="新增提醒"/><button onClick={addReminder}>添加</button></div><div className="list">{data.reminders.map((r) => <label key={r.id} className={r.done ? 'done' : ''}><input type="checkbox" checked={r.done} onChange={() => toggle(r)}/><span>{r.title}{r.doctorAssigned ? ' · 医生交代' : ''}</span></label>)}</div></section>}
      {tab === 'records' && <section className="card"><h2>身体记录</h2><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="今天新的或加重的不适；也可以只写一句。"/><button onClick={saveRecord}>保存今天记录</button><div className="list">{data.records.map((r) => <article key={r.date}><b>{r.date}</b><p>{r.newSymptoms || '未记录特殊不适'}</p></article>)}</div></section>}
      {tab === 'relax' && <section className="card soft"><h2>先歇一会儿</h2><p>松开肩膀和下巴，慢慢呼气五次。恢复本来就不需要一直努力。</p><textarea value={diary} onChange={(e) => setDiary(e.target.value)} placeholder="今天有什么小事让你舒服一点？"/><button onClick={saveDiary}>保存一句日记</button><div className="list">{data.diaries.map((d) => <article key={d.id}><b>{d.date}</b><p>{d.content}</p></article>)}</div></section>}
    </main>
    <nav>{([['today','今天'],['reminders','提醒'],['records','记录'],['relax','放松']] as const).map(([id,label]) => <button className={tab === id ? 'nav-active' : ''} onClick={() => setTab(id)}>{label}</button>)}</nav>
  </div>;
}

export default App;
