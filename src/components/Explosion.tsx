import { useEffect, useRef } from 'react';
import { explosion } from '../ascii/explosion';

interface Props {
  /** The goal whose tile the blast starts from. */
  goalId: string;
  /** Hex colors: the cloud, the shock ring, then the sparks take them in turn. */
  colors: string[];
  onEnd: () => void;
}

/** One ASCII blast over the tile of a goal just reached. */
export function Explosion({ goalId, colors, onEnd }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);

  // One blast per mount: the parent remounts it with a new key to play another.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onEnd();
      return;
    }
    let stop = () => {};
    // Lets the sheet close first, so the tile is in place.
    const timer = window.setTimeout(() => {
      if (!canvas.current) return;
      const tile = document.querySelector(`[data-goal="${CSS.escape(goalId)}"]`);
      let box = tile?.getBoundingClientRect();
      // A tile under the bottom nav counts as hidden.
      const navTop = window.innerHeight - 80;
      if (tile && box && (box.top < 0 || box.bottom > navTop)) {
        tile.scrollIntoView({ block: 'center', behavior: 'instant' });
        box = tile.getBoundingClientRect();
      }
      const x = box ? box.left + box.width / 2 : window.innerWidth / 2;
      const y = box ? box.top + box.height / 2 : window.innerHeight / 2;
      stop = explosion(canvas.current, colors, x, y, onEnd);
    }, 250);
    return () => {
      window.clearTimeout(timer);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvas} className="blast" aria-hidden="true" />;
}
