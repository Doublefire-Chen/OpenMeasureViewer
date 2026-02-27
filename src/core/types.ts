export interface DataPoint {
  timestamp: Date;
  values: Record<string, number>;
}

export interface Channel {
  id: string;
  name: string;
  unit: string;
  max: number;
  min: number;
  avg: number;
}

export interface ParsedData {
  pluginId: string;
  metadata: Record<string, string>;
  channels: Channel[];
  dataPoints: DataPoint[];
}

export interface YAxisScale {
  mode: 'auto' | 'manual';
  min?: number;
  max?: number;
}

export interface MarkLineVisibility {
  max: boolean;
  min: boolean;
  avg: boolean;
}

export interface ChartControls {
  timeRange: [number, number] | null;
  yAxisScale: YAxisScale;
  markLines: MarkLineVisibility;
  chartTitle: string;
}

export interface ViewerProps {
  data: ParsedData;
  chartControls: ChartControls;
  children?: React.ReactNode;
}

export interface FileEntry {
  id: string;
  filename: string;
  data: ParsedData;
  plugin: MeasurePlugin;
}

export interface MeasurePlugin {
  id: string;
  name: string;
  brand: string;
  type: string;
  imagePath?: string;
  canParse: (file: File) => Promise<boolean>;
  parse: (file: File) => Promise<ParsedData>;
  Viewer: React.ComponentType<ViewerProps>;
}
