/** The K in ASCII art: a stem of #, arms of slashes. */
const K = ['##   //', '##  // ', '## //  ', '####   ', '## \\\\  ', '##  \\\\ ', '##   \\\\'].join('\n');

/**
 * "Kakuzu": the K in ASCII art in the theme accent, the z swapped for 乙 (otsu), the kanji it looks
 * like, and a stroke of the accent behind the foot of the letters. 乙 is drawn rather than typed so
 * it keeps the weight of the letters whatever CJK font the phone has.
 */
export function Wordmark() {
  return (
    <span className="wordmark" role="img" aria-label="Kakuzu">
      <pre className="wordmark__k" aria-hidden="true">
        {K}
      </pre>
      <span className="wordmark__rest" aria-hidden="true">
        aku
        <svg className="wordmark__otsu" viewBox="0 0 100 129">
          <path d="M10 14H82L14 92Q6 122 40 122H82Q90 122 90 110V96" />
        </svg>
        u
      </span>
    </span>
  );
}
