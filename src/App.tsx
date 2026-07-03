import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  type AlertNote,
  type AppData,
  type BodyRecord,
  type DiaryEntry,
  type DoctorNote,
  type ReminderItem,
  type RecoveryProfile,
} from './types';
import { clamp, cn, defaultLowEnergyIdeas, formatDayNumber, makeId, recoveryPrompt, relaxCards, STORAGE_KEY, summarizeThreeThings, todaysPrompt, todayISO } from './lib';

type Tab = 'today' | 'reminders' | 'records' | 'hospital' | 'relax';

const fallbackData = (): AppData => ({
  profile: {
    mode: 'recovery',
    startDate: todayISO(),
    enabled: false,
  },
  daily: {
    date: todayISO(),
    dayNumber: 1,
    energy: 3,
    mood: 3,
    discomfort: '无',
    mustDoToday: false,
  },
  reminders: [
    { id: makeId(), title: '按时吃药', priority: 'must', time: '08:00', repeat: false, done: false, note: '按医嘱', doctorAssigned: true },
    { id: makeId(), title: '喝一点水', priority: 'optional', time: '', repeat: false, done: false, note: '', doctorAssigned: false },
  ],
  records: [],
  doctorNotes: [],
  alertNotes: [
    { id: makeId(), title: '本工具不提供医学判断', description: '如果症状让你担心，优先联系医生或医疗机构。' },
  ],
  diaries: [],
  hospital: {
    testPlan: '',
    fastingReminder: '',
    questions: [],
    bagList: [],
    lowEnergyIdeas: [...defaultLowEnergyIdeas],
  },
});

const loadData = (): AppData => {
  if (typeof window === 'undefined') return fallbackData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallbackData();
    const parsed = JSON.parse(raw) as AppData;
    return {
      ...fallbackData(),
      ...parsed,
      hospital: {
        ...fallbackData().hospital,
        ...(parsed.hospital ?? {}),
      },
    };
  } catch {
    return fallbackData();
  }
};

const saveData = (data: AppData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) => (
  <section className="panel">
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </div>
    {children}
  </section>
);

const Pill = ({ children, active = false }: { children: ReactNode; active?: boolean }) => (
  <span className={cn('pill', active && 'pill-active')}>{children}</span>
);

const Card = ({ children, tone = 'base' }: { children: ReactNode; tone?: 'base' | 'soft' }) => (
  <div className={cn('card', tone === 'soft' && 'card-soft')}>{children}</div>
);

const InputRow = ({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) => (
  <label className="field">
    <span className="field-label">{label}</span>
    {children}
    {hint ? <span className="field-hint">{hint}</span> : null}
  </label>
);

function App() {
  const [data, setData] = useState<AppData>(loadData);
  const [tab, setTab] = useState<Tab>('today');
  const [relaxIndex, setRelaxIndex] = useState(0);

  useEffect(() => {
    saveData(data);
  }, [data]);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  const dayNumber = useMemo(
    () => (data.profile.enabled ? formatDayNumber(data.profile.startDate, data.daily.date || todayISO()) : null),
    [data.profile.enabled, data.profile.startDate, data.daily.date],
  );

  const summary = useMemo(
    () =>
      summarizeThreeThings({
        energy: data.daily.energy,
        discomfort: data.daily.discomfort,
        reminders: data.reminders,
      }),
    [data.daily.discomfort, data.daily.energy, data.reminders],
  );

  const mustReminder = data.reminders.find((item) => item.priority === 'must' && !item.done);

  const updateProfile = (patch: Partial<RecoveryProfile>) =>
    setData((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }));

  const updateDaily = (patch: Partial<AppData['daily']>) =>
    setData((prev) => ({ ...prev, daily: { ...prev.daily, ...patch } }));

  const addReminder = (item: Partial<ReminderItem>) => {
    setData((prev) => ({
      ...prev,
      reminders: [
        {
          id: makeId(),
          title: item.title?.trim() || '未命名事项',
          priority: item.priority ?? 'optional',
          time: item.time ?? '',
          repeat: item.repeat ?? false,
          done: false,
          note: item.note ?? '',
          doctorAssigned: item.doctorAssigned ?? false,
        },
        ...prev.reminders,
      ],
    }));
  };

  const addRecord = (record: Partial<BodyRecord>) => {
    const entry: BodyRecord = {
      date: record.date || todayISO(),
      pain: record.pain ?? 0,
      sleep: record.sleep ?? '一般',
      appetite: record.appetite ?? '一般',
      energy: record.energy ?? 3,
      mood: record.mood ?? 3,
      newSymptoms: record.newSymptoms ?? '',
      temperature: record.temperature ?? '',
      stool: record.stool ?? '',
      notes: record.notes ?? '',
    };
    setData((prev) => ({
      ...prev,
      records: [entry, ...prev.records.filter((item) => item.date !== entry.date)],
    }));
  };

  const addDoctorNote = (note: Partial<DoctorNote>) => {
    setData((prev) => ({
      ...prev,
      doctorNotes: [
        {
          id: makeId(),
          date: note.date || todayISO(),
          summary: note.summary || '',
          unclear: note.unclear || '',
          nextQuestion: note.nextQuestion || '',
          followUpDate: note.followUpDate || '',
        },
        ...prev.doctorNotes,
      ],
    }));
  };

  const addDiary = (entry: Partial<DiaryEntry>) => {
    setData((prev) => ({
      ...prev,
      diaries: [
        {
          id: makeId(),
          date: entry.date || todayISO(),
          prompt: entry.prompt || '',
          content: entry.content || '',
        },
        ...prev.diaries,
      ],
    }));
  };

  const addHospitalQuestion = (text: string) => {
    if (!text.trim()) return;
    setData((prev) => ({
      ...prev,
      hospital: {
        ...prev.hospital,
        questions: [{ id: makeId(), text: text.trim(), asked: false }, ...prev.hospital.questions],
      },
    }));
  };

  const addBagItem = (text: string) => {
    if (!text.trim()) return;
    setData((prev) => ({
      ...prev,
      hospital: {
        ...prev.hospital,
        bagList: [{ id: makeId(), text: text.trim(), packed: false }, ...prev.hospital.bagList],
      },
    }));
  };

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'today', label: '今天' },
    { id: 'reminders', label: '提醒' },
    { id: 'records', label: '记录' },
    { id: 'hospital', label: '住院模式' },
    { id: 'relax', label: '先歇一会儿' },
  ];

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="brand">
          <span className="brand-mark" />
          <div>
            <p className="eyebrow">恢复中</p>
            <h1>今天先这样</h1>
          </div>
        </div>
        <p className="hero-copy">一个面向低能量状态的轻量 PWA。默认本地保存，不替代医疗建议。</p>
      </header>

      <main className="content">
        {tab === 'today' ? (
          <>
            <Section title="今日状态" subtitle="先看身体，再决定今天要做多少。">
              <div className="stack">
                <InputRow label="恢复计划">
                  <div className="choice-row">
                    {[
                      ['recovery', '恢复计划'],
                      ['postOp', '术后第几天'],
                      ['hospital', '住院第几天'],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        className={cn('chip', data.profile.mode === value && 'chip-active')}
                        onClick={() => updateProfile({ mode: value as RecoveryProfile['mode'] })}
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </InputRow>
                <InputRow label="开始日期" hint="用于计算第几天">
                  <input
                    type="date"
                    value={data.profile.startDate}
                    onChange={(e) => updateProfile({ startDate: e.target.value })}
                  />
                </InputRow>
                <InputRow label="今天第几天">
                  <div className="day-number">{data.profile.enabled ? dayNumber : '未启用'}</div>
                  <button type="button" className="text-button" onClick={() => updateProfile({ enabled: !data.profile.enabled })}>
                    {data.profile.enabled ? '关闭天数显示' : '启用天数显示'}
                  </button>
                </InputRow>
                <InputRow label="体力评分">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={data.daily.energy}
                    onChange={(e) => updateDaily({ energy: Number(e.target.value) as AppData['daily']['energy'] })}
                  />
                  <div className="scale-row">{[1, 2, 3, 4, 5].map((n) => <span key={n}>{n}</span>)}</div>
                </InputRow>
                <InputRow label="心情评分">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={data.daily.mood}
                    onChange={(e) => updateDaily({ mood: Number(e.target.value) as AppData['daily']['mood'] })}
                  />
                </InputRow>
                <InputRow label="不舒服程度">
                  <div className="choice-row">
                    {(['无', '有一点', '明显'] as const).map((level) => (
                      <button
                        key={level}
                        className={cn('chip', data.daily.discomfort === level && 'chip-active')}
                        onClick={() => updateDaily({ discomfort: level })}
                        type="button"
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </InputRow>
                <InputRow label="今天有没有必须完成的事项">
                  <div className="choice-row">
                    {[
                      [true, '有'],
                      [false, '没有'],
                    ].map(([value, label]) => (
                      <button
                        key={label}
                        className={cn('chip', data.daily.mustDoToday === value && 'chip-active')}
                        onClick={() => updateDaily({ mustDoToday: value })}
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </InputRow>
              </div>
            </Section>

            <Section title="今天只做三件事" subtitle="根据你的状态和提醒，自动整理成更低压力的版本。">
              <div className="stack">
                <Card>
                  <h3>必须做</h3>
                  <ul>
                    {summary.must.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </Card>
                <Card tone="soft">
                  <h3>可选做</h3>
                  <ul>
                    {summary.optional.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </Card>
                <Card tone="soft">
                  <h3>可以延期</h3>
                  <ul>
                    {summary.defer.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </Card>
              </div>
            </Section>

            <Section title="最近一条必须提醒" subtitle="这里只放最靠前、最重要的一条。">
              {mustReminder ? (
                <Card>
                  <div className="card-line">
                    <strong>{mustReminder.title}</strong>
                    <Pill active={mustReminder.doctorAssigned}>医生交代</Pill>
                  </div>
                  <p>{mustReminder.note || '没有备注'}</p>
                  {mustReminder.time ? <p className="muted">{mustReminder.time}</p> : null}
                </Card>
              ) : (
                <Card>今天没有设置必须提醒。</Card>
              )}
            </Section>

            <Section title="恢复期提示" subtitle="不鸡汤，只做一点轻提示。">
              <Card>
                <p>{todaysPrompt({ energy: data.daily.energy, discomfort: data.daily.discomfort, mustDoToday: data.daily.mustDoToday })}</p>
                <div className="quote-list">
                  {recoveryPrompt.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </Card>
            </Section>
          </>
        ) : null}

        {tab === 'reminders' ? (
          <>
            <Section title="今日提醒" subtitle="分成必须做和做了很好两类。可以跳过，也可以以后再补。">
              <ReminderForm onAdd={addReminder} />
              <div className="stack">
                {(['must', 'optional'] as const).map((priority) => (
                  <div key={priority}>
                    <h3 className="group-title">{priority === 'must' ? '必须做' : '做了很好，不做也没关系'}</h3>
                    <div className="stack">
                      {data.reminders.filter((item) => item.priority === priority).length ? (
                        data.reminders
                          .filter((item) => item.priority === priority)
                          .map((item) => (
                            <Card key={item.id}>
                              <div className="card-line">
                                <strong>{item.title}</strong>
                                <button
                                  className="text-button"
                                  type="button"
                                  onClick={() =>
                                    setData((prev) => ({
                                      ...prev,
                                      reminders: prev.reminders.map((r) => (r.id === item.id ? { ...r, done: !r.done } : r)),
                                    }))
                                  }
                                >
                                  {item.done ? '已完成' : '标记完成'}
                                </button>
                              </div>
                              <div className="meta-row">
                                {item.time ? <Pill>{item.time}</Pill> : null}
                                {item.repeat ? <Pill>重复</Pill> : null}
                                {item.doctorAssigned ? <Pill active>医生交代</Pill> : null}
                              </div>
                              {item.note ? <p>{item.note}</p> : null}
                            </Card>
                          ))
                      ) : (
                        <Card>暂无事项。</Card>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </>
        ) : null}

        {tab === 'records' ? (
          <>
            <Section title="身体记录" subtitle="只记能帮助回看变化的内容，不做复杂图表。">
              <BodyRecordForm onSave={addRecord} />
              <div className="stack">
                {data.records.length ? (
                  data.records.map((record) => (
                    <Card key={record.date}>
                      <div className="card-line">
                        <strong>{record.date}</strong>
                        <Pill>疼痛 {record.pain}/10</Pill>
                      </div>
                      <div className="meta-row">
                        <Pill>睡眠 {record.sleep}</Pill>
                        <Pill>食欲 {record.appetite}</Pill>
                        <Pill>精力 {record.energy}/5</Pill>
                        <Pill>情绪 {record.mood}/5</Pill>
                      </div>
                      {record.newSymptoms ? <p>新的或加重的不适：{record.newSymptoms}</p> : null}
                      {(record.temperature || record.stool || record.notes) ? (
                        <div className="muted-block">
                          {record.temperature ? <p>体温：{record.temperature}</p> : null}
                          {record.stool ? <p>排便/排气：{record.stool}</p> : null}
                          {record.notes ? <p>备注：{record.notes}</p> : null}
                        </div>
                      ) : null}
                    </Card>
                  ))
                ) : (
                  <Card>还没有记录。你可以先记最明显的身体变化。</Card>
                )}
              </div>
            </Section>

            <Section title="医生交代与需联系医院的情况" subtitle="只放你自己录入的医嘱、出院重点和需要及时联系医院的情况。">
              <div className="stack">
                <AlertForm onSaveAlert={(note) => setData((prev) => ({ ...prev, alertNotes: [note, ...prev.alertNotes] }))} onSaveDoctor={addDoctorNote} />
                {data.alertNotes.map((note) => (
                  <Card key={note.id}>
                    <strong>{note.title}</strong>
                    <p>{note.description}</p>
                  </Card>
                ))}
                {data.doctorNotes.length ? (
                  data.doctorNotes.map((note) => (
                    <Card key={note.id}>
                      <div className="card-line">
                        <strong>{note.date}</strong>
                        {note.followUpDate ? <Pill>复诊 {note.followUpDate}</Pill> : null}
                      </div>
                      {note.summary ? <p>交代内容：{note.summary}</p> : null}
                      {note.unclear ? <p>没听懂：{note.unclear}</p> : null}
                      {note.nextQuestion ? <p>下次确认：{note.nextQuestion}</p> : null}
                    </Card>
                  ))
                ) : (
                  <Card>还没有医生记录。</Card>
                )}
                <Card tone="soft">
                  <p>本工具不提供医学判断。如出现令你担心的症状，请优先联系医生或医疗机构。</p>
                </Card>
              </div>
            </Section>
          </>
        ) : null}

        {tab === 'hospital' ? (
          <>
            <Section title="住院模式" subtitle="把住院期间最容易忘掉的事情放在同一页。">
              <HospitalForm
                data={data}
                onChange={(patch) =>
                  setData((prev) => ({
                    ...prev,
                    hospital: { ...prev.hospital, ...patch },
                  }))
                }
                onAddQuestion={addHospitalQuestion}
                onAddBagItem={addBagItem}
                onToggleQuestion={(id) =>
                  setData((prev) => ({
                    ...prev,
                    hospital: {
                      ...prev.hospital,
                      questions: prev.hospital.questions.map((item) => (item.id === id ? { ...item, asked: !item.asked } : item)),
                    },
                  }))
                }
                onToggleBag={(id) =>
                  setData((prev) => ({
                    ...prev,
                    hospital: {
                      ...prev.hospital,
                      bagList: prev.hospital.bagList.map((item) => (item.id === id ? { ...item, packed: !item.packed } : item)),
                    },
                  }))
                }
              />
            </Section>
          </>
        ) : null}

        {tab === 'relax' ? (
          <>
            <Section title="先歇一会儿" subtitle="不需要努力完成，只要能稍微松一点就行。">
              <div className="stack">
                <Card>
                  <div className="card-line">
                    <strong>3 分钟呼吸提示</strong>
                    <button className="text-button" type="button" onClick={() => setRelaxIndex((n) => (n + 1) % relaxCards.length)}>
                      换一张卡
                    </button>
                  </div>
                  <p>吸气 4 秒，停 2 秒，呼气 6 秒。重复几轮就可以停。</p>
                </Card>
                <Card tone="soft">
                  <strong>今天可以取消什么</strong>
                  <p>把不必要的解释、无关紧要的回复、临时加进来的安排先放下。</p>
                </Card>
                <Card>
                  <strong>躺着能做的小放松</strong>
                  <ul>
                    <li>松开肩膀和下巴</li>
                    <li>慢慢数 5 次呼气</li>
                    <li>把手放在腹部，感受起伏</li>
                  </ul>
                </Card>
                <Card tone="soft">
                  <strong>不费脑的内容建议占位区</strong>
                  <p>这里可以放你喜欢的白噪音、播客、轻音乐或短视频清单。</p>
                </Card>
                <Card>
                  <strong>随机恢复期提示</strong>
                  <p>{relaxCards[relaxIndex]}</p>
                </Card>
                <DiaryForm onAdd={addDiary} />
                <div className="stack">
                  {data.diaries.length ? (
                    data.diaries.map((entry) => (
                      <Card key={entry.id}>
                        <div className="card-line">
                          <strong>{entry.date}</strong>
                          <Pill>{entry.prompt.slice(0, 8) || '日记'}</Pill>
                        </div>
                        <p>{entry.prompt}</p>
                        <p className="muted">{entry.content}</p>
                      </Card>
                    ))
                  ) : (
                    <Card>还没有日记。可以只记一句话。</Card>
                  )}
                </div>
              </div>
            </Section>
          </>
        ) : null}
      </main>

      <nav className="bottom-nav">
        {tabs.map((item) => (
          <button key={item.id} type="button" className={cn('nav-item', tab === item.id && 'nav-item-active')} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function ReminderForm({ onAdd }: { onAdd: (item: Partial<ReminderItem>) => void }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'must' | 'optional'>('must');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [doctorAssigned, setDoctorAssigned] = useState(false);

  return (
    <Card tone="soft">
      <div className="stack">
        <InputRow label="新增提醒">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：吃药、检查、喝水" />
        </InputRow>
        <div className="choice-row">
          {(['must', 'optional'] as const).map((value) => (
            <button key={value} type="button" className={cn('chip', priority === value && 'chip-active')} onClick={() => setPriority(value)}>
              {value === 'must' ? '必须做' : '做了很好'}
            </button>
          ))}
        </div>
        <div className="two-col">
          <InputRow label="时间">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </InputRow>
          <InputRow label="备注">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="可选" />
          </InputRow>
        </div>
        <div className="choice-row">
          <button type="button" className={cn('chip', repeat && 'chip-active')} onClick={() => setRepeat(!repeat)}>
            重复
          </button>
          <button type="button" className={cn('chip', doctorAssigned && 'chip-active')} onClick={() => setDoctorAssigned(!doctorAssigned)}>
            医生交代
          </button>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            onAdd({ title, priority, time, note, repeat, doctorAssigned });
            setTitle('');
            setTime('');
            setNote('');
            setRepeat(false);
            setDoctorAssigned(false);
          }}
        >
          添加提醒
        </button>
      </div>
    </Card>
  );
}

function BodyRecordForm({ onSave }: { onSave: (record: Partial<BodyRecord>) => void }) {
  const [date, setDate] = useState(todayISO());
  const [pain, setPain] = useState(2);
  const [sleep, setSleep] = useState<'差' | '一般' | '还可以'>('一般');
  const [appetite, setAppetite] = useState<'差' | '一般' | '可以'>('一般');
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [newSymptoms, setNewSymptoms] = useState('');
  const [temperature, setTemperature] = useState('');
  const [stool, setStool] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <Card tone="soft">
      <div className="stack">
        <div className="two-col">
          <InputRow label="日期">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </InputRow>
          <InputRow label="疼痛 0-10">
            <input type="range" min="0" max="10" value={pain} onChange={(e) => setPain(Number(e.target.value))} />
          </InputRow>
        </div>
        <div className="choice-row">
          {(['差', '一般', '还可以'] as const).map((value) => (
            <button key={value} type="button" className={cn('chip', sleep === value && 'chip-active')} onClick={() => setSleep(value)}>
              睡眠{value}
            </button>
          ))}
        </div>
        <div className="choice-row">
          {(['差', '一般', '可以'] as const).map((value) => (
            <button key={value} type="button" className={cn('chip', appetite === value && 'chip-active')} onClick={() => setAppetite(value)}>
              食欲{value}
            </button>
          ))}
        </div>
        <div className="two-col">
          <InputRow label="精力">
            <input type="range" min="1" max="5" value={energy} onChange={(e) => setEnergy(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)} />
          </InputRow>
          <InputRow label="情绪">
            <input type="range" min="1" max="5" value={mood} onChange={(e) => setMood(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)} />
          </InputRow>
        </div>
        <InputRow label="新的或加重的不适">
          <textarea value={newSymptoms} onChange={(e) => setNewSymptoms(e.target.value)} rows={2} placeholder="可留空" />
        </InputRow>
        <div className="two-col">
          <InputRow label="体温">
            <input value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="例如 37.2" />
          </InputRow>
          <InputRow label="排便/排气">
            <input value={stool} onChange={(e) => setStool(e.target.value)} placeholder="可留空" />
          </InputRow>
        </div>
        <InputRow label="备注">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="例如：晚上更明显，食欲下降" />
        </InputRow>
        <button className="primary-button" type="button" onClick={() => onSave({ date, pain, sleep, appetite, energy, mood, newSymptoms, temperature, stool, notes })}>
          保存记录
        </button>
      </div>
    </Card>
  );
}

function AlertForm({
  onSaveAlert,
  onSaveDoctor,
}: {
  onSaveAlert: (note: AlertNote) => void;
  onSaveDoctor: (note: Partial<DoctorNote>) => void;
}) {
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDescription, setAlertDescription] = useState('');
  const [summary, setSummary] = useState('');
  const [unclear, setUnclear] = useState('');
  const [nextQuestion, setNextQuestion] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  return (
    <Card tone="soft">
      <div className="stack">
        <InputRow label="需联系提醒标题">
          <input value={alertTitle} onChange={(e) => setAlertTitle(e.target.value)} placeholder="例如：发热后联系医院" />
        </InputRow>
        <InputRow label="说明">
          <textarea value={alertDescription} onChange={(e) => setAlertDescription(e.target.value)} rows={2} placeholder="由你自己填写需要优先联系的情况" />
        </InputRow>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            if (!alertTitle.trim() && !alertDescription.trim()) return;
            onSaveAlert({
              id: makeId(),
              title: alertTitle.trim() || '联系医生/医院',
              description: alertDescription.trim() || '由你自己填写需要优先联系的情况。',
            });
            setAlertTitle('');
            setAlertDescription('');
          }}
        >
          保存需联系提醒
        </button>
        <InputRow label="医生交代内容">
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} />
        </InputRow>
        <InputRow label="我没有听懂的地方">
          <textarea value={unclear} onChange={(e) => setUnclear(e.target.value)} rows={2} />
        </InputRow>
        <InputRow label="下次需要确认的问题">
          <textarea value={nextQuestion} onChange={(e) => setNextQuestion(e.target.value)} rows={2} />
        </InputRow>
        <InputRow label="复诊安排">
          <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
        </InputRow>
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            onSaveDoctor({ summary, unclear, nextQuestion, followUpDate });
            setSummary('');
            setUnclear('');
            setNextQuestion('');
            setFollowUpDate('');
          }}
        >
          保存交代记录
        </button>
      </div>
    </Card>
  );
}

function HospitalForm({
  data,
  onChange,
  onAddQuestion,
  onAddBagItem,
  onToggleQuestion,
  onToggleBag,
}: {
  data: AppData;
  onChange: (patch: Partial<AppData['hospital']>) => void;
  onAddQuestion: (text: string) => void;
  onAddBagItem: (text: string) => void;
  onToggleQuestion: (id: string) => void;
  onToggleBag: (id: string) => void;
}) {
  const [question, setQuestion] = useState('');
  const [bagItem, setBagItem] = useState('');

  return (
    <div className="stack">
      <Card tone="soft">
        <div className="stack">
          <InputRow label="今日检查安排">
            <textarea value={data.hospital.testPlan} onChange={(e) => onChange({ testPlan: e.target.value })} rows={2} />
          </InputRow>
          <InputRow label="禁食/饮水提醒">
            <textarea value={data.hospital.fastingReminder} onChange={(e) => onChange({ fastingReminder: e.target.value })} rows={2} />
          </InputRow>
        </div>
      </Card>
      <Card>
        <strong>医生沟通记录</strong>
        <p className="muted">建议把听到的内容和没听懂的地方一起记下来。</p>
      </Card>
      <Card tone="soft">
        <div className="stack">
          <div className="card-line">
            <strong>想问医生的问题</strong>
            <span className="muted">可勾选已问</span>
          </div>
          <div className="inline-form">
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="输入问题后添加" />
            <button
              className="primary-button small"
              type="button"
              onClick={() => {
                onAddQuestion(question);
                setQuestion('');
              }}
            >
              加入
            </button>
          </div>
          <div className="stack">
            {data.hospital.questions.map((item) => (
              <button key={item.id} type="button" className={cn('check-row', item.asked && 'check-row-done')} onClick={() => onToggleQuestion(item.id)}>
                <span>{item.text}</span>
                <span>{item.asked ? '已问' : '未问'}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>
      <Card>
        <div className="stack">
          <strong>家属待带物品</strong>
          <div className="inline-form">
            <input value={bagItem} onChange={(e) => setBagItem(e.target.value)} placeholder="输入物品后添加" />
            <button
              className="primary-button small"
              type="button"
              onClick={() => {
                onAddBagItem(bagItem);
                setBagItem('');
              }}
            >
              加入
            </button>
          </div>
          <div className="stack">
            {data.hospital.bagList.map((item) => (
              <button key={item.id} type="button" className={cn('check-row', item.packed && 'check-row-done')} onClick={() => onToggleBag(item.id)}>
                <span>{item.text}</span>
                <span>{item.packed ? '已备好' : '待准备'}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>
      <Card tone="soft">
        <strong>住院期间的低消耗活动建议</strong>
        <ul>
          {data.hospital.lowEnergyIdeas.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function DiaryForm({ onAdd }: { onAdd: (entry: Partial<DiaryEntry>) => void }) {
  const prompts = [
    '今天身体最明显的感觉是什么？',
    '今天有什么事情比预想中顺利？',
    '今天最想取消的一件事是什么？',
    '有什么小事让你舒服一点？',
    '明天最希望保留什么？',
  ];
  const [prompt, setPrompt] = useState(prompts[0]);
  const [content, setContent] = useState('');

  return (
    <Card tone="soft">
      <div className="stack">
        <strong>恢复期日记</strong>
        <div className="choice-row wrap">
          {prompts.map((item) => (
            <button key={item} type="button" className={cn('chip', prompt === item && 'chip-active')} onClick={() => setPrompt(item)}>
              {item}
            </button>
          ))}
        </div>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="不想写完整也可以，只写一句。" />
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            onAdd({ prompt, content });
            setContent('');
          }}
        >
          保存日记
        </button>
      </div>
    </Card>
  );
}

export default App;