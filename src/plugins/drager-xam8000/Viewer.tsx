import React, { useState, useMemo, useRef } from 'react';
import { Card, Descriptions, Image, Radio, InputNumber, Checkbox, Button, Space, Tag, Table } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import * as XLSX from 'xlsx';
import type { ViewerProps } from '../../core/types';

interface Thresholds {
  [gas: string]: { a1: number; a2: number };
}

export default function Viewer({ data, chartControls, children }: ViewerProps) {
  const chartRef = useRef<ReactECharts>(null);
  const { metadata, channels, dataPoints } = data;
  const { timeRange, yAxisScale } = chartControls;

  const gasNames = channels.map((ch) => ch.id);
  const [selectedGas, setSelectedGas] = useState(gasNames[0]);
  const [windowMinutes, setWindowMinutes] = useState(15);
  const [showRawData, setShowRawData] = useState(false);
  const [showMaxLine, setShowMaxLine] = useState(false);
  const [showMinLine, setShowMinLine] = useState(false);
  const [showTotalAvgLine, setShowTotalAvgLine] = useState(true);
  const [showA1Line, setShowA1Line] = useState(true);
  const [showA2Line, setShowA2Line] = useState(true);
  const [highlightAbove, setHighlightAbove] = useState(false);

  const thresholds: Thresholds = useMemo(
    () => JSON.parse(metadata.thresholds || '{}'),
    [metadata.thresholds],
  );

  const channel = channels.find((ch) => ch.id === selectedGas) || channels[0];
  const gasThresholds = thresholds[selectedGas] || { a1: 0, a2: 0 };

  const filteredPoints = useMemo(() => {
    if (!timeRange) return dataPoints;
    return dataPoints.filter((dp) => {
      const t = dp.timestamp.getTime();
      return t >= timeRange[0] && t <= timeRange[1];
    });
  }, [dataPoints, timeRange]);

  // Raw data for chart
  const rawChartData = useMemo(() =>
    filteredPoints.map((dp) => [dp.timestamp.getTime(), dp.values[selectedGas] ?? 0] as [number, number]),
    [filteredPoints, selectedGas],
  );

  // Total average of raw data
  const totalAvg = useMemo(() => {
    if (filteredPoints.length === 0) return 0;
    const sum = filteredPoints.reduce((s, dp) => s + (dp.values[selectedGas] ?? 0), 0);
    return parseFloat((sum / filteredPoints.length).toFixed(4));
  }, [filteredPoints, selectedGas]);

  // O(n) two-pointer rolling average (forward-looking window)
  const rollingAvgData = useMemo(() => {
    if (filteredPoints.length === 0) return [];

    const windowMs = windowMinutes * 60 * 1000;
    const lastTimestamp = filteredPoints[filteredPoints.length - 1].timestamp.getTime();
    const result: [number, number][] = [];

    let right = 0;
    let sum = 0;
    let count = 0;

    for (let left = 0; left < filteredPoints.length; left++) {
      const tLeft = filteredPoints[left].timestamp.getTime();

      // Exclude points where window would be incomplete
      if (tLeft + windowMs > lastTimestamp) break;

      // Expand right pointer
      while (right < filteredPoints.length && filteredPoints[right].timestamp.getTime() <= tLeft + windowMs) {
        sum += filteredPoints[right].values[selectedGas] ?? 0;
        count++;
        right++;
      }

      const avg = count > 0 ? parseFloat((sum / count).toFixed(4)) : 0;
      result.push([tLeft, avg]);

      // Shrink: remove left element for next iteration
      sum -= filteredPoints[left].values[selectedGas] ?? 0;
      count--;
    }

    return result;
  }, [filteredPoints, selectedGas, windowMinutes]);

  // A2: per-point comparison — rolling avg points where value > A2 threshold
  const aboveA2Data = useMemo(() =>
    rollingAvgData.filter(([, val]) => val >= gasThresholds.a2),
    [rollingAvgData, gasThresholds.a2],
  );

  // Compute visible stats from rolling avg
  const visibleValues = rollingAvgData.map((d) => d[1]);
  const visibleMin = visibleValues.length > 0 ? Math.min(...visibleValues) : channel.min;
  const visibleMax = visibleValues.length > 0 ? Math.max(...visibleValues) : channel.max;
  const visibleAvg = visibleValues.length > 0
    ? parseFloat((visibleValues.reduce((s, v) => s + v, 0) / visibleValues.length).toFixed(4))
    : channel.avg;

  const displayTitle = chartControls.chartTitle || `${selectedGas} Rolling Average (${windowMinutes} min)`;

  const xAxis: Record<string, unknown> = { type: 'time', name: 'Time' };
  if (timeRange) {
    xAxis.min = timeRange[0];
    xAxis.max = timeRange[1];
  }

  const yAxis: Record<string, unknown> = {
    type: 'value',
    name: `${selectedGas} (${channel.unit})`,
  };
  if (yAxisScale.mode === 'manual') {
    yAxis.min = yAxisScale.min;
    yAxis.max = yAxisScale.max;
  } else {
    yAxis.min = (value: { min: number }) => Math.floor(value.min * 10 - 1) / 10;
    yAxis.max = (value: { max: number }) => Math.ceil(value.max * 10 + 1) / 10;
  }

  const chartMarkLines = [
    ...(showMaxLine ? [{
      yAxis: visibleMax,
      label: { formatter: `Max: ${visibleMax}` },
      lineStyle: { color: '#ff4d4f', type: 'dotted' as const },
    }] : []),
    ...(showMinLine ? [{
      yAxis: visibleMin,
      label: { formatter: `Min: ${visibleMin}` },
      lineStyle: { color: '#1890ff', type: 'dotted' as const },
    }] : []),
    ...(showTotalAvgLine ? [{
      yAxis: totalAvg,
      label: { formatter: `Total Avg: ${totalAvg} ppm` },
      lineStyle: { color: '#52c41a', type: 'dashed' as const, width: 2 },
    }] : []),
    ...(showA1Line ? [{
      yAxis: gasThresholds.a1,
      label: { formatter: `A1: ${gasThresholds.a1} ppm` },
      lineStyle: { color: '#faad14', type: 'dashed' as const, width: 2 },
    }] : []),
    ...(showA2Line ? [{
      yAxis: gasThresholds.a2,
      label: { formatter: `A2: ${gasThresholds.a2} ppm` },
      lineStyle: { color: '#ff4d4f', type: 'dashed' as const, width: 2 },
    }] : []),
  ];

  const series: Record<string, unknown>[] = [
    {
      name: `${selectedGas} Rolling Avg (${windowMinutes} min)`,
      type: 'line',
      data: rollingAvgData,
      smooth: false,
      symbol: 'none',
      lineStyle: { width: 1.5 },
      markLine: {
        silent: true,
        data: chartMarkLines,
      },
    },
  ];

  if (highlightAbove && aboveA2Data.length > 0) {
    series.push({
      name: `Above A2`,
      type: 'scatter',
      data: aboveA2Data,
      symbol: 'circle',
      symbolSize: 4,
      itemStyle: { color: '#ff4d4f' },
      z: 2,
    } as Record<string, unknown>);
  }

  if (showRawData) {
    series.unshift({
      name: `${selectedGas} Raw`,
      type: 'line',
      data: rawChartData,
      smooth: false,
      symbol: 'none',
      lineStyle: { width: 0.8, opacity: 0.4 },
      itemStyle: { color: '#bfbfbf' },
      z: 0,
    });
  }

  const option = {
    title: { text: displayTitle, left: 'center' },
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: { seriesName: string; value: [number, number]; color: string }[]) => {
        const date = new Date(params[0].value[0]);
        let html = date.toLocaleString();
        for (const p of params) {
          html += `<br/><span style="color:${p.color}">\u25CF</span> ${p.seriesName}: <b>${p.value[1]} ${channel.unit}</b>`;
        }
        return html;
      },
    },
    legend: { top: 40, show: showRawData || highlightAbove },
    xAxis,
    yAxis,
    series,
    dataZoom: [
      { type: 'slider', xAxisIndex: 0, filterMode: 'none' },
      { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
    ],
    grid: { left: 70, right: 100, bottom: 80, top: (showRawData || highlightAbove) ? 80 : 50 },
  };

  // Table columns for above-threshold display
  const windowMs = windowMinutes * 60 * 1000;

  const thresholdTableColumns = [
    {
      title: 'Time Period',
      dataIndex: 'timestamp',
      key: 'timePeriod',
      render: (ts: number) =>
        `${new Date(ts).toLocaleString()} ~ ${new Date(ts + windowMs).toLocaleString()}`,
    },
    {
      title: `Rolling Avg (ppm)`,
      dataIndex: 'rollingAvg',
      key: 'rollingAvg',
    },
    {
      title: 'Threshold (ppm)',
      dataIndex: 'threshold',
      key: 'threshold',
    },
    {
      title: 'Exceedance (ppm)',
      dataIndex: 'exceedance',
      key: 'exceedance',
    },
  ];

  const aboveA2TableData = useMemo(() =>
    aboveA2Data.map(([ts, val], i) => ({
      key: i,
      timestamp: ts,
      rollingAvg: val,
      threshold: gasThresholds.a2,
      exceedance: parseFloat((val - gasThresholds.a2).toFixed(4)),
    })),
    [aboveA2Data, gasThresholds.a2],
  );

  // A1: single comparison — total average vs A1 threshold
  const a1Exceeded = totalAvg >= gasThresholds.a1;

  function handleExportAboveA2() {
    if (aboveA2Data.length === 0) {
      alert('No data points above A2 threshold.');
      return;
    }

    const rows = aboveA2Data.map(([ts, val]) => ({
      'Period Start': new Date(ts).toLocaleString(),
      'Period End': new Date(ts + windowMs).toLocaleString(),
      'Rolling Avg (ppm)': val,
      'A2 Threshold (ppm)': gasThresholds.a2,
      'Exceedance (ppm)': parseFloat((val - gasThresholds.a2).toFixed(4)),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Above A2');
    XLSX.writeFile(wb, `${selectedGas}_above_A2.xlsx`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card title="Device Information" size="small">
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ flex: '0 0 66%' }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Device ID">
                {metadata.deviceId}
              </Descriptions.Item>
              <Descriptions.Item label="Record Date">
                {metadata.recordDate}
              </Descriptions.Item>
              <Descriptions.Item label="Total Samples">
                {metadata.totalSamples}
              </Descriptions.Item>
              <Descriptions.Item label="Gas Types">
                {metadata.gasTypes}
              </Descriptions.Item>
              {channels.map((ch) => {
                const th = thresholds[ch.id];
                return (
                  <Descriptions.Item key={ch.id} label={`${ch.id} Thresholds`}>
                    A1: {th?.a1} ppm / A2: {th?.a2} ppm
                  </Descriptions.Item>
                );
              })}
              <Descriptions.Item label={`${selectedGas} Total Avg vs A1`}>
                <span style={{ color: a1Exceeded ? '#ff4d4f' : '#52c41a', fontWeight: 500 }}>
                  {totalAvg} ppm {a1Exceeded ? '\u2265' : '<'} {gasThresholds.a1} ppm ({a1Exceeded ? 'EXCEEDED' : 'OK'})
                </span>
              </Descriptions.Item>
            </Descriptions>
          </div>
          <div style={{ flex: '0 0 calc(34% - 24px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Image
              src="/images/X-AM_8000.png"
              alt="Dräger X-AM 8000"
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
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <Space>
            <span>Gas:</span>
            <Radio.Group
              value={selectedGas}
              onChange={(e) => setSelectedGas(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              size="small"
            >
              {gasNames.map((g) => (
                <Radio.Button key={g} value={g}>{g}</Radio.Button>
              ))}
            </Radio.Group>
          </Space>

          <Space>
            <span>Window (min):</span>
            <InputNumber
              value={windowMinutes}
              onChange={(v) => setWindowMinutes(v ?? 15)}
              min={1}
              max={120}
              size="small"
              style={{ width: 70 }}
            />
          </Space>

          <Checkbox checked={showRawData} onChange={(e) => setShowRawData(e.target.checked)}>
            Raw Data
          </Checkbox>
          <Checkbox checked={highlightAbove} onChange={(e) => setHighlightAbove(e.target.checked)}>
            Highlight Above A2
          </Checkbox>

          <Space>
            <span>Lines:</span>
            <Checkbox checked={showMaxLine} onChange={(e) => setShowMaxLine(e.target.checked)}>
              Max
            </Checkbox>
            <Checkbox checked={showMinLine} onChange={(e) => setShowMinLine(e.target.checked)}>
              Min
            </Checkbox>
            <Checkbox checked={showTotalAvgLine} onChange={(e) => setShowTotalAvgLine(e.target.checked)}>
              Total Avg
            </Checkbox>
            <Checkbox checked={showA1Line} onChange={(e) => setShowA1Line(e.target.checked)}>
              A1
            </Checkbox>
            <Checkbox checked={showA2Line} onChange={(e) => setShowA2Line(e.target.checked)}>
              A2
            </Checkbox>
          </Space>
        </div>
      </Card>

      <Card size="small">
        <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
          <div>
            <Tag color="blue">{selectedGas}</Tag>
            <span style={{ fontSize: 13 }}>
              Min: <b>{visibleMin}</b> | Max: <b>{visibleMax}</b> | Avg: <b>{visibleAvg}</b> {channel.unit}
            </span>
          </div>
        </div>
        <ReactECharts
          ref={chartRef}
          key={`${showRawData}-${highlightAbove}`}
          option={option}
          notMerge={true}
          style={{ height: 450 }}
        />
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
              link.download = `${selectedGas}_rolling_avg_chart.png`;
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

      <Card
        title={`Above A2 Threshold (${gasThresholds.a2} ppm) — ${selectedGas} — ${aboveA2Data.length} points`}
        size="small"
        extra={
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={handleExportAboveA2}
            disabled={aboveA2Data.length === 0}
          >
            Export Above A2
          </Button>
        }
      >
        {aboveA2Data.length > 0 ? (
          <Table
            columns={thresholdTableColumns}
            dataSource={aboveA2TableData}
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'] }}
            scroll={{ y: 300 }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#52c41a', fontWeight: 500 }}>
            No rolling average points exceed the A2 threshold ({gasThresholds.a2} ppm).
          </div>
        )}
      </Card>
    </div>
  );
}
