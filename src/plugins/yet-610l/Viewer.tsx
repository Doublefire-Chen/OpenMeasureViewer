import React, { useRef } from 'react';
import { Card, Descriptions, Image, Tag } from 'antd';
import ReactECharts from 'echarts-for-react';
import type { ViewerProps } from '../../core/types';

function trimDuration(s: string): string {
  // "00d 20h 00m 15s" → "20h 00m 15s", "00h 00m 05s" → "05s"
  const parts = s.trim().split(/\s+/);
  let i = 0;
  while (i < parts.length - 1 && /^00\D/.test(parts[i])) i++;
  return parts.slice(i).join(' ');
}

export default function Viewer({ data, chartControls, children }: ViewerProps) {
  const chartRef = useRef<ReactECharts>(null);
  const { metadata, channels, dataPoints } = data;
  const channel = channels[0];
  const { timeRange, yAxisScale, markLines } = chartControls;

  const filteredPoints = timeRange
    ? dataPoints.filter((dp) => {
        const t = dp.timestamp.getTime();
        return t >= timeRange[0] && t <= timeRange[1];
      })
    : dataPoints;

  const filteredValues = filteredPoints.map((dp) => dp.values[channel.id]);

  // Detect decimal precision from raw data values
  const decimals = filteredValues.reduce((max, v) => {
    const s = String(v);
    const dot = s.indexOf('.');
    return dot === -1 ? max : Math.max(max, s.length - dot - 1);
  }, 0);

  const visibleMin = filteredValues.length > 0 ? Math.min(...filteredValues) : channel.min;
  const visibleMax = filteredValues.length > 0 ? Math.max(...filteredValues) : channel.max;
  const visibleAvg = filteredValues.length > 0
    ? parseFloat((filteredValues.reduce((s, v) => s + v, 0) / filteredValues.length).toFixed(decimals))
    : channel.avg;

  const chartData = filteredPoints.map((dp) => [
    dp.timestamp.getTime(),
    dp.values[channel.id],
  ]);

  const xAxis: Record<string, unknown> = {
    type: 'time' as const,
    name: 'Time',
  };
  if (timeRange) {
    xAxis.min = timeRange[0];
    xAxis.max = timeRange[1];
  }

  const yAxis: Record<string, unknown> = {
    type: 'value' as const,
    name: `${channel.name} (${channel.unit})`,
  };
  if (yAxisScale.mode === 'manual') {
    yAxis.min = yAxisScale.min;
    yAxis.max = yAxisScale.max;
  } else {
    yAxis.min = (value: { min: number }) => Math.floor(value.min - 1);
    yAxis.max = (value: { max: number }) => Math.ceil(value.max + 1);
  }

  const displayTitle = chartControls.chartTitle || `${channel.name} (${channel.unit})`;

  const option = {
    title: {
      text: displayTitle,
      left: 'center',
    },
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: { value: [number, number] }[]) => {
        const p = params[0];
        const date = new Date(p.value[0]);
        return `${date.toLocaleString()}<br/>${channel.name}: <b>${p.value[1]} ${channel.unit}</b>`;
      },
    },
    xAxis,
    yAxis,
    series: [
      {
        name: channel.name,
        type: 'line',
        data: chartData,
        smooth: false,
        symbol: 'none',
        lineStyle: { width: 1.5 },
        markLine: {
          silent: true,
          data: [
            ...(markLines.max ? [{
              yAxis: visibleMax,
              label: { formatter: `Max: ${visibleMax}` },
              lineStyle: { color: '#ff4d4f', type: 'dashed' as const },
            }] : []),
            ...(markLines.min ? [{
              yAxis: visibleMin,
              label: { formatter: `Min: ${visibleMin}` },
              lineStyle: { color: '#1890ff', type: 'dashed' as const },
            }] : []),
            ...(markLines.avg ? [{
              yAxis: visibleAvg,
              label: { formatter: `Avg: ${visibleAvg}` },
              lineStyle: { color: '#52c41a', type: 'dashed' as const },
            }] : []),
          ],
        },
      },
    ],
    dataZoom: [
      {
        type: 'slider',
        xAxisIndex: 0,
        filterMode: 'none',
      },
      {
        type: 'inside',
        xAxisIndex: 0,
        filterMode: 'none',
      },
    ],
    grid: {
      left: 70,
      right: 100,
      bottom: 80,
      top: 50,
    },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card title="Device Information" size="small">
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ flex: '0 0 66%' }}>
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Serial Number">
              {metadata['Serial Number']}
            </Descriptions.Item>
            <Descriptions.Item label="Firmware Version">
              {metadata['Firmware Version']}
            </Descriptions.Item>
            <Descriptions.Item label="Start Time">
              {metadata['Start Time']}
            </Descriptions.Item>
            <Descriptions.Item label="Stop Time">
              {metadata['Stop Time']}
            </Descriptions.Item>
            <Descriptions.Item label="Elapsed Time">
              {trimDuration(metadata['Elapsed Time'] || '')}
            </Descriptions.Item>
            <Descriptions.Item label="Sample Points">
              {metadata['Sample Points']}
            </Descriptions.Item>
            <Descriptions.Item label="Sample Interval">
              {trimDuration(metadata['Sample Interval'] || '')}
            </Descriptions.Item>
            <Descriptions.Item label="File Created">
              {metadata['File Created Date']}
            </Descriptions.Item>
          </Descriptions>
          </div>
          <div style={{ flex: '0 0 calc(34% - 24px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Image
              src="/images/YET-610L.png"
              alt="YET-610L Thermometer"
              style={{ maxHeight: 200, maxWidth: '100%', objectFit: 'contain' }}
              preview={false}
            />
          </div>
        </div>
      </Card>

      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<{ displayTitle?: string }>, { displayTitle })
          : child,
      )}

      <Card size="small">
        <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
          {channels.map((ch) => (
            <div key={ch.id}>
              <Tag color="blue">{ch.id}: {ch.name}</Tag>
              <span style={{ fontSize: 13 }}>
                Min: <b>{visibleMin}</b> | Max: <b>{visibleMax}</b> | Avg: <b>{visibleAvg}</b> {ch.unit}
              </span>
            </div>
          ))}
        </div>
        <ReactECharts ref={chartRef} option={option} notMerge={true} style={{ height: 450 }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 2 }}>
          <a
            onClick={() => {
              const instance = chartRef.current?.getEchartsInstance();
              if (!instance) return;
              const currentOption = instance.getOption();
              instance.setOption({ dataZoom: [{ show: false }, { disabled: true }], grid: { bottom: 40 } }, false);
              const url = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
              instance.setOption({ dataZoom: currentOption.dataZoom, grid: { bottom: 80 } }, false);
              const link = document.createElement('a');
              link.href = url;
              link.download = `${channel.name}_chart.png`;
              link.click();
            }}
            style={{ fontSize: 12, color: '#999', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#1677ff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#999')}
          >
            Export PNG
          </a>
          <a
            onClick={() => {
              const instance = chartRef.current?.getEchartsInstance();
              if (instance) {
                instance.dispatchAction({ type: 'dataZoom', start: 0, end: 100 });
              }
            }}
            style={{ fontSize: 12, color: '#999', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#1677ff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#999')}
          >
            Reset Zoom
          </a>
        </div>
      </Card>
    </div>
  );
}
