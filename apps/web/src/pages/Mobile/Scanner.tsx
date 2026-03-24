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

const statusLabels: Record<string, string> = {
  RECORDED: '已记录',
  LABELED: '已贴标',
  DISCONNECTED: '已拆除',
  VERIFIED: '已验证',
};

const cableTypeLabels: Record<string, string> = {
  FIBER: '光纤',
  CAT6: 'CAT6网线',
  CAT5E: 'CAT5E网线',
  POWER: '电源线',
  OTHER: '其他',
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
      message.error('未找到该线缆');
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
        message.success('验证通过');
      },
    },
  );

  const handleSearch = () => {
    const code = traceCode.trim();
    if (!code) {
      message.warning('请输入追溯码');
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
            placeholder="扫描或输入追溯码"
            onPressEnter={handleSearch}
          />
          <Button type="primary" onClick={handleSearch} loading={loading}>
            查询
          </Button>
        </Space.Compact>
      </Card>

      {cable ? (
        <Card title={cable.traceCode}>
          <Descriptions size="small" column={1}>
            <Descriptions.Item label="状态">
              <Tag color={statusColor[cable.status]}>{statusLabels[cable.status] || cable.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="线缆类型">{cableTypeLabels[cable.cableType] || cable.cableType}</Descriptions.Item>
            <Descriptions.Item label="源端设备">
              {cable.srcDevice?.name} <Tag>{cable.srcPortIndex}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="目标设备">
              {cable.dstDevice?.name} <Tag>{cable.dstPortIndex}</Tag>
            </Descriptions.Item>
            {cable.purpose && <Descriptions.Item label="用途">{cable.purpose}</Descriptions.Item>}
          </Descriptions>

          <Space style={{ marginTop: 12 }}>
            {cable.status !== 'VERIFIED' && (
              <Button type="primary" icon={<CheckOutlined />} onClick={() => setGuideOpen(true)}>
                开始验证
              </Button>
            )}
            <Button onClick={() => setCable(null)}>清除</Button>
          </Space>
        </Card>
      ) : (
        <div style={{ textAlign: 'center', color: '#999', marginTop: 48 }}>
          <ScanOutlined style={{ fontSize: 48 }} />
          <div style={{ marginTop: 8 }}>输入追溯码查询线缆信息</div>
        </div>
      )}

      <Modal open={guideOpen} footer={null} onCancel={() => setGuideOpen(false)} centered>
        <div style={{ textAlign: 'center' }}>
          <h3>连接至目标</h3>
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
            确认完成
          </Button>
        </div>
      </Modal>
    </div>
  );
}
