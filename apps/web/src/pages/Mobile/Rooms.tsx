import { useNavigate } from 'react-router-dom';
import { useRequest } from 'ahooks';
import { List, Tag, Spin, Empty } from 'antd';
import { HomeOutlined, RightOutlined } from '@ant-design/icons';
import { roomsApi } from '../../services/api';

export default function MobileRooms() {
  const navigate = useNavigate();
  const { data, loading } = useRequest(() => roomsApi.list() as any);
  const rooms: any[] = (data as any) || [];

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>机房列表</h2>
      <Spin spinning={loading}>
        {rooms.length === 0 && !loading ? (
          <Empty description="暂无机房" />
        ) : (
          <List
            dataSource={rooms}
            renderItem={(room: any) => (
              <List.Item
                onClick={() => navigate(`/mobile/rooms/${room.id}`)}
                style={{ background: '#fff', borderRadius: 8, marginBottom: 8, padding: '12px 16px', cursor: 'pointer' }}
              >
                <List.Item.Meta
                  avatar={<HomeOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                  title={room.name}
                  description={room.location || '暂无位置信息'}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag color={room.type === 'OLD' ? 'orange' : 'green'}>
                    {room.type === 'OLD' ? '旧机房' : '新机房'}
                  </Tag>
                  <RightOutlined style={{ color: '#ccc' }} />
                </div>
              </List.Item>
            )}
          />
        )}
      </Spin>
    </div>
  );
}
