import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Button, Input, List, Tag, Modal, Form, message, Tabs, Empty, Spin
} from 'antd';
import { PlusOutlined, SearchOutlined, TeamOutlined, KeyOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { projectsApi } from '../services/api';

interface Project {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  role: 'ADMIN' | 'MEMBER';
  memberCount?: number;
  _count?: { members: number };
  isMember?: boolean;
  isPending?: boolean;
}

export default function ProjectSelect() {
  const navigate = useNavigate();
  const { user, setCurrentProject, logout } = useAuthStore();
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [searchResults, setSearchResults] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [joinForm] = Form.useForm();
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => {
    loadMyProjects();
  }, []);

  const loadMyProjects = async () => {
    setLoading(true);
    try {
      const data: any = await projectsApi.list();
      setMyProjects(data);
    } catch {
      message.error('加载项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (q: string) => {
    setSearchQ(q);
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      const data: any = await projectsApi.search(q);
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    }
  };

  const handleSelect = (project: Project) => {
    setCurrentProject({ id: project.id, name: project.name, role: project.role });
    if (window.innerWidth < 768) {
      navigate('/mobile');
    } else {
      navigate('/dashboard');
    }
  };

  const handleCreate = async (values: { name: string; description?: string }) => {
    try {
      const project: any = await projectsApi.create(values);
      message.success('项目创建成功');
      setCreateOpen(false);
      createForm.resetFields();
      setCurrentProject({ id: project.id, name: project.name, role: 'ADMIN' });
      navigate('/dashboard');
    } catch (error: any) {
      message.error(error.message || '创建失败');
    }
  };

  const handleJoin = async (values: { inviteCode: string }) => {
    try {
      const result: any = await projectsApi.joinByCode(values.inviteCode);
      message.success(result.message || '申请已提交');
      setJoinOpen(false);
      joinForm.resetFields();
      // 不再直接进入项目，需要等待审批
      loadMyProjects();
    } catch (error: any) {
      message.error(error.message || '加入失败，请检查邀请码');
    }
  };

  const handleApply = async (project: any) => {
    try {
      const result: any = await projectsApi.applyToJoin(project.id);
      message.success(result.message || '申请已提交，请等待管理员审批');
      // 刷新搜索结果
      if (searchQ) {
        handleSearch(searchQ);
      }
    } catch (error: any) {
      message.error(error.message || '申请失败');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <Card style={{ width: '100%', maxWidth: 600, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0 }}>选择项目</h2>
            <p style={{ color: '#666', margin: '4px 0 0' }}>欢迎，{user?.name || user?.username}</p>
          </div>
          <Button onClick={logout} type="text" danger>退出登录</Button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            新建项目
          </Button>
          <Button icon={<KeyOutlined />} onClick={() => setJoinOpen(true)}>
            邀请码加入
          </Button>
        </div>

        <Tabs
          items={[
            {
              key: 'my',
              label: '我的项目',
              children: (
                <Spin spinning={loading}>
                  {myProjects.length === 0 && !loading ? (
                    <Empty description="暂无项目，请新建或加入一个项目" />
                  ) : (
                    <List
                      dataSource={myProjects}
                      renderItem={(project) => (
                        <List.Item
                          actions={[
                            <Button type="primary" size="small" onClick={() => handleSelect(project)}>
                              进入
                            </Button>,
                          ]}
                        >
                          <List.Item.Meta
                            avatar={<TeamOutlined style={{ fontSize: 24, color: '#667eea' }} />}
                            title={
                              <span>
                                {project.name}
                                <Tag color={project.role === 'ADMIN' ? 'blue' : 'default'} style={{ marginLeft: 8 }}>
                                  {project.role === 'ADMIN' ? '管理员' : '成员'}
                                </Tag>
                              </span>
                            }
                            description={project.description || '暂无描述'}
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </Spin>
              ),
            },
            {
              key: 'search',
              label: '搜索项目',
              children: (
                <>
                  <Input
                    prefix={<SearchOutlined />}
                    placeholder="搜索项目名称"
                    value={searchQ}
                    onChange={(e) => handleSearch(e.target.value)}
                    style={{ marginBottom: 16 }}
                  />
                  {searchResults.length === 0 ? (
                    <Empty description={searchQ ? '未找到匹配项目' : '输入关键词搜索'} />
                  ) : (
                    <List
                      dataSource={searchResults}
                      renderItem={(project: any) => (
                        <List.Item
                          actions={[
                            project.isMember ? (
                              <Button type="primary" size="small" onClick={() => handleSelect(project)}>
                                进入
                              </Button>
                            ) : project.isPending ? (
                              <Tag icon={<ClockCircleOutlined />} color="orange">
                                待审批
                              </Tag>
                            ) : (
                              <Button size="small" onClick={() => handleApply(project)}>
                                申请加入
                              </Button>
                            ),
                          ]}
                        >
                          <List.Item.Meta
                            avatar={<TeamOutlined style={{ fontSize: 24, color: '#667eea' }} />}
                            title={
                              <span>
                                {project.name}
                                <Tag style={{ marginLeft: 8 }}>
                                  {project._count?.members || 0} 人
                                </Tag>
                              </span>
                            }
                            description={project.description || '暂无描述'}
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </>
              ),
            },
          ]}
        />
      </Card>

      <Modal title="新建项目" open={createOpen} onCancel={() => setCreateOpen(false)} footer={null}>
        <Form form={createForm} onFinish={handleCreate} layout="vertical">
          <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input placeholder="例：2024年机房搬迁项目" />
          </Form.Item>
          <Form.Item name="description" label="项目描述">
            <Input.TextArea rows={3} placeholder="可选" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>创建</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="通过邀请码加入" open={joinOpen} onCancel={() => setJoinOpen(false)} footer={null}>
        <Form form={joinForm} onFinish={handleJoin} layout="vertical">
          <Form.Item name="inviteCode" label="邀请码" rules={[{ required: true, message: '请输入邀请码' }]}>
            <Input placeholder="6位邀请码，例：DEMO01" style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>提交申请</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
