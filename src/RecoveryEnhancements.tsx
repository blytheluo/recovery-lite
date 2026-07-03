import { useEffect } from 'react';
import AppNext from './AppNext';
import { pauseCards } from './pauseCards';
import './playful.css';
import './record-layout.css';

const DATA_KEY = 'recovery-lite-data-v2';
const BOOK_KEY = 'recovery-lite-book-v1';

const dailyCard = () => {
  const key = new Date().toISOString().slice(0, 10);
  const index = key.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % pauseCards.length;
  return pauseCards[index];
};

const loadBook = () => {
  try { return JSON.parse(localStorage.getItem(BOOK_KEY) || '{}') as Record<string, unknown>; } catch { return {}; }
};

const archiveToday = () => {
  try {
    const data = JSON.parse(localStorage.getItem(DATA_KEY) || 'null');
    if (!data?.daily?.date || !data?.drafts?.record) return;
    const book = loadBook() as Record<string, Record<string, unknown>>;
    book[data.daily.date] = { date: data.daily.date, energy: data.daily.energy, mood: data.daily.mood, rhythm: data.daily.discomfort, ...data.drafts.record };
    localStorage.setItem(BOOK_KEY, JSON.stringify(book));
  } catch { /* keep app usable if local storage is unavailable */ }
};

const formatBook = () => {
  const book = loadBook() as Record<string, Record<string, unknown>>;
  const dates = Object.keys(book).sort();
  if (!dates.length) return '恢复记录摘要\n\n还没有可分享的记录。';
  const lines = dates.map((date) => {
    const entry = book[date];
    return `${date}｜体力 ${entry.energy ?? '-'} /5｜心情 ${entry.mood ?? '-'} /5｜疼痛 ${entry.pain ?? '-'} /10｜喝水 ${entry.hydration ?? '-'}｜活动 ${entry.activity ?? '-'}｜排气 ${entry.gas ?? '-'}｜排便 ${entry.stool ?? '-'}｜出血/分泌物 ${entry.bleeding ?? '-'}`;
  });
  return `恢复记录摘要（${dates.length} 天）\n\n${lines.join('\n')}`;
};

export default function RecoveryEnhancements() {
  useEffect(() => {
    const syncRhythm = () => {
      const cards = Array.from(document.querySelectorAll('.next-card'));
      const stateCard = cards.find((card) => card.querySelector('h2')?.textContent === '今天的状态');
      if (!stateCard) return;
      const title = stateCard.querySelector('h2');
      if (title) title.textContent = '今天的节奏';
      const chips = Array.from(stateCard.querySelectorAll('.next-chips button')) as HTMLButtonElement[];
      if (chips.length >= 3) {
        chips[0].textContent = '按平常';
        chips[1].style.display = 'none';
        chips[2].textContent = '只做必要的事';
      }
      if (!stateCard.querySelector('.next-rhythm-help')) {
        const hint = document.createElement('p');
        hint.className = 'next-muted next-rhythm-help';
        hint.textContent = '选“只做必要的事”时，首页会自动把今天的要求降下来。';
        stateCard.querySelector('.next-chips')?.insertAdjacentElement('afterend', hint);
      }
    };

    const simplifyRecordPanel = () => {
      const cards = Array.from(document.querySelectorAll('.next-card'));
      const recordCard = cards.find((card) => card.querySelector('h2')?.textContent === '身体记录');
      if (!recordCard) return;
      const hint = recordCard.querySelector('.next-muted');
      if (hint) hint.textContent = '点选即自动保存在这台手机里；多天记录会归档在恢复小册。';
      const textarea = recordCard.querySelector('textarea');
      if (textarea) (textarea as HTMLElement).style.display = 'none';
      const saveButton = Array.from(recordCard.querySelectorAll('button')).find((button) => button.textContent === '保存今天记录');
      if (saveButton) (saveButton as HTMLElement).style.display = 'none';
      const history = recordCard.querySelector('.next-list');
      if (history) (history as HTMLElement).style.display = 'none';
      if (!recordCard.querySelector('.next-book-card')) {
        const book = document.createElement('section');
        book.className = 'next-book-card';
        const title = document.createElement('strong');
        title.textContent = '恢复小册';
        const text = document.createElement('p');
        text.textContent = '需要回看或发给 ChatGPT 时，可以复制多天摘要。';
        const button = document.createElement('button');
        button.className = 'next-copy-book';
        button.textContent = '复制记录摘要';
        button.addEventListener('click', async () => {
          const summary = formatBook();
          try {
            await navigator.clipboard.writeText(summary);
            button.textContent = '已复制，回到 ChatGPT 粘贴';
          } catch {
            const area = document.createElement('textarea');
            area.value = summary;
            area.readOnly = true;
            area.className = 'next-book-text';
            book.append(area);
            area.select();
            button.textContent = '请长按复制下方文字';
          }
        });
        book.append(title, text, button);
        recordCard.append(book);
      }
    };

    const syncCard = () => {
      archiveToday();
      syncRhythm();
      simplifyRecordPanel();
      const diary = document.querySelector('textarea[placeholder*="今天有什么小事"]');
      const panel = diary?.closest('.next-card');
      const host = panel?.parentElement;
      const existingCards = Array.from(document.querySelectorAll('.next-daily-card'));
      if (!panel || !host) { existingCards.forEach((card) => card.remove()); return; }
      existingCards.forEach((card) => { if (card.parentElement !== host || card.nextElementSibling !== panel) card.remove(); });
      if (host.querySelector('.next-daily-card')) return;
      const [title, story, aside] = dailyCard();
      const card = document.createElement('section');
      card.className = 'next-card next-soft next-daily-card';
      const mark = document.createElement('div'); mark.className = 'next-story-mark'; mark.textContent = '✦';
      const kicker = document.createElement('p'); kicker.className = 'next-kicker'; kicker.textContent = '今日口袋故事';
      const heading = document.createElement('h2'); heading.textContent = title;
      const body = document.createElement('p'); body.className = 'next-story-copy'; body.textContent = story;
      const button = document.createElement('button'); button.className = 'next-link'; button.textContent = '翻到另一面';
      let showingAside = false;
      button.addEventListener('click', () => { showingAside = !showingAside; body.textContent = showingAside ? aside : story; button.textContent = showingAside ? '读回故事' : '翻到另一面'; });
      card.append(mark, kicker, heading, body, button);
      host.insertBefore(card, panel);
    };

    syncCard();
    const timer = window.setInterval(syncCard, 500);
    const moveToTop = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('.next-nav button')) window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
    };
    document.addEventListener('click', moveToTop);
    return () => { window.clearInterval(timer); document.removeEventListener('click', moveToTop); };
  }, []);

  return <AppNext />;
}
