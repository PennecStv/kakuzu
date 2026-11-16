/**
 * SVG path of a bitmap drawn with '#' for lit pixels, one unit per pixel.
 * Each run of a row becomes one rectangle and the whole bitmap one path, so
 * neighbouring pixels never show antialiasing seams between them.
 */
export function bitmapPath(rows: readonly string[], dx = 0, dy = 0): string {
  let d = '';
  rows.forEach((row, y) => {
    for (const run of row.matchAll(/#+/g)) {
      const w = run[0].length;
      d += `M${dx + run.index} ${dy + y}h${w}v1h-${w}z`;
    }
  });
  return d;
}
