import type { CSSProperties } from 'react';
import type { Category } from '../store/types';

/** The category's kanji on a tile of its color. */
export function Glyph({ category, size = 'md' }: { category: Category | undefined; size?: 'md' | 'lg' }) {
  const tile = category ? `var(--cat-${category.color})` : 'var(--cat-other)';
  return (
    <span className={`glyph glyph--${size}`} style={{ '--tile': tile } as CSSProperties} aria-hidden="true">
      {category?.glyph ?? '?'}
    </span>
  );
}
