import { useState } from 'react';
import { Button, Card, Form, Input, Select, Space, message } from 'antd';
import { useRequest } from 'ahooks';
import { cablesApi, devicesApi } from '../../services/api';
import { createCableOffline } from '../../services/offline';

interface DeviceItem {
  id: string;
  name: string;
  rack?: { name: string };
}

interface Paged<T> {
  data: T[];
}

const cableTypes = [
  { label: '光纤', value: 'FIBER' },
  { label: 'CAT6网线', value: 'CAT6' },
  { label: 'CAT5E网线', value: 'CAT5E' },
  { label: '电源线', value: 'POWER' },
  { label: '其他', value: 'OTHER' },
];

export default function MobileRecord() {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const isOnline = navigator.onLine;

  const { data: devicesResp } = useRequest<Paged<DeviceItem>, []>(() => devicesApi.list({ pageSize: 1000 }));
  const devices = devicesResp?.data ?? [];

  const { runAsync: createOnline } = useRequest((payload: any) => cablesApi.create(payload), {
    manual: true,
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (isOnline) {
        await createOnline(values);
        message.success('线缆创建成功');
      } else {
        await createCableOffline(values);
        message.success('已离线保存，稍后自动同步');
      }

      form.resetFields();
    } catch (error: any) {
      if (!error?.errorFields) {
        message.error(error?.message || '提交失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <Card title="记录线缆">
        <Form form={form} layout="vertical">
          <Form.Item name="srcDeviceId" label="源端设备" rules={[{ required: true, message: '请选择源端设备' }]}>
            <Select
              showSearch
              placeholder="选择源端设备"
              optionFilterProp="label"
              options={devices.map((item) => ({ label: `${item.name} (${item.rack?.name ?? '未上架'})`, value: item.id }))}
            />
          </Form.Item>
          <Form.Item name="srcPortIndex" label="源端端口" rules={[{ required: true, message: '请输入源端端口' }]}>
            <Input placeholder="例如：GE0/0/1" />
          </Form.Item>
          <Form.Item name="dstDeviceId" label="目标设备" rules={[{ required: true, message: '请选择目标设备' }]}>
            <Select
              showSearch
              placeholder="选择目标设备"
              optionFilterProp="label"
              options={devices.map((item) => ({ label: `${item.name} (${item.rack?.name ?? '未上架'})`, value: item.id }))}
            />
          </Form.Item>
          <Form.Item name="dstPortIndex" label="目标端口" rules={[{ required: true, message: '请输入目标端口' }]}>
            <Input placeholder="例如：GE0/0/2" />
          </Form.Item>
          <Form.Item name="cableType" label="线缆类型" rules={[{ required: true, message: '请选择线缆类型' }]}>
            <Select placeholder="选择线缆类型" options={cableTypes} />
          </Form.Item>
          <Form.Item name="color" label="颜色">
            <Input placeholder="例如：黄色、蓝色" />
          </Form.Item>
          <Form.Item name="purpose" label="用途">
            <Input placeholder="例如：核心链路、管理网" />
          </Form.Item>

          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <div>{isOnline ? '在线模式' : '离线模式'}</div>
            <Button type="primary" loading={submitting} onClick={handleSubmit}>
              提交
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
