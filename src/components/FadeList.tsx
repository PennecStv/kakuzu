import { type ReactNode, useState } from 'react';

/**
 * A list whose bottom fades while rows remain below, when its class makes it scroll.
 * Remount it (new key) when its content changes, so it starts back at the top.
 */
export function FadeList({ className, children }: { className: string; children: ReactNode }) {
  const [end, setEnd] = useState(false);
  return (
    <ul
      className={`${className}${end ? ' is-end' : ''}`}
      onScroll={(e) => {
        const el = e.currentTarget;
        setEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 2);
      }}
    >
      {children}
    </ul>
  );
}
