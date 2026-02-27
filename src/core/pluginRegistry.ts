import type { MeasurePlugin } from './types';

const plugins: MeasurePlugin[] = [];

export function registerPlugin(plugin: MeasurePlugin) {
  plugins.push(plugin);
}

export async function findPluginForFile(file: File): Promise<MeasurePlugin | null> {
  for (const plugin of plugins) {
    if (await plugin.canParse(file)) {
      return plugin;
    }
  }
  return null;
}

export function getPluginById(id: string): MeasurePlugin | undefined {
  return plugins.find((p) => p.id === id);
}

export function getPlugins(): MeasurePlugin[] {
  return [...plugins];
}
