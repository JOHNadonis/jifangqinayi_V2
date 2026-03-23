import { useNavigate, useParams } from 'react-router-dom';
import { useRequest } from 'ahooks';
import { List, Tag, Spin, Button, Descriptions } from 'antd';
import { ArrowLeftOutlined, AppstoreOutlined, RightOutlined } from '@ant-design/icons';
import { roomsApi, racksApi } from '../../services/api';

export default function MobileRoomDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: room, loading: roomLoading } = useRequest(() => roomsApi.get(id!) as any);
  const { data: racksData, loading: racksLoading } = useRequest(() => racksApi.list({ roomId: id }) as any);
  const racks: any[] = (racksData as any) || [];

  return (
    <div>
      <div style={{ background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f0f0f0' }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/mobile/rooms')} />
        <span style={{ fontWeight: 600, fontSize: 16 }}>{(room as any)?.name ?? '机房详情'}</span>
      </div>

      <Spin spinning={roomLoading}>
        {(room as any) && (
          <div style={{ padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="位置">{(room as any).location || '-'}</Descriptions.Item>
                <Descriptions.Item label="类型">
                  <Tag color={(room as any).type === 'OLD' ? 'orange' : 'green'}>
                    {(room as any).type === 'OLD' ? '旧机房' : '新机房'}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </div>

            <h3 style={{ margin: '0 0 12px' }}>机柜列表</h3>
            <Spin spinning={racksLoading}>
              <List
                dataSource={racks}
                renderItem={(rack: any) => (
                  <List.Item
                    onClick={() => navigate(`/mobile/racks/${rack.id}`)}
                    style={{ background: '#fff', borderRadius: 8, marginBottom: 8, padding: '12px 16px', cursor: 'pointer' }}
                  >
                    <List.Item.Meta
                      avatar={<AppstoreOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
                      title={rack.name}
                      description={`${rack.totalU}U · 已用 ${rack.usedU || 0}U`}
                    />
                    <RightOutlined style={{ color: '#ccc' }} />
                  </List.Item>
                )}
              />
            </Spin>
          </div>
        )}
      </Spin>
    </div>
  );
}
