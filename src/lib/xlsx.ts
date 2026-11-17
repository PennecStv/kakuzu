export interface Sheet {
  name: string;
  /** Cell texts. Numbers stay as Excel stores them: a date is a day serial like "46340". */
  rows: string[][];
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

const decode = (text: string) =>
  text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (match, e: string) => {
    if (e[0] !== '#') return ENTITIES[e] ?? match;
    return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
  });

const attr = (tag: string, name: string) => new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(tag)?.[1];

/** Text of a string item: its runs joined, without the phonetic hints of Japanese files. */
const runs = (xml: string) =>
  [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t\b[^>]*>([^<]*)<\/t>/g)].map((m) => decode(m[1] ?? '')).join('');

/** "D12" → 3. */
const column = (ref: string) => [...ref.replace(/\d+$/, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

const inflate = (raw: Uint8Array<ArrayBuffer>) =>
  new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();

/** The XML parts of a zip archive, by path. */
async function unzip(bytes: Uint8Array<ArrayBuffer>): Promise<Map<string, string>> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw new Error('not a zip');
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const utf8 = new TextDecoder();
  const parts = new Map<string, string>();
  for (let i = 0; i < count; i++) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error('broken zip');
    const method = view.getUint16(at + 10, true);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const local = view.getUint32(at + 42, true);
    const name = utf8.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    at += 46 + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
    if (!/\.(xml|rels)$/.test(name)) continue;
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const raw = bytes.slice(start, start + size);
    if (method === 0) parts.set(name, utf8.decode(raw));
    else if (method === 8) parts.set(name, await inflate(raw));
    else throw new Error('unsupported zip');
  }
  return parts;
}

/**
 * Every sheet of an .xlsx workbook, in order.
 * shortcut: tags with a namespace prefix ("<x:row>", some .NET writers) and the 1904 date
 * system of very old Mac files are not read; switch to DOMParser if such files show up.
 */
export async function readXlsx(data: ArrayBuffer): Promise<Sheet[]> {
  const parts = await unzip(new Uint8Array(data));
  const shared = [...(parts.get('xl/sharedStrings.xml') ?? '').matchAll(/<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g)].map((m) =>
    runs(m[1] ?? ''),
  );
  const targets = new Map(
    [...(parts.get('xl/_rels/workbook.xml.rels') ?? '').matchAll(/<Relationship\b[^>]*>/g)].map((m) => [
      attr(m[0], 'Id'),
      attr(m[0], 'Target') ?? '',
    ]),
  );
  return [...(parts.get('xl/workbook.xml') ?? '').matchAll(/<sheet\b[^>]*>/g)].map(([tag]) => {
    const target = targets.get(attr(tag, 'r:id')) ?? '';
    const xml = parts.get(target.startsWith('/') ? target.slice(1) : `xl/${target}`) ?? '';
    const rows = [...xml.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)].map(([, body = '']) => {
      const row: string[] = [];
      for (const [, attrs = '', inner = ''] of body.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = attr(attrs, 'r');
        const type = attr(attrs, 't');
        const value = decode(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? '');
        row[ref ? column(ref) : row.length] = type === 's' ? (shared[Number(value)] ?? '') : type === 'inlineStr' ? runs(inner) : value;
      }
      return Array.from(row, (cell) => cell ?? '');
    });
    return { name: decode(attr(tag, 'name') ?? ''), rows };
  });
}
