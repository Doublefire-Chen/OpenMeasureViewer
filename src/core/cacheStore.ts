import type { FileEntry, ParsedData } from './types';
import { getPluginById } from './pluginRegistry';

const CACHE_KEY = 'omv_files';
const ACTIVE_PLUGIN_KEY = 'omv_active_plugin';

interface CachedDataPoint {
  timestamp: number;
  values: Record<string, number>;
}

interface CachedParsedData {
  pluginId: string;
  metadata: Record<string, string>;
  channels: ParsedData['channels'];
  dataPoints: CachedDataPoint[];
}

interface CachedFileEntry {
  id: string;
  filename: string;
  data: CachedParsedData;
}

function serializeFiles(files: FileEntry[]): string {
  const cached: CachedFileEntry[] = files.map((f) => ({
    id: f.id,
    filename: f.filename,
    data: {
      pluginId: f.data.pluginId,
      metadata: f.data.metadata,
      channels: f.data.channels,
      dataPoints: f.data.dataPoints.map((dp) => ({
        timestamp: dp.timestamp.getTime(),
        values: dp.values,
      })),
    },
  }));
  return JSON.stringify(cached);
}

function deserializeFiles(json: string): FileEntry[] {
  const cached: CachedFileEntry[] = JSON.parse(json);
  const entries: FileEntry[] = [];
  for (const c of cached) {
    const plugin = getPluginById(c.data.pluginId);
    if (!plugin) continue;
    const data: ParsedData = {
      pluginId: c.data.pluginId,
      metadata: c.data.metadata,
      channels: c.data.channels,
      dataPoints: c.data.dataPoints.map((dp) => ({
        timestamp: new Date(dp.timestamp),
        values: dp.values,
      })),
    };
    entries.push({ id: c.id, filename: c.filename, data, plugin });
  }
  return entries;
}

export function saveFiles(files: FileEntry[], activePluginId: string | null): void {
  try {
    localStorage.setItem(CACHE_KEY, serializeFiles(files));
    if (activePluginId) {
      localStorage.setItem(ACTIVE_PLUGIN_KEY, activePluginId);
    } else {
      localStorage.removeItem(ACTIVE_PLUGIN_KEY);
    }
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function loadFiles(): { files: FileEntry[]; activePluginId: string | null } {
  try {
    const json = localStorage.getItem(CACHE_KEY);
    if (!json) return { files: [], activePluginId: null };
    const files = deserializeFiles(json);
    const activePluginId = localStorage.getItem(ACTIVE_PLUGIN_KEY);
    return { files, activePluginId };
  } catch {
    return { files: [], activePluginId: null };
  }
}

export function clearCache(): void {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(ACTIVE_PLUGIN_KEY);
}
