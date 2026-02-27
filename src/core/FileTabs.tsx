import { Tabs } from 'antd';

export interface PluginGroup {
  pluginId: string;
  pluginLabel: string;
  fileCount: number;
}

interface FileTabsProps {
  groups: PluginGroup[];
  activePluginId: string | null;
  onSwitch: (pluginId: string) => void;
  onAdd: () => void;
  onClose: (pluginId: string) => void;
}

export default function FileTabs({ groups, activePluginId, onSwitch, onAdd, onClose }: FileTabsProps) {
  const items = groups.map((g) => ({
    key: g.pluginId,
    label: g.pluginLabel,
    closable: true,
  }));

  const tabStyle = `
      .omv-tabs .ant-tabs-tab {
        min-width: 160px !important;
      }
      .omv-tabs .ant-tabs-tab > .ant-tabs-tab-btn {
        flex: 1 !important;
        text-align: left !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }
      .omv-tabs .ant-tabs-tab > .ant-tabs-tab-remove {
        flex-shrink: 0 !important;
        margin-left: auto !important;
      }
    `;

  return (
    <>
      <style>{tabStyle}</style>
      <Tabs
        className="omv-tabs"
        type="editable-card"
        activeKey={activePluginId ?? undefined}
        items={items}
        onChange={onSwitch}
        onEdit={(targetKey, action) => {
          if (action === 'add') {
            onAdd();
          } else if (action === 'remove' && typeof targetKey === 'string') {
            onClose(targetKey);
          }
        }}
        style={{ marginBottom: 0 }}
      />
    </>
  );
}
