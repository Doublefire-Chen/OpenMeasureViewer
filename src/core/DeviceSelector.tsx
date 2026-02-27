import { Card, Row, Col, Image, Typography } from 'antd';
import { getPlugins } from './pluginRegistry';
import type { MeasurePlugin } from './types';

const { Text } = Typography;

interface DeviceSelectorProps {
  onSelect: (plugin: MeasurePlugin) => void;
}

export default function DeviceSelector({ onSelect }: DeviceSelectorProps) {
  const plugins = getPlugins();

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Typography.Title level={4} style={{ marginBottom: 4 }}>
          Select a Device
        </Typography.Title>
        <Text type="secondary">
          Choose the measurement device that exported your data file.
        </Text>
      </div>
      <Row gutter={[24, 24]} justify="center">
        {plugins.map((plugin) => (
          <Col key={plugin.id} xs={24} sm={12} md={8}>
            <Card
              hoverable
              onClick={() => onSelect(plugin)}
              style={{ textAlign: 'center', height: '100%' }}
            >
              {plugin.imagePath && (
                <Image
                  src={plugin.imagePath}
                  alt={plugin.name}
                  style={{ maxHeight: 120, marginBottom: 12 }}
                  preview={false}
                />
              )}
              <Card.Meta
                title={plugin.name}
                description={
                  <>
                    <div>{plugin.brand}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{plugin.type}</Text>
                  </>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
