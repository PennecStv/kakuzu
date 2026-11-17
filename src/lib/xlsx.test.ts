import { describe, expect, it } from 'vitest';
import { readXlsx } from './xlsx';

const utf8 = new TextEncoder();

async function deflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
}

/** A zip with deflated entries and no CRC: the reader does not check it. */
async function zip(files: Record<string, string>): Promise<ArrayBuffer> {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [path, text] of Object.entries(files)) {
    const name = utf8.encode(path);
    const data = await deflate(utf8.encode(text));
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(8, 8, true);
    lv.setUint32(18, data.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(10, 8, true);
    cv.setUint32(20, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    locals.push(local, data);
    centrals.push(central);
    offset += local.length + data.length;
  }
  const size = centrals.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(10, centrals.length, true);
  ev.setUint32(12, size, true);
  ev.setUint32(16, offset, true);
  return new Blob([...locals, ...centrals, end].map((b) => b.slice())).arrayBuffer();
}

describe('readXlsx', () => {
  it('reads sheet names in workbook order, shared, inline and number cells', async () => {
    const file = await zip({
      'xl/workbook.xml': '<workbook><sheets><sheet name="Revenus" sheetId="2" r:id="rId2"/><sheet name="D&amp;penses" sheetId="1" r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels':
        '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="/xl/worksheets/sheet2.xml"/></Relationships>',
      'xl/sharedStrings.xml': '<sst><si><t>Date</t></si><si/><si><r><t>Caf</t></r><r><t xml:space="preserve">é </t></r></si></sst>',
      'xl/worksheets/sheet1.xml':
        '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>2</v></c></row><row r="2" ht="15"/><row r="3"><c r="B3"><v>239.49</v></c><c r="C3" t="inlineStr"><is><t>a &lt; b</t></is></c></row></sheetData></worksheet>',
      'xl/worksheets/sheet2.xml': '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>1</v></c></row></sheetData></worksheet>',
    });
    expect(await readXlsx(file)).toEqual([
      { name: 'Revenus', rows: [['']] },
      { name: 'D&penses', rows: [['Date', '', 'Café '], [], ['', '239.49', 'a < b']] },
    ]);
  });

  it('rejects what is not a zip', async () => {
    await expect(readXlsx(utf8.encode('Date;Montant').buffer)).rejects.toThrow();
  });
});
