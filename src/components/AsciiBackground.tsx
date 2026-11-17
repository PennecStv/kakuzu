import { useEffect, useRef } from 'react';
import { AsciiEngine } from '../ascii/engine';
import { THEMES } from '../ascii/themes';
import type { ThemeId } from '../store/types';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function AsciiBackground({ theme, motion }: { theme: ThemeId; motion: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<AsciiEngine | null>(null);

  // One engine for the page's life; theme and motion changes are pushed into it.
  useEffect(() => {
    if (!canvas.current) return;
    engine.current = new AsciiEngine(canvas.current, THEMES[theme].scene, motion && !reducedMotion());
    return () => {
      engine.current?.destroy();
      engine.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engine.current?.setScene(THEMES[theme].scene);
  }, [theme]);

  useEffect(() => {
    engine.current?.setMotion(motion && !reducedMotion());
  }, [motion]);

  return <canvas ref={canvas} className="ascii-bg" aria-hidden="true" />;
}
