import { useState } from 'react';
import { Upload, message, Typography } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { findPluginForFile } from './pluginRegistry';
import type { MeasurePlugin, ParsedData } from './types';

const { Dragger } = Upload;
const { Text } = Typography;

interface FileUploaderProps {
  onDataParsed: (data: ParsedData, plugin: MeasurePlugin, filename: string) => void;
}

export default function FileUploader({ onDataParsed }: FileUploaderProps) {
  const [loading, setLoading] = useState(false);

  const handleFiles = async (files: File[]) => {
    setLoading(true);
    try {
      const results = await Promise.allSettled(
        files.map(async (file) => {
          const plugin = await findPluginForFile(file);
          if (!plugin) {
            message.error(`No plugin found that can parse ${file.name}.`);
            return;
          }
          const data = await plugin.parse(file);
          onDataParsed(data, plugin, file.name);
          message.success(`${file.name} parsed successfully using ${plugin.name} plugin.`);
        })
      );
      for (const r of results) {
        if (r.status === 'rejected') {
          const err = r.reason;
          message.error(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dragger
      accept=".csv,.json,.xlsx,.xls"
      multiple
      showUploadList={false}
      disabled={loading}
      beforeUpload={(file, fileList) => {
        if (file === fileList[0]) {
          handleFiles(fileList as unknown as File[]);
        }
        return false;
      }}
      style={{ padding: '40px 20px' }}
    >
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">
        {loading ? 'Parsing files...' : 'Click or drag data file(s) to this area'}
      </p>
      <p className="ant-upload-hint">
        Supports data exports from measurement devices. All processing runs locally in your browser.
      </p>
      <Text type="secondary" style={{ fontSize: 12 }}>
        Supported formats: CSV, JSON, Excel — select multiple files at once
      </Text>
    </Dragger>
  );
}
