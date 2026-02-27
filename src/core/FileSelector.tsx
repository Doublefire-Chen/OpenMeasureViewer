import { Select, Button, Space, Popconfirm } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import type { FileEntry } from './types';

interface FileSelectorProps {
  files: FileEntry[];
  activeFileId: string | null;
  onSwitch: (fileId: string) => void;
  onRemove: (fileId: string) => void;
}

export default function FileSelector({ files, activeFileId, onSwitch, onRemove }: FileSelectorProps) {
  if (files.length === 0) return null;

  const options = files.map((f) => ({
    value: f.id,
    label: f.filename,
  }));

  return (
    <Space size="small" align="center" style={{ padding: '8px 0' }}>
      <span style={{ fontWeight: 500 }}>File:</span>
      <Select
        size="small"
        style={{ minWidth: 220 }}
        value={activeFileId ?? undefined}
        options={options}
        onChange={onSwitch}
      />
      {activeFileId && (
        <Popconfirm
          title="Remove this file?"
          onConfirm={() => onRemove(activeFileId)}
          okText="Yes"
          cancelText="No"
          placement="right"
        >
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            style={{ color: '#999' }}
          />
        </Popconfirm>
      )}
    </Space>
  );
}
