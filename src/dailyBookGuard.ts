const DATA_KEY = 'recovery-lite-data-v2';
const BOOK_KEY = 'recovery-lite-book-v1';

const today = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const blankRecord = () => ({ note: '', pain: 0, temperature: '', bleeding: '无', appetite: '一般', hydration: '可以', activity: '没有', gas: '不确定', stool: '不确定' });

try {
  const data = JSON.parse(localStorage.getItem(DATA_KEY) || 'null');
  const book = JSON.parse(localStorage.getItem(BOOK_KEY) || '{}') as Record<string, Record<string, unknown>>;
  if (Array.isArray(data?.records)) {
    data.records.forEach((entry: Record<string, unknown>) => {
      const date = typeof entry.date === 'string' ? entry.date : '';
      if (date) book[date] = { ...(book[date] ?? {}), ...entry, date };
    });
  }
  if (data?.daily?.date) {
    const oldDate = data.daily.date;
    if (data.drafts?.record) book[oldDate] = { ...(book[oldDate] ?? {}), date: oldDate, energy: data.daily.energy, mood: data.daily.mood, rhythm: data.daily.discomfort, ...data.drafts.record };
    if (oldDate !== today()) {
      data.daily = { ...data.daily, date: today(), energy: 3, mood: 3, discomfort: '无' };
      data.drafts = { ...data.drafts, record: blankRecord() };
      if (Array.isArray(data.reminders)) data.reminders = data.reminders.map((item: { repeat?: boolean }) => item.repeat ? { ...item, done: false } : item);
    }
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  }
  localStorage.setItem(BOOK_KEY, JSON.stringify(book));
} catch { /* ignore malformed local data */ }
