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
    const installCard = () => {
      const diary = document.querySelector('textarea[placeholder*="今天有什么小事"]');
      const panel = diary?.closest('.next-card');
      if (!panel || document.querySelector('.next-daily-card')) return;
      const [title, story, aside] = dailyCard();
      const card = document.createElement('section');
      card.className = 'next-card next-soft next-daily-card';
      const kicker = document.createElement('p');
      kicker.className = 'next-kicker';
      kicker.textContent = '今日口袋故事';
      const heading = document.createElement('h2');
      heading.textContent = title;
      const body = document.createElement('p');
      body.textContent = story;
      const button = document.createElement('button');
      button.className = 'next-link';
      button.textContent = '换一个角度';
      let showingAside = false;
      button.addEventListener('click', () => {
        showingAside = !showingAside;
        body.textContent = showingAside ? aside : story;
        button.textContent = showingAside ? '读回小故事' : '换一个角度';
      });
      card.append(kicker, heading, body, button);
      panel.parentElement?.insertBefore(card, panel);
    };

    const observer = new MutationObserver(installCard);
    observer.observe(document.body, { childList: true, subtree: true });
    installCard();
    const moveToTop = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('.next-nav button')) window.setTimeout(() => window.scrollTo(0, 0), 0);
    };
    document.addEventListener('click', moveToTop);
    return () => { observer.disconnect(); document.removeEventListener('click', moveToTop); };
  }, []);

  return <AppNext />;
}
