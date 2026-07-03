import { useEffect, useMemo, useState } from 'react';
import './styles-next.css';

type Phase = 'preOp' | 'admission' | 'surgery' | 'recovery' | 'rest';
type ChecklistItem = { id: string; phase: Phase; title: string; note?: string; optional?: boolean; done: boolean; custom?: boolean };
type Reminder = { id: string; title: string; repeat?: boolean; done: boolean; doctorAssigned?: boolean };
type RecordDraft = { note: string; pain: number; temperature: string; bleeding: string; appetite: string; hydration: string; activity: string; gas: string; stool: string };
type AppState = {
  profile: { surgeryName?: string; admissionDate: string; surgeryStartDate: string; surgeryEndDate: string; dischargeDate: string; restUntilDate: string };
  daily: { date: string; energy: number; mood: number; discomfort: string };
  reminders: Reminder[];
  checklist: ChecklistItem[];
  records: Array<RecordDraft & { date: string; energy: number; mood: number }>;
  diaries: Array<{ id: string; date: string; content: string }>;
  drafts: { record: RecordDraft; diary: string };
};

const KEY = 'recovery-lite-data-v2';
const phases: Phase[] = ['preOp', 'admission', 'surgery', 'recovery', 'rest'];
const labels: Record<Phase, string> = { preOp: '术前准备', admission: '住院与检查', surgery: '手术窗口', recovery: '住院恢复', rest: '出院后休息' };
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const blankRecord = (): RecordDraft => ({ note: '', pain: 0, temperature: '', bleeding: '无', appetite: '一般', hydration: '可以', activity: '没有', gas: '不确定', stool: '不确定' });
const item = (phase: Phase, title: string, note = '', optional = false): ChecklistItem => ({ id: uid(), phase, title, note, optional, done: false });
const standardChecklist = (): ChecklistItem[] => [
  item('preOp', '确认入院时间、检查安排和禁食禁水要求', '以医院通知为准'),
  item('preOp', '准备身份证、医保卡、检查报告和影像资料'),
  item('preOp', '准备充电器和较长的充电线'),
  item('preOp', '把想问医生的问题写下来'),
  item('admission', '打包宽松开襟上衣、宽松下装和棉袜'),
  item('admission', '带防滑拖鞋、卫生巾、纸巾和洗脸巾'),
  item('admission', '带保温杯和弯头吸管'),
  item('admission', '带漱口水、润唇膏和一次性内裤', '按个人习惯准备'),
  item('surgery', '按病区通知完成术前准备', '不要按网上时间自行判断'),
  item('surgery', '取下首饰、隐形眼镜和可卸指甲装饰', '按医院要求'),
  item('surgery', '确认重要证件、检查资料和手机交给陪护'),
  item('recovery', '按医嘱饮水、活动或休息', '具体安排以病区交代为准'),
  item('recovery', '补充卫生巾、吸管和润唇膏等随手用品'),
  item('recovery', '收腹带', '是否需要及何时使用，先问手术医生', true),
  item('recovery', '口香糖或陈皮', '仅作个人舒适选择，先确认是否适合当前饮食安排', true),
  item('rest', '把工作和家务降到最低配'),
  item('rest', '按医嘱安排复诊、用药和恢复活动'),
];
const fallback = (): AppState => ({
  profile: { surgeryName: '畸胎瘤腹腔镜', admissionDate: '2026-07-06', surgeryStartDate: '2026-07-09', surgeryEndDate: '2026-07-10', dischargeDate: '2026-07-13', restUntilDate: '2026-07-27' },
  daily: { date: today(), energy: 3, mood: 3, discomfort: '无' },
  reminders: [{ id: uid(), title: '按医嘱吃药 / 做检查', done: false, doctorAssigned: true }, { id: uid(), title: '喝一点水、慢慢活动', done: false, repeat: true }],
  checklist: standardChecklist(), records: [], diaries: [], drafts: { record: blankRecord(), diary: '' },
});
const normalize = (raw: unknown): AppState => {
  const base = fallback();
  const saved = (raw ?? {}) as Partial<AppState>;
  const oldRecord = saved.drafts?.record;
  const record = typeof oldRecord === 'string' ? { ...blankRecord(), note: oldRecord } : { ...blankRecord(), ...(oldRecord ?? {}) };
  const state: AppState = {
    ...base,
    ...saved,
    profile: { ...base.profile, ...(saved.profile ?? {}) },
    daily: { ...base.daily, ...(saved.daily ?? {}) },
    reminders: saved.reminders ?? base.reminders,
    checklist: saved.checklist ?? base.checklist,
    records: saved.records ?? [], diaries: saved.diaries ?? [],
    drafts: { record, diary: typeof saved.drafts?.diary === 'string' ? saved.drafts.diary : '' },
  };
  return state.daily.date === today() ? state : { ...state, daily: { ...state.daily, date: today(), energy: 3, mood: 3, discomfort: '无' }, reminders: state.reminders.map((r) => r.repeat ? { ...r, done: false } : r) };
};
const phaseFor = (state: AppState): Phase => {
  const d = today(); const p = state.profile;
  if (d < p.admissionDate) return 'preOp';
  if (d < p.surgeryStartDate) return 'admission';
  if (d <= p.surgeryEndDate) return 'surgery';
  if (d <= p.dischargeDate) return 'recovery';
  return 'rest';
};

function Chips({ value, options, onChange }: { value: string; options: string[]; onChange: (next: string) => void }) {
  return <div className="next-chips">{options.map((option) => <button type="button" key={option} className={value === option ? 'chosen' : ''} onClick={() => onChange(option)}>{option}</button>)}</div>;
}

export default function AppNext() {
  const [state, setState] = useState<AppState>(() => {
    try { return normalize(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { return fallback(); }
  });
  const [tab, setTab] = useState<'today' | 'checklist' | 'reminders' | 'records' | 'relax'>('today');
  const [newChecklist, setNewChecklist] = useState('');
  const [newChecklistPhase, setNewChecklistPhase] = useState<Phase>('preOp');
  const [newReminder, setNewReminder] = useState('');
  const [editReminder, setEditReminder] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => {
    const refresh = () => setState((old) => normalize(old));
    refresh();
    const timer = window.setInterval(refresh, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const phase = phaseFor(state);
  const currentItems = state.checklist.filter((entry) => entry.phase === phase);
  const pendingMust = state.reminders.filter((entry) => !entry.done && entry.doctorAssigned).map((entry) => entry.title);
  const plan = useMemo(() => ({
    prompt: state.daily.energy <= 2 || state.daily.discomfort === '明显' ? '今天的标准可以低一点。先照顾身体，再谈效率。' : '身体允许时做一点点即可，不需要赶进度。',
    tasks: [...pendingMust, ...(phase === 'preOp' ? ['确认入院和检查安排', '只准备最必要的住院物品'] : phase === 'admission' ? ['按通知完成检查准备', '把问题写下来'] : phase === 'surgery' ? ['按医嘱配合，其他事先放下'] : phase === 'recovery' ? ['按医嘱休息、观察与活动'] : ['吃饭、休息、短暂走动'])].slice(0, 3),
  }), [pendingMust.join('|'), phase, state.daily.energy, state.daily.discomfort]);

  const patchProfile = (key: keyof AppState['profile'], value: string) => setState((old) => ({ ...old, profile: { ...old.profile, [key]: value } }));
  const patchDaily = (key: 'energy' | 'mood' | 'discomfort', value: number | string) => setState((old) => ({ ...old, daily: { ...old.daily, [key]: value } }));
  const patchRecord = (key: keyof RecordDraft, value: string | number) => setState((old) => ({ ...old, drafts: { ...old.drafts, record: { ...old.drafts.record, [key]: value } } }));
  const toggleChecklist = (id: string) => setState((old) => ({ ...old, checklist: old.checklist.map((entry) => entry.id === id ? { ...entry, done: !entry.done } : entry) }));
  const toggleReminder = (id: string) => setState((old) => ({ ...old, reminders: old.reminders.map((entry) => entry.id === id ? { ...entry, done: !entry.done } : entry) }));
  const addChecklist = () => { if (!newChecklist.trim()) return; setState((old) => ({ ...old, checklist: [...old.checklist, { id: uid(), phase: newChecklistPhase, title: newChecklist.trim(), done: false, custom: true }] })); setNewChecklist(''); };
  const removeChecklist = (id: string) => setState((old) => ({ ...old, checklist: old.checklist.filter((entry) => entry.id !== id) }));
  const addReminder = () => { if (!newReminder.trim()) return; setState((old) => ({ ...old, reminders: [{ id: uid(), title: newReminder.trim(), done: false }, ...old.reminders] })); setNewReminder(''); };
  const saveReminder = () => { if (!editReminder?.title.trim()) return; setState((old) => ({ ...old, reminders: old.reminders.map((entry) => entry.id === editReminder.id ? { ...entry, title: editReminder.title.trim() } : entry) })); setEditReminder(null); };
  const removeReminder = (id: string) => setState((old) => ({ ...old, reminders: old.reminders.filter((entry) => entry.id !== id) }));
  const saveRecord = () => setState((old) => {
    const draft = old.drafts.record;
    const entry = { ...draft, date: today(), energy: old.daily.energy, mood: old.daily.mood };
    return { ...old, records: [entry, ...old.records.filter((record) => record.date !== entry.date)], drafts: { ...old.drafts, record: blankRecord() } };
  });
  const saveDiary = () => { if (!state.drafts.diary.trim()) return; setState((old) => ({ ...old, diaries: [{ id: uid(), date: today(), content: old.drafts.diary.trim() }, ...old.diaries], drafts: { ...old.drafts, diary: '' } })); };
  const record = state.drafts.record;

  return <div className="next-app">
    <header className="next-hero"><p>恢复中 · {today()}</p><h1>今天先这样</h1><span>{labels[phase]}</span></header>
    <main className="next-main">
      {tab === 'today' && <>
        <section className="next-card"><h2>当前流程</h2><p className="next-muted">页面会按当天日期自动切换阶段。医院临时调整安排时，在这里直接改即可。</p><div className="next-timeline"><span>入院<b>{state.profile.admissionDate}</b></span><span>手术<b>{state.profile.surgeryStartDate}</b></span><span>出院<b>{state.profile.dischargeDate}</b></span><span>休息到<b>{state.profile.restUntilDate}</b></span></div><details><summary>调整时间安排</summary><div className="next-date-grid">{([['admissionDate', '入院日期'], ['surgeryStartDate', '手术开始'], ['surgeryEndDate', '手术结束'], ['dischargeDate', '出院日期'], ['restUntilDate', '休息到']] as Array<[keyof AppState['profile'], string]>).map(([key, label]) => <label key={key}>{label}<input type="date" value={state.profile[key]} onChange={(e) => patchProfile(key, e.target.value)} /></label>)}</div></details></section>
        <section className="next-card"><h2>今天的状态</h2><label>体力<input type="range" min="1" max="5" value={state.daily.energy} onChange={(e) => patchDaily('energy', Number(e.target.value))}/><b>{state.daily.energy}/5</b></label><label>心情<input type="range" min="1" max="5" value={state.daily.mood} onChange={(e) => patchDaily('mood', Number(e.target.value))}/><b>{state.daily.mood}/5</b></label><Chips value={state.daily.discomfort} options={['无', '有一点', '明显']} onChange={(value) => patchDaily('discomfort', value)} /></section>
        <section className="next-card next-soft"><h2>今天只做三件事</h2><p>{plan.prompt}</p><ol>{plan.tasks.map((task) => <li key={task}>{task}</li>)}</ol></section>
        <section className="next-card"><h2>{labels[phase]}清单</h2><p className="next-muted">{currentItems.filter((entry) => entry.done).length}/{currentItems.length} 已完成</p>{currentItems.slice(0, 3).map((entry) => <label className="next-check" key={entry.id}><input type="checkbox" checked={entry.done} onChange={() => toggleChecklist(entry.id)} /><span>{entry.title}</span></label>)}<button className="next-link" onClick={() => setTab('checklist')}>查看完整清单</button></section>
      </>}
      {tab === 'checklist' && <>
        <section className="next-card next-soft"><h2>住院包 / 阶段清单</h2><p>默认清单可以改；医院临时交代的事项也可以自行添加。涉及禁食、饮水、活动等，以医生和护士交代为准。</p></section>
        <section className="next-card"><h2>添加自己的事项</h2><div className="next-add"><select value={newChecklistPhase} onChange={(e) => setNewChecklistPhase(e.target.value as Phase)}>{phases.map((entry) => <option key={entry} value={entry}>{labels[entry]}</option>)}</select><input value={newChecklist} onChange={(e) => setNewChecklist(e.target.value)} placeholder="例如：带某项检查单" /><button onClick={addChecklist}>添加</button></div></section>
        {phases.map((currentPhase) => <section className="next-card" key={currentPhase}><h2>{labels[currentPhase]}</h2>{state.checklist.filter((entry) => entry.phase === currentPhase).map((entry) => <div className="next-row" key={entry.id}><label className="next-check"><input type="checkbox" checked={entry.done} onChange={() => toggleChecklist(entry.id)} /><span>{entry.title}{entry.optional ? ' · 可选' : ''}{entry.note && <small>{entry.note}</small>}</span></label><button className="next-mini" onClick={() => removeChecklist(entry.id)}>删除</button></div>)}</section>)}
      </>}
      {tab === 'reminders' && <section className="next-card"><h2>提醒</h2><p className="next-muted">这里是个人待办，不替代医嘱。标有“每天”的提醒会在新的一天重置。</p><div className="next-add"><input value={newReminder} onChange={(e) => setNewReminder(e.target.value)} placeholder="新增提醒"/><button onClick={addReminder}>添加</button></div>{editReminder && <div className="next-edit"><input value={editReminder.title} onChange={(e) => setEditReminder({ ...editReminder, title: e.target.value })}/><button onClick={saveReminder}>保存</button><button className="next-mini" onClick={() => setEditReminder(null)}>取消</button></div>}<div className="next-list">{state.reminders.map((entry) => <div className="next-row" key={entry.id}><label className="next-check"><input type="checkbox" checked={entry.done} onChange={() => toggleReminder(entry.id)} /><span>{entry.title}{entry.repeat ? ' · 每天' : ''}{entry.doctorAssigned ? ' · 医生交代' : ''}</span></label><div><button className="next-mini" onClick={() => setEditReminder({ id: entry.id, title: entry.title })}>编辑</button><button className="next-mini" onClick={() => removeReminder(entry.id)}>删除</button></div></div>)}</div></section>}
      {tab === 'records' && <section className="next-card"><h2>身体记录</h2><p className="next-muted">每天花半分钟记一次，方便自己回看，也方便查房或复诊时说清变化。它不做医学判断。</p><label>疼痛程度<input type="range" min="0" max="10" value={record.pain} onChange={(e) => patchRecord('pain', Number(e.target.value))}/><b>{record.pain}/10</b></label><label>体温（可空）<input value={record.temperature} onChange={(e) => patchRecord('temperature', e.target.value)} placeholder="例如 36.8" /></label><div className="next-record-grid">{([['出血/分泌物', 'bleeding', ['无', '少量', '较多', '不确定']], ['吃东西', 'appetite', ['差', '一般', '可以']], ['喝水', 'hydration', ['可以', '勉强', '不太行']], ['下床活动', 'activity', ['没有', '一点点', '有']], ['排气', 'gas', ['未排气', '已排气', '不确定']], ['排便', 'stool', ['未排便', '已排便', '不确定']]] as Array<[string, keyof RecordDraft, string[]]>).map(([label, key, options]) => <div key={key}><p>{label}</p><Chips value={String(record[key])} options={options} onChange={(value) => patchRecord(key, value)} /></div>)}</div><textarea value={record.note} onChange={(e) => patchRecord('note', e.target.value)} placeholder="今天新的、加重的或让你担心的不适；也可以只写一句。"/><button onClick={saveRecord}>保存今天记录</button><div className="next-list">{state.records.map((entry) => <article key={entry.date}><b>{entry.date}</b><p>疼痛 {entry.pain}/10 · 出血/分泌物 {entry.bleeding} · 下床活动 {entry.activity}</p><p>{entry.note || '未记录特殊不适'}</p></article>)}</div></section>}
      {tab === 'relax' && <section className="next-card next-soft"><h2>先歇一会儿</h2><p>松开肩膀和下巴，慢慢呼气五次。恢复本来就不需要一直努力。</p><textarea value={state.drafts.diary} onChange={(e) => setState((old) => ({ ...old, drafts: { ...old.drafts, diary: e.target.value } }))} placeholder="今天有什么小事让你舒服一点？"/><button onClick={saveDiary}>保存一句日记</button><div className="next-list">{state.diaries.map((entry) => <article key={entry.id}><b>{entry.date}</b><p>{entry.content}</p></article>)}</div></section>}
    </main>
    <nav className="next-nav">{([['today', '今天'], ['checklist', '清单'], ['reminders', '提醒'], ['records', '记录'], ['relax', '放松']] as const).map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</nav>
  </div>;
}
