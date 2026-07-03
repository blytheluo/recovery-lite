import { useEffect } from 'react';
import AppNext from './AppNext';
import { pauseCards } from './pauseCards';

const dailyCard = () => {
  const key = new Date().toISOString().slice(0, 10);
  const index = key.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % pauseCards.length;
  return pauseCards[index];
};

export default function RecoveryEnhancements() {
  useEffect(() => {
    const syncCard = () => {
      const diary = document.querySelector('textarea[placeholder*="今天有什么小事"]');
      const panel = diary?.closest('.next-card');
      const host = panel?.parentElement;
      const existingCards = Array.from(document.querySelectorAll('.next-daily-card'));

      if (!panel || !host) {
        existingCards.forEach((card) => card.remove());
        return;
      }

      existingCards.forEach((card) => {
        if (card.parentElement !== host || card.nextElementSibling !== panel) card.remove();
      });
      if (host.querySelector('.next-daily-card')) return;

      const [title, story, aside] = dailyCard();
      const card = document.createElement('section');
      card.className = 'next-card next-soft next-daily-card';
      const mark = document.createElement('div');
      mark.className = 'next-story-mark';
      mark.textContent = '✦';
      const kicker = document.createElement('p');
      kicker.className = 'next-kicker';
      kicker.textContent = '今日口袋故事';
      const heading = document.createElement('h2');
      heading.textContent = title;
      const body = document.createElement('p');
      body.className = 'next-story-copy';
      body.textContent = story;
      const button = document.createElement('button');
      button.className = 'next-link';
      button.textContent = '翻到另一面';
      let showingAside = false;
      button.addEventListener('click', () => {
        showingAside = !showingAside;
        body.textContent = showingAside ? aside : story;
        button.textContent = showingAside ? '读回故事' : '翻到另一面';
      });
      card.append(mark, kicker, heading, body, button);
      host.insertBefore(card, panel);
    };

    syncCard();
    const timer = window.setInterval(syncCard, 250);
    const moveToTop = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('.next-nav button')) window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
    };
    document.addEventListener('click', moveToTop);
    return () => { window.clearInterval(timer); document.removeEventListener('click', moveToTop); };
  }, []);

  return <AppNext />;
}
