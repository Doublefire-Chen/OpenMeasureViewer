import { Input, Radio, InputNumber, Button, Checkbox, Space } from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type { ChartControls, ParsedData } from './types';

dayjs.extend(customParseFormat);

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

interface ChartControlBarProps {
  controls: ChartControls;
  data: ParsedData;
  onChange: (controls: ChartControls) => void;
}

export default function ChartControlBar({ controls, data, onChange }: ChartControlBarProps) {
  const { dataPoints } = data;
  const timeMin = dataPoints.length > 0 ? dataPoints[0].timestamp.getTime() : 0;
  const timeMax = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].timestamp.getTime() : 0;

  const startDisplay = controls.timeRange
    ? dayjs(controls.timeRange[0]).format(TIME_FORMAT)
    : dayjs(timeMin).format(TIME_FORMAT);

  const endDisplay = controls.timeRange
    ? dayjs(controls.timeRange[1]).format(TIME_FORMAT)
    : dayjs(timeMax).format(TIME_FORMAT);

  const parseTime = (value: string): number | null => {
    const parsed = dayjs(value, TIME_FORMAT, true);
    if (parsed.isValid()) return parsed.valueOf();
    const loose = dayjs(value);
    if (loose.isValid()) return loose.valueOf();
    return null;
  };

  const handleStartCommit = (value: string) => {
    const ts = parseTime(value);
    if (ts === null) return;
    const clamped = Math.max(timeMin, Math.min(ts, timeMax));
    const end = controls.timeRange ? controls.timeRange[1] : timeMax;
    onChange({ ...controls, timeRange: [clamped, end] });
  };

  const handleEndCommit = (value: string) => {
    const ts = parseTime(value);
    if (ts === null) return;
    const clamped = Math.max(timeMin, Math.min(ts, timeMax));
    const start = controls.timeRange ? controls.timeRange[0] : timeMin;
    onChange({ ...controls, timeRange: [start, clamped] });
  };

  const channel = data.channels[0];
  const defaultTitle = channel ? `${channel.name} (${channel.unit})` : '';

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', padding: '12px 16px', background: '#fafafa', borderRadius: 6 }}>
      <Space size="small" align="center">
        <span style={{ fontWeight: 500 }}>Title:</span>
        <Input
          size="small"
          style={{ width: 260 }}
          placeholder={defaultTitle}
          defaultValue={controls.chartTitle}
          key={`title-${controls.chartTitle}`}
          onPressEnter={(e) => onChange({ ...controls, chartTitle: e.currentTarget.value })}
          onBlur={(e) => onChange({ ...controls, chartTitle: e.target.value })}
        />
      </Space>

      <Space size="small" align="center">
        <span style={{ fontWeight: 500 }}>Time:</span>
        <Input
          size="small"
          style={{ width: 180 }}
          defaultValue={startDisplay}
          key={`start-${startDisplay}`}
          onPressEnter={(e) => handleStartCommit(e.currentTarget.value)}
          onBlur={(e) => handleStartCommit(e.target.value)}
        />
        <span>~</span>
        <Input
          size="small"
          style={{ width: 180 }}
          defaultValue={endDisplay}
          key={`end-${endDisplay}`}
          onPressEnter={(e) => handleEndCommit(e.currentTarget.value)}
          onBlur={(e) => handleEndCommit(e.target.value)}
        />
        <Button
          size="small"
          onClick={() => onChange({ ...controls, timeRange: null })}
          disabled={controls.timeRange === null}
        >
          Reset
        </Button>
      </Space>

      <Space size="small" align="center">
        <span style={{ fontWeight: 500 }}>Y-Axis:</span>
        <Radio.Group
          size="small"
          value={controls.yAxisScale.mode}
          onChange={(e) => {
            const mode = e.target.value as 'auto' | 'manual';
            if (mode === 'auto') {
              onChange({ ...controls, yAxisScale: { mode: 'auto' } });
            } else {
              const channel = data.channels[0];
              onChange({
                ...controls,
                yAxisScale: {
                  mode: 'manual',
                  min: channel ? Math.floor(channel.min - 1) : 0,
                  max: channel ? Math.ceil(channel.max + 1) : 100,
                },
              });
            }
          }}
        >
          <Radio.Button value="auto">Auto</Radio.Button>
          <Radio.Button value="manual">Manual</Radio.Button>
        </Radio.Group>
        {controls.yAxisScale.mode === 'manual' && (
          <>
            <span>Min:</span>
            <InputNumber
              size="small"
              style={{ width: 80 }}
              value={controls.yAxisScale.min}
              onChange={(val) => {
                if (val === null) return;
                onChange({
                  ...controls,
                  yAxisScale: { ...controls.yAxisScale, min: val },
                });
              }}
            />
            <span>Max:</span>
            <InputNumber
              size="small"
              style={{ width: 80 }}
              value={controls.yAxisScale.max}
              status={
                controls.yAxisScale.min !== undefined &&
                controls.yAxisScale.max !== undefined &&
                controls.yAxisScale.min >= controls.yAxisScale.max
                  ? 'error'
                  : undefined
              }
              onChange={(val) => {
                if (val === null) return;
                onChange({
                  ...controls,
                  yAxisScale: { ...controls.yAxisScale, max: val },
                });
              }}
            />
          </>
        )}
      </Space>

      <Space size="small" align="center">
        <span style={{ fontWeight: 500 }}>Lines:</span>
        <Checkbox
          checked={controls.markLines.max}
          onChange={(e) => onChange({ ...controls, markLines: { ...controls.markLines, max: e.target.checked } })}
        >
          Max
        </Checkbox>
        <Checkbox
          checked={controls.markLines.min}
          onChange={(e) => onChange({ ...controls, markLines: { ...controls.markLines, min: e.target.checked } })}
        >
          Min
        </Checkbox>
        <Checkbox
          checked={controls.markLines.avg}
          onChange={(e) => onChange({ ...controls, markLines: { ...controls.markLines, avg: e.target.checked } })}
        >
          Avg
        </Checkbox>
      </Space>
    </div>
  );
}
