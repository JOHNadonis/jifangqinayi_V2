import { useState } from 'react';
import { Button, Card, Descriptions, Input, Modal, Space, Tag, message } from 'antd';
import { ArrowRightOutlined, CheckOutlined, ScanOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { cablesApi } from '../../services/api';

interface CableDetail {
  id: string;
  traceCode: string;
  cableType: string;
  status: string;
  color?: string;
  purpose?: string;
  srcPortIndex: string;
  dstPortIndex: string;
  srcDevice?: { name: string; rack?: { name: string; room?: { name: string } }; positionU?: number };
  dstDevice?: { name: string; rack?: { name: string; room?: { name: string } }; positionU?: number };
}

const statusColor: Record<string, string> = {
  RECORDED: 'default',
  LABELED: 'processing',
  DISCONNECTED: 'warning',
  VERIFIED: 'success',
};

export default function MobileScanner() {
  const [traceCode, setTraceCode] = useState('');
  const [cable, setCable] = useState<CableDetail | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const { run: findCable, loading } = useRequest((code: string) => cablesApi.getByTraceCode(code), {
    manual: true,
    onSuccess: (data: CableDetail) => setCable(data),
    onError: () => {
      setCable(null);
      message.error('Cable not found');
    },
  });

  const { run: verifyCable, loading: verifying } = useRequest(
    (id: string) => cablesApi.verify(id),
    {
      manual: true,
      onSuccess: () => {
        if (cable) {
          setCable({ ...cable, status: 'VERIFIED' });
        }
        setGuideOpen(false);
        message.success('Verified');
      },
    },
  );

  const handleSearch = () => {
    const code = traceCode.trim();
    if (!code) {
      message.warning('Enter trace code first');
      return;
    }
    findCable(code.toUpperCase());
  };

  return (
    <div style={{ padding: 16 }}>
      <Card style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={traceCode}
            onChange={(e) => setTraceCode(e.target.value.toUpperCase())}
            prefix={<ScanOutlined />}
            placeholder="Scan or input trace code"
            onPressEnter={handleSearch}
          />
          <Button type="primary" onClick={handleSearch} loading={loading}>
            Search
          </Button>
        </Space.Compact>
      </Card>

      {cable ? (
        <Card title={cable.traceCode}>
          <Descriptions size="small" column={1}>
            <Descriptions.Item label="Status">
              <Tag color={statusColor[cable.status]}>{cable.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Type">{cable.cableType}</Descriptions.Item>
            <Descriptions.Item label="Source">
              {cable.srcDevice?.name} <Tag>{cable.srcPortIndex}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Target">
              {cable.dstDevice?.name} <Tag>{cable.dstPortIndex}</Tag>
            </Descriptions.Item>
            {cable.purpose && <Descriptions.Item label="Purpose">{cable.purpose}</Descriptions.Item>}
          </Descriptions>

          <Space style={{ marginTop: 12 }}>
            {cable.status !== 'VERIFIED' && (
              <Button type="primary" icon={<CheckOutlined />} onClick={() => setGuideOpen(true)}>
                Start Guide
              </Button>
            )}
            <Button onClick={() => setCable(null)}>Clear</Button>
          </Space>
        </Card>
      ) : (
        <div style={{ textAlign: 'center', color: '#999', marginTop: 48 }}>
          <ScanOutlined style={{ fontSize: 48 }} />
          <div style={{ marginTop: 8 }}>Search a cable by trace code</div>
        </div>
      )}

      <Modal open={guideOpen} footer={null} onCancel={() => setGuideOpen(false)} centered>
        <div style={{ textAlign: 'center' }}>
          <h3>Connect To</h3>
          <Card style={{ marginBottom: 12 }}>
            <div>{cable?.dstDevice?.rack?.name}</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{cable?.dstDevice?.name}</div>
            <Tag>{cable?.dstPortIndex}</Tag>
          </Card>
          <ArrowRightOutlined style={{ marginBottom: 12 }} />
          <Button
            type="primary"
            icon={<CheckOutlined />}
            loading={verifying}
            onClick={() => cable && verifyCable(cable.id)}
            block
          >
            Confirm Done
          </Button>
        </div>
      </Modal>
    </div>
  );
}
