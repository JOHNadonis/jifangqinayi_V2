import { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Button, Tag, Space, Select, Popconfirm, message, Descriptions, Badge, Spin, Typography, Divider,
} from 'antd';
import {
  CheckOutlined, CloseOutlined, CopyOutlined, DeleteOutlined, ReloadOutlined, UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../stores/authStore';
import { projectsApi } from '../services/api';

const { Title } = Typography;

interface MemberItem {
  id: string;
  userId: string;
  role: string;
  status: string;
  joinedAt: string;
  user: {
    id: string;
    username: string;
    name?: string;
  };
}

interface ProjectInfo {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  _count?: {
    members: number;
    rooms: number;
    racks: number;
    devices: number;
    cables: number;
  };
}

const roleLabels: Record<string, string> = {
  ADMIN: '管理员',
  MEMBER: '成员',
};

const roleColors: Record<string, string> = {
  ADMIN: 'blue',
  MEMBER: 'default',
};

const statusLabels: Record<string, string> = {
  APPROVED: '已通过',
  PENDING: '待审批',
  REJECTED: '已拒绝',
};

const statusColors: Record<string, string> = {
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'error',
};

export default function ProjectSettings() {
  const { currentProject, user } = useAuthStore();
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(true);

  const loadProject = useCallback(async () => {
    if (!currentProject) return;
    try {
      const data: any = await projectsApi.get(currentProject.id);
      setProject(data);
    } catch {
      message.error('加载项目信息失败');
    }
  }, [currentProject]);

  const loadMembers = useCallback(async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const data: any = await projectsApi.getMembers(currentProject.id);
      setMembers(data);
    } catch {
      message.error('加载成员列表失败');
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  const loadPendingRequests = useCallback(async () => {
    if (!currentProject) return;
    setPendingLoading(true);
    try {
      const data: any = await projectsApi.getPendingRequests(currentProject.id);
      setPendingRequests(data);
    } catch {
      // 可能无权限，忽略
    } finally {
      setPendingLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    loadProject();
    loadMembers();
    loadPendingRequests();
  }, [loadProject, loadMembers, loadPendingRequests]);

  const handleApprove = async (userId: string) => {
    if (!currentProject) return;
    try {
      await projectsApi.approveRequest(currentProject.id, userId);
      message.success('已批准加入');
      loadMembers();
      loadPendingRequests();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleReject = async (userId: string) => {
    if (!currentProject) return;
    try {
      await projectsApi.rejectRequest(currentProject.id, userId);
      message.success('已拒绝申请');
      loadPendingRequests();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    if (!currentProject) return;
    try {
      await projectsApi.updateMemberRole(currentProject.id, userId, role);
      message.success('角色已更新');
      loadMembers();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentProject) return;
    try {
      await projectsApi.removeMember(currentProject.id, userId);
      message.success('成员已移除');
      loadMembers();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleRegenerateCode = async () => {
    if (!currentProject) return;
    try {
      const result: any = await projectsApi.regenerateCode(currentProject.id);
      message.success('邀请码已更新');
      setProject((prev) => prev ? { ...prev, inviteCode: result.inviteCode } : prev);
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleCopyCode = () => {
    if (!project?.inviteCode) return;
    navigator.clipboard.writeText(project.inviteCode).then(() => {
      message.success('邀请码已复制');
    }).catch(() => {
      message.info(`邀请码: ${project.inviteCode}`);
    });
  };

  const pendingColumns: ColumnsType<MemberItem> = [
    {
      title: '用户名',
      key: 'username',
      render: (_, record) => record.user.username,
    },
    {
      title: '姓名',
      key: 'name',
      render: (_, record) => record.user.name || '-',
    },
    {
      title: '申请时间',
      dataIndex: 'joinedAt',
      key: 'joinedAt',
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
            onClick={() => handleApprove(record.userId)}
          >
            批准
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseOutlined />}
            onClick={() => handleReject(record.userId)}
          >
            拒绝
          </Button>
        </Space>
      ),
    },
  ];

  const memberColumns: ColumnsType<MemberItem> = [
    {
      title: '用户名',
      key: 'username',
      render: (_, record) => (
        <Space>
          <UserOutlined />
          {record.user.username}
          {record.userId === user?.id && <Tag color="green">我</Tag>}
        </Space>
      ),
    },
    {
      title: '姓名',
      key: 'name',
      render: (_, record) => record.user.name || '-',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 150,
      render: (role: string, record) => {
        if (record.userId === user?.id) {
          return <Tag color={roleColors[role]}>{roleLabels[role] || role}</Tag>;
        }
        return (
          <Select
            value={role}
            size="small"
            style={{ width: 120 }}
            onChange={(value) => handleRoleChange(record.userId, value)}
            options={[
              { label: '管理员', value: 'ADMIN' },
              { label: '成员', value: 'MEMBER' },
            ]}
          />
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={statusColors[status]}>{statusLabels[status] || status}</Tag>
      ),
    },
    {
      title: '加入时间',
      dataIndex: 'joinedAt',
      key: 'joinedAt',
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) =>
        record.userId !== user?.id ? (
          <Popconfirm
            title="确定移除该成员？"
            okText="确定"
            cancelText="取消"
            onConfirm={() => handleRemoveMember(record.userId)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              移除
            </Button>
          </Popconfirm>
        ) : null,
    },
  ];

  if (!currentProject) {
    return <div>请先选择项目</div>;
  }

  return (
    <div>
      <Title level={4}>项目设置</Title>

      <Card title="项目信息" style={{ marginBottom: 16 }}>
        {project ? (
          <Descriptions column={{ xs: 1, md: 2 }}>
            <Descriptions.Item label="项目名称">{project.name}</Descriptions.Item>
            <Descriptions.Item label="描述">{project.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="邀请码">
              <Space>
                <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px' }}>
                  {project.inviteCode}
                </Tag>
                <Button size="small" icon={<CopyOutlined />} onClick={handleCopyCode}>
                  复制
                </Button>
                <Popconfirm title="确定重新生成邀请码？旧邀请码将失效" okText="确定" cancelText="取消" onConfirm={handleRegenerateCode}>
                  <Button size="small" icon={<ReloadOutlined />}>
                    重新生成
                  </Button>
                </Popconfirm>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="统计">
              <Space>
                <Tag>成员: {project._count?.members || 0}</Tag>
                <Tag>机房: {project._count?.rooms || 0}</Tag>
                <Tag>机柜: {project._count?.racks || 0}</Tag>
                <Tag>设备: {project._count?.devices || 0}</Tag>
                <Tag>线缆: {project._count?.cables || 0}</Tag>
              </Space>
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Spin />
        )}
      </Card>

      {pendingRequests.length > 0 && (
        <Card
          title={
            <Space>
              待审批申请
              <Badge count={pendingRequests.length} />
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Table<MemberItem>
            rowKey="id"
            columns={pendingColumns}
            dataSource={pendingRequests}
            loading={pendingLoading}
            pagination={false}
            size="small"
          />
        </Card>
      )}

      <Divider />

      <Card title={`成员管理 (${members.filter((m) => m.status === 'APPROVED').length} 人)`}>
        <Table<MemberItem>
          rowKey="id"
          columns={memberColumns}
          dataSource={members.filter((m) => m.status === 'APPROVED')}
          loading={loading}
          pagination={{ pageSize: 20, showTotal: (total) => `共 ${total} 人` }}
        />
      </Card>
    </div>
  );
}
