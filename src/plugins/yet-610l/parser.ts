import type { ParsedData, Channel, DataPoint } from '../../core/types';

function readFileAsText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function extractValue(line: string, prefix: string): string {
  const idx = line.indexOf(prefix);
  if (idx === -1) return '';
  return line.slice(idx + prefix.length).split(',')[0].trim();
}

export async function canParse(file: File): Promise<boolean> {
  const text = await readFileAsText(file.slice(0, 200));
  return text.startsWith('DATA REPORT');
}

export async function parse(file: File): Promise<ParsedData> {
  const text = await readFileAsText(file);
  const lines = text.split('\n');

  const metadata: Record<string, string> = {};

  // Extract metadata from header lines
  for (const line of lines.slice(0, 30)) {
    if (line.startsWith('File Created Date:')) {
      metadata['File Created Date'] = extractValue(line, 'File Created Date: ');
    } else if (line.startsWith('Serial Number:')) {
      metadata['Serial Number'] = extractValue(line, 'Serial Number: ');
    } else if (line.startsWith('Firmware Version:')) {
      metadata['Firmware Version'] = extractValue(line, 'Firmware Version: ');
    } else if (line.startsWith('Sample Points:')) {
      metadata['Sample Points'] = extractValue(line, 'Sample Points: ');
    } else if (line.startsWith('Sample Interval:')) {
      metadata['Sample Interval'] = extractValue(line, 'Sample Interval: ');
    } else if (line.startsWith('Start Time:')) {
      metadata['Start Time'] = extractValue(line, 'Start Time: ');
    } else if (line.startsWith('Stop Time:')) {
      metadata['Stop Time'] = extractValue(line, 'Stop Time: ');
    } else if (line.startsWith('Elapsed Time:')) {
      metadata['Elapsed Time'] = extractValue(line, 'Elapsed Time: ');
    } else if (line.startsWith('Start Mode:')) {
      metadata['Start Mode'] = extractValue(line, 'Start Mode: ');
    } else if (line.startsWith('Stop Mode:')) {
      metadata['Stop Mode'] = extractValue(line, 'Stop Mode: ');
    }
  }

  // Parse channel definitions (line 26 is header, line 27 is data)
  // Line indices are 0-based: line 26 = index 25, line 27 = index 26
  const channels: Channel[] = [];
  const channelDataLine = lines[26]; // "CH1,Temp,Celsius,41.76,25.27,30.15"
  if (channelDataLine) {
    const parts = channelDataLine.split(',');
    channels.push({
      id: parts[0]?.trim() || 'CH1',
      name: parts[1]?.trim() || 'Temp',
      unit: parts[2]?.trim() || '',
      max: parseFloat(parts[3]) || 0,
      min: parseFloat(parts[4]) || 0,
      avg: parseFloat(parts[5]) || 0,
    });
  }

  // Parse data rows (starting at line 32, index 31)
  const dataPoints: DataPoint[] = [];
  for (let i = 31; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    const dateStr = parts[0]?.trim();
    const timeStr = parts[1]?.trim();
    if (!dateStr || !timeStr) continue;

    // Parse "2026/02/23" "14:46:34" into a Date
    const timestamp = new Date(`${dateStr.replace(/\//g, '-')}T${timeStr}`);
    const values: Record<string, number> = {};

    for (let ch = 0; ch < channels.length; ch++) {
      const val = parseFloat(parts[ch + 2]);
      if (!isNaN(val)) {
        values[channels[ch].id] = val;
      }
    }

    dataPoints.push({ timestamp, values });
  }

  return {
    pluginId: 'yet-610l',
    metadata,
    channels,
    dataPoints,
  };
}
