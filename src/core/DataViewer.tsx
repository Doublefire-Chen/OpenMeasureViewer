import type { MeasurePlugin, ParsedData, ChartControls } from './types';

interface DataViewerProps {
  data: ParsedData;
  plugin: MeasurePlugin;
  chartControls: ChartControls;
  children?: React.ReactNode;
}

export default function DataViewer({ data, plugin, chartControls, children }: DataViewerProps) {
  const { Viewer } = plugin;
  return <Viewer data={data} chartControls={chartControls}>{children}</Viewer>;
}
