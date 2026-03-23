import { useNavigate, useParams } from 'react-router-dom';
import { useRequest } from 'ahooks';
import { Descriptions, Tag, Spin, Button, List } from 'antd';
import { ArrowLeftOutlined, LinkOutlined } from '@ant-design/icons';
import { devicesApi } from '../../services/api';

const STATUS_COLORS: Record<string, string> = {
  ONLINE: 'green', MOVING: 'orange', OFFLINE: 'red', ARRIVED: 'blue',
};
const STATUS_LABELS: Record<string, string> = {
  ONLINE: '在线', MOVING: '搬迁中', OFFLINE: '离线', ARRIVED: '已到达',
};

export default function MobileDeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: device, loading } = useRequest(() => devicesApi.get(id!) as any);
  const d = device as any;

  const cables = [...(d?.cablesFrom || []), ...(d?.cablesTo || [])];

  return (
    <div>
      <div style={{ background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f0f0f0' }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} />
        <span style={{ fontWeight: 600, fontSize: 16 }}>{d?.name || '设备详情'}</span>
      </div>

      <Spin spinning={loading}>
        {d && (
          <div style={{ padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <Descriptions column={1} size="small" title="基本信息">
                <Descriptions.Item label="状态">
                  <Tag color={STATUS_COLORS[d.status]}>{STATUS_LABELS[d.status]}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="品牌型号">{d.template?.brand} {d.template?.model}</Descriptions.Item>
                <Descriptions.Item label="资产标签">{d.assetTag || '-'}</Descriptions.Item>
                <Descriptions.Item label="机柜">{d.rack?.name || '-'}</Descriptions.Item>
                <Descriptions.Item label="U位">{d.positionU || '-'}</Descriptions.Item>
                <Descriptions.Item label="备注">{d.notes || '-'}</Descriptions.Item>
              </Descriptions>
            </div>

            {cables.length > 0 && (
              <>
                <h3 style={{ margin: '0 0 12px' }}>连线信息</h3>
                <List
                  dataSource={cables}
                  renderItem={(cable: any) => (
                    <List.Item style={{ background: '#fff', borderRadius: 8, marginBottom: 8, padding: '12px 16px' }}>
                      <List.Item.Meta
                        avatar={<LinkOutlined style={{ fontSize: 18, color: '#1890ff' }} />}
                        title={cable.traceCode}
                        description={`${cable.srcPortIndex} → ${cable.dstPortIndex} · ${cable.cableType}`}
                      />
                      <Tag>{cable.status}</Tag>
                    </List.Item>
                  )}
                />
              </>
            )}
          </div>
        )}
      </Spin>
    </div>
  );
}
