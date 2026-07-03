const DATA_KEY = 'recovery-lite-data-v2';
const BOOK_KEY = 'recovery-lite-book-v1';

export const migrateLegacyRecords = () => {
  try {
    const data = JSON.parse(localStorage.getItem(DATA_KEY) || 'null');
    if (!Array.isArray(data?.records)) return;
    const book = JSON.parse(localStorage.getItem(BOOK_KEY) || '{}') as Record<string, Record<string, unknown>>;
    data.records.forEach((entry: Record<string, unknown>) => {
      const date = typeof entry.date === 'string' ? entry.date : '';
      if (!date) return;
      book[date] = { ...(book[date] ?? {}), ...entry, date };
    });
    localStorage.setItem(BOOK_KEY, JSON.stringify(book));
  } catch { /* ignore malformed local data */ }
};
