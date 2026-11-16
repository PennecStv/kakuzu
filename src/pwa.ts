import { useSyncExternalStore } from 'react';

/** Chrome's install prompt event, not yet in the DOM typings. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

// Registered at import time: the event fires once, early, before React mounts.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as InstallPromptEvent;
  notify();
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  notify();
});

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export type InstallState = { kind: 'installed' } | { kind: 'prompt'; install: () => void } | { kind: 'ios' } | { kind: 'unavailable' };

export function useInstall(): InstallState {
  const prompt = useSyncExternalStore(subscribe, () => deferred);
  if (window.matchMedia('(display-mode: standalone)').matches) return { kind: 'installed' };
  if (prompt) {
    return {
      kind: 'prompt',
      install: () => {
        prompt.prompt();
        prompt.userChoice.finally(() => {
          deferred = null;
          notify();
        });
      },
    };
  }
  const iPadOS = /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(navigator.userAgent) || iPadOS) return { kind: 'ios' };
  return { kind: 'unavailable' };
}
