import { bitmapPath } from '../lib/pixels';

// 6×7 letters with two-pixel stems, drawn for this one word.
const K = ['##..##', '##.##.', '####..', '###...', '####..', '##.##.', '##..##'];
const A = ['.####.', '##..##', '##..##', '######', '##..##', '##..##', '##..##'];
const U = ['##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'];
const Z = ['######', '....##', '...##.', '..##..', '.##...', '##....', '######'];

const ADVANCE = 7;
const PATH = [K, A, K, U, Z, U].map((letter, i) => bitmapPath(letter, i * ADVANCE)).join('');

/** "KAKUZU" in pixel letters, with a one-pixel drop shadow in the theme accent. */
export function Wordmark() {
  return (
    <svg className="wordmark" viewBox="0 0 42 8" role="img" aria-label="Kakuzu">
      <path className="wordmark__shadow" d={PATH} transform="translate(1 1)" />
      <path className="wordmark__ink" d={PATH} />
    </svg>
  );
}
