import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Layout, Typography, Popconfirm } from 'antd';
import { ExperimentOutlined, DeleteOutlined, DownloadOutlined, GithubOutlined } from '@ant-design/icons';
import DeviceSelector from './DeviceSelector';
import FileUploader from './FileUploader';
import DataViewer from './DataViewer';
import FileTabs from './FileTabs';
import type { PluginGroup } from './FileTabs';
import FileSelector from './FileSelector';
import ChartControlBar from './ChartControlBar';
import { saveFiles, loadFiles, clearCache } from './cacheStore';
import type { MeasurePlugin, ParsedData, FileEntry, ChartControls } from './types';

const { Header, Content } = Layout;
const { Title } = Typography;

const NEW_TAB_PREFIX = '__new_';

const defaultChartControls: ChartControls = {
  timeRange: null,
  yAxisScale: { mode: 'auto' },
  markLines: { max: true, min: true, avg: true },
  chartTitle: '',
};

interface PluginTabState {
  activeFileId: string;
  chartControls: ChartControls;
}

interface NewTabState {
  id: string;
  phase: 'device' | 'upload';
  plugin: MeasurePlugin | null;
}

function isNewTabId(id: string | null): boolean {
  return id !== null && id.startsWith(NEW_TAB_PREFIX);
}

let nextId = 1;
let nextNewTabId = 1;

function initState() {
  const { files, activePluginId } = loadFiles();
  if (files.length > 0) {
    for (const f of files) {
      const n = parseInt(f.id, 10);
      if (!isNaN(n) && n >= nextId) nextId = n + 1;
    }
    const pluginStates: Record<string, PluginTabState> = {};
    for (const f of files) {
      pluginStates[f.plugin.id] = {
        activeFileId: f.id,
        chartControls: defaultChartControls,
      };
    }
    const validActive = activePluginId && pluginStates[activePluginId]
      ? activePluginId
      : files[0].plugin.id;
    return { files, activePluginId: validActive, pluginStates, initialNewTabs: [] as NewTabState[] };
  }
  // No cached files — start with an initial empty tab
  const initialTabId = `${NEW_TAB_PREFIX}${nextNewTabId++}`;
  return {
    files: [],
    activePluginId: initialTabId,
    pluginStates: {} as Record<string, PluginTabState>,
    initialNewTabs: [{ id: initialTabId, phase: 'device' as const, plugin: null }],
  };
}

export default function App() {
  const [initial] = useState(initState);
  const [files, setFiles] = useState<FileEntry[]>(initial.files);
  const [activePluginId, setActivePluginId] = useState<string | null>(initial.activePluginId);
  const [pluginStates, setPluginStates] = useState<Record<string, PluginTabState>>(initial.pluginStates);
  const [newTabs, setNewTabs] = useState<NewTabState[]>(initial.initialNewTabs ?? []);
  const activeNewTabIdRef = useRef<string | null>(
    initial.initialNewTabs.length > 0 ? initial.initialNewTabs[0].id : null,
  );

  /** Create a fresh empty "New" tab and activate it. */
  const spawnEmptyTab = useCallback(() => {
    const id = `${NEW_TAB_PREFIX}${nextNewTabId++}`;
    setNewTabs((prev) => [...prev, { id, phase: 'device', plugin: null }]);
    setActivePluginId(id);
    activeNewTabIdRef.current = id;
  }, []);

  useEffect(() => {
    saveFiles(files, activePluginId);
  }, [files, activePluginId]);

  const pluginGroups = useMemo((): PluginGroup[] => {
    const seen = new Map<string, { plugin: MeasurePlugin; count: number }>();
    for (const f of files) {
      const existing = seen.get(f.plugin.id);
      if (existing) {
        existing.count++;
      } else {
        seen.set(f.plugin.id, { plugin: f.plugin, count: 1 });
      }
    }
    return Array.from(seen.entries()).map(([pluginId, { plugin, count }]) => ({
      pluginId,
      pluginLabel: `${plugin.name} ${plugin.type}`,
      fileCount: count,
    }));
  }, [files]);

  const tabGroups = useMemo((): PluginGroup[] => {
    const groups = [...pluginGroups];
    for (const nt of newTabs) {
      groups.push({ pluginId: nt.id, pluginLabel: 'New', fileCount: 0 });
    }
    return groups;
  }, [pluginGroups, newTabs]);

  const activePluginFiles = useMemo(
    () => files.filter((f) => f.plugin.id === activePluginId),
    [files, activePluginId],
  );

  const tabState = activePluginId ? pluginStates[activePluginId] : null;
  const activeFile = tabState
    ? activePluginFiles.find((f) => f.id === tabState.activeFileId) ?? null
    : null;

  const hasFiles = files.length > 0;
  const hasNewTabs = newTabs.length > 0;
  const showLanding = !hasFiles && !hasNewTabs;
  const activeNewTab = isNewTabId(activePluginId)
    ? newTabs.find((nt) => nt.id === activePluginId) ?? null
    : (!hasFiles && hasNewTabs ? newTabs[newTabs.length - 1] : null);
  const isNewTabActive = activeNewTab !== null;

  // Track which new tab is active for device select / upload callbacks
  if (isNewTabActive) {
    activeNewTabIdRef.current = activeNewTab.id;
  }

  const updateNewTab = useCallback((tabId: string, update: Partial<Omit<NewTabState, 'id'>>) => {
    setNewTabs((prev) => prev.map((nt) => nt.id === tabId ? { ...nt, ...update } : nt));
  }, []);

  const handleDeviceSelect = useCallback((plugin: MeasurePlugin) => {
    let tabId = activeNewTabIdRef.current;
    if (!tabId) {
      // No active new tab (e.g. landing page) — create one
      const id = `${NEW_TAB_PREFIX}${nextNewTabId++}`;
      setNewTabs((prev) => [...prev, { id, phase: 'upload', plugin }]);
      setActivePluginId(id);
      activeNewTabIdRef.current = id;
      return;
    }
    updateNewTab(tabId, { phase: 'upload', plugin });
  }, [updateNewTab]);

  const handleDataParsed = useCallback((data: ParsedData, plugin: MeasurePlugin, filename: string) => {
    const id = String(nextId++);
    const entry: FileEntry = { id, filename, data, plugin };
    setFiles((prev) => [...prev, entry]);
    setActivePluginId(plugin.id);
    setPluginStates((prev) => ({
      ...prev,
      [plugin.id]: { activeFileId: id, chartControls: defaultChartControls },
    }));
    // Remove the new tab that triggered the upload
    const tabId = activeNewTabIdRef.current;
    if (tabId) {
      setNewTabs((prev) => prev.filter((nt) => nt.id !== tabId));
      activeNewTabIdRef.current = null;
    }
  }, []);

  const handlePluginSwitch = useCallback((pluginId: string) => {
    setActivePluginId(pluginId);
  }, []);

  const handleFileSwitch = useCallback((fileId: string) => {
    if (!activePluginId) return;
    setPluginStates((prev) => ({
      ...prev,
      [activePluginId]: { activeFileId: fileId, chartControls: defaultChartControls },
    }));
  }, [activePluginId]);

  const handleFileRemove = useCallback((fileId: string) => {
    if (!activePluginId) return;

    setFiles((prev) => {
      const updated = prev.filter((f) => f.id !== fileId);
      const remaining = updated.filter((f) => f.plugin.id === activePluginId);

      if (remaining.length > 0) {
        setPluginStates((ps) => ({
          ...ps,
          [activePluginId]: { activeFileId: remaining[0].id, chartControls: defaultChartControls },
        }));
      } else {
        setPluginStates((ps) => {
          const next = { ...ps };
          delete next[activePluginId];
          return next;
        });
        const otherPlugins = updated.length > 0
          ? [...new Set(updated.map((f) => f.plugin.id))]
          : [];
        if (otherPlugins.length > 0) {
          setActivePluginId(otherPlugins[0]);
        } else {
          spawnEmptyTab();
        }
      }

      return updated;
    });
  }, [activePluginId, spawnEmptyTab]);

  const handleChartControlsChange = useCallback((controls: ChartControls) => {
    if (!activePluginId) return;
    setPluginStates((prev) => {
      const current = prev[activePluginId];
      if (!current) return prev;
      return { ...prev, [activePluginId]: { ...current, chartControls: controls } };
    });
  }, [activePluginId]);

  const handleCloseTab = useCallback((pluginId: string) => {
    if (isNewTabId(pluginId)) {
      setNewTabs((prev) => {
        const updated = prev.filter((nt) => nt.id !== pluginId);
        if (activePluginId === pluginId) {
          // Switch to another tab
          const firstPlugin = pluginGroups[0];
          if (firstPlugin) {
            setActivePluginId(firstPlugin.pluginId);
          } else if (updated.length > 0) {
            setActivePluginId(updated[updated.length - 1].id);
          } else if (pluginGroups.length === 0) {
            spawnEmptyTab();
            return updated;   // spawnEmptyTab already adds a tab
          }
        }
        return updated;
      });
      return;
    }
    // Remove all files for this plugin
    setFiles((prev) => {
      const updated = prev.filter((f) => f.plugin.id !== pluginId);
      setPluginStates((ps) => {
        const next = { ...ps };
        delete next[pluginId];
        return next;
      });
      if (activePluginId === pluginId) {
        const otherPlugins = [...new Set(updated.map((f) => f.plugin.id))];
        if (otherPlugins.length > 0) {
          setActivePluginId(otherPlugins[0]);
        } else if (newTabs.length > 0) {
          setActivePluginId(newTabs[newTabs.length - 1].id);
        } else {
          spawnEmptyTab();
        }
      }
      return updated;
    });
  }, [activePluginId, pluginGroups, newTabs, spawnEmptyTab]);

  const handleAddTab = useCallback(() => {
    const id = `${NEW_TAB_PREFIX}${nextNewTabId++}`;
    setNewTabs((prev) => [...prev, { id, phase: 'device', plugin: null }]);
    setActivePluginId(id);
  }, []);

  const handleClearCache = useCallback(() => {
    clearCache();
    setFiles([]);
    setPluginStates({});
    setNewTabs([]);
    spawnEmptyTab();
  }, [spawnEmptyTab]);

  const handleChangeDevice = useCallback(() => {
    const tabId = activeNewTabIdRef.current;
    if (tabId) {
      updateNewTab(tabId, { phase: 'device', plugin: null });
    }
  }, [updateNewTab]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ExperimentOutlined style={{ fontSize: 24, color: '#fff' }} />
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          OpenMeasureViewer
        </Title>
        <a
          href="https://github.com/Doublefire-Chen/OpenMeasureViewer"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'rgba(255,255,255,0.65)', fontSize: 20, lineHeight: 1, marginLeft: 'auto' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
        >
          <GithubOutlined />
        </a>
        <a
          href="./OpenMeasureViewer.zip"
          download
          style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
        >
          <DownloadOutlined style={{ marginRight: 4 }} />
          Download
        </a>
        {hasFiles && (
          <Popconfirm
            title="Clear all cached data?"
            description="All loaded files will be removed."
            onConfirm={handleClearCache}
            okText="Yes"
            cancelText="No"
            placement="bottomRight"
          >
            <a
              style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, cursor: 'pointer' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
            >
              <DeleteOutlined style={{ marginRight: 4 }} />
              Clear Cache
            </a>
          </Popconfirm>
        )}
      </Header>
      <Content style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {showLanding ? (
          <div style={{ marginTop: '8vh' }}>
            <DeviceSelector onSelect={handleDeviceSelect} />
          </div>
        ) : (
          <>
            <FileTabs
              groups={tabGroups}
              activePluginId={activePluginId}
              onSwitch={handlePluginSwitch}
              onAdd={handleAddTab}
              onClose={handleCloseTab}
            />
            {isNewTabActive && activeNewTab.phase === 'device' && (
              <div style={{ marginTop: 16 }}>
                <DeviceSelector onSelect={handleDeviceSelect} />
              </div>
            )}
            {isNewTabActive && activeNewTab.phase === 'upload' && activeNewTab.plugin && (
              <div style={{ marginTop: 16 }}>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <Typography.Text type="secondary">
                    Upload data for <strong>{activeNewTab.plugin.name}</strong>
                    {' '}&mdash;{' '}
                    <a
                      onClick={handleChangeDevice}
                      style={{ cursor: 'pointer' }}
                    >
                      change device
                    </a>
                  </Typography.Text>
                </div>
                <FileUploader onDataParsed={handleDataParsed} />
              </div>
            )}
            {activeFile && tabState && !isNewTabActive && (
              <>
                <FileSelector
                  files={activePluginFiles}
                  activeFileId={tabState.activeFileId}
                  onSwitch={handleFileSwitch}
                  onRemove={handleFileRemove}
                />
                <div style={{ marginTop: 16 }}>
                  <DataViewer
                    data={activeFile.data}
                    plugin={activeFile.plugin}
                    chartControls={tabState.chartControls}
                  >
                    <ChartControlBar
                      controls={tabState.chartControls}
                      data={activeFile.data}
                      onChange={handleChartControlsChange}
                      hideMarkLines={activeFile.plugin.customChartLines}
                    />
                  </DataViewer>
                </div>
              </>
            )}
          </>
        )}
      </Content>
      <Layout.Footer style={{ textAlign: 'center', padding: '16px 24px', color: '#999', fontSize: 13 }}>
        &copy; {new Date().getFullYear()} Doublefire Chen. All rights reserved.
      </Layout.Footer>
    </Layout>
  );
}
