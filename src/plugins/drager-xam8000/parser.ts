import * as XLSX from 'xlsx';
import type { ParsedData, Channel, DataPoint } from '../../core/types';

function readFileAsArrayBuffer(file: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function parseThresholdValue(s: string): number {
  // "20.00 ppm" → 20
  const match = String(s).match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

export async function canParse(file: File): Promise<boolean> {
  const ext = file.name.toLowerCase();
  if (!ext.endsWith('.xls') && !ext.endsWith('.xlsx')) return false;

  try {
    const buf = await readFileAsArrayBuffer(file);
    const wb = XLSX.read(buf, { type: 'array', sheetRows: 3 });
    const sheetName = wb.SheetNames[0] || '';
    if (!sheetName.toLowerCase().includes('x-am 8000')) return false;

    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' });
    if (rows.length < 2) return false;

    return String(rows[1][0]).toLowerCase().startsWith('a1 threshold');
  } catch {
    return false;
  }
}

export async function parse(file: File): Promise<ParsedData> {
  const buf = await readFileAsArrayBuffer(file);
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, defval: '' });

  // Row 0: gas names at col 7 and col 9
  const gas1Name = String(rows[0][7] || 'CO');
  const gas2Name = String(rows[0][9] || 'NO2');

  // Row 1: A1 thresholds
  const a1Gas1 = parseThresholdValue(String(rows[1][7]));
  const a1Gas2 = parseThresholdValue(String(rows[1][9]));

  // Row 2: A2 thresholds
  const a2Gas1 = parseThresholdValue(String(rows[2][7]));
  const a2Gas2 = parseThresholdValue(String(rows[2][9]));

  // Parse data rows (row 3+)
  const dataPoints: DataPoint[] = [];
  let gas1Sum = 0, gas2Sum = 0;
  let gas1Min = Infinity, gas1Max = -Infinity;
  let gas2Min = Infinity, gas2Max = -Infinity;

  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    const dateSerial = Number(row[1]);
    const timeSerial = Number(row[2]);
    if (!dateSerial || isNaN(timeSerial)) continue;

    // Convert Excel serial date+time to JS Date
    const parsed = XLSX.SSF.parse_date_code(dateSerial + timeSerial);
    const timestamp = new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S);

    const v1 = Number(row[7]);
    const v2 = Number(row[9]);
    const val1 = isNaN(v1) ? 0 : v1;
    const val2 = isNaN(v2) ? 0 : v2;

    dataPoints.push({
      timestamp,
      values: { [gas1Name]: val1, [gas2Name]: val2 },
    });

    gas1Sum += val1;
    gas2Sum += val2;
    if (val1 < gas1Min) gas1Min = val1;
    if (val1 > gas1Max) gas1Max = val1;
    if (val2 < gas2Min) gas2Min = val2;
    if (val2 > gas2Max) gas2Max = val2;
  }

  const n = dataPoints.length;
  const gas1Avg = n > 0 ? parseFloat((gas1Sum / n).toFixed(2)) : 0;
  const gas2Avg = n > 0 ? parseFloat((gas2Sum / n).toFixed(2)) : 0;

  const channels: Channel[] = [
    {
      id: gas1Name,
      name: gas1Name,
      unit: 'ppm',
      min: n > 0 ? gas1Min : 0,
      max: n > 0 ? gas1Max : 0,
      avg: gas1Avg,
    },
    {
      id: gas2Name,
      name: gas2Name,
      unit: 'ppm',
      min: n > 0 ? gas2Min : 0,
      max: n > 0 ? gas2Max : 0,
      avg: gas2Avg,
    },
  ];

  const recordDate = n > 0
    ? dataPoints[0].timestamp.toLocaleDateString()
    : '';

  const metadata: Record<string, string> = {
    deviceId: String(rows[3]?.[0] || ''),
    recordDate,
    totalSamples: String(n),
    gasTypes: `${gas1Name}, ${gas2Name}`,
    thresholds: JSON.stringify({
      [gas1Name]: { a1: a1Gas1, a2: a2Gas1 },
      [gas2Name]: { a1: a1Gas2, a2: a2Gas2 },
    }),
  };

  return {
    pluginId: 'drager-xam8000',
    metadata,
    channels,
    dataPoints,
  };
}
