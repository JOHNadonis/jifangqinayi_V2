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
  { label: 'FIBER', value: 'FIBER' },
  { label: 'CAT6', value: 'CAT6' },
  { label: 'CAT5E', value: 'CAT5E' },
  { label: 'POWER', value: 'POWER' },
  { label: 'OTHER', value: 'OTHER' },
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
        message.success('Cable created');
      } else {
        await createCableOffline(values);
        message.success('Saved offline, will sync later');
      }

      form.resetFields();
    } catch (error: any) {
      if (!error?.errorFields) {
        message.error(error?.message || 'Submit failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <Card title="Record Cable">
        <Form form={form} layout="vertical">
          <Form.Item name="srcDeviceId" label="Source Device" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={devices.map((item) => ({ label: `${item.name} (${item.rack?.name ?? 'Unassigned'})`, value: item.id }))}
            />
          </Form.Item>
          <Form.Item name="srcPortIndex" label="Source Port" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="dstDeviceId" label="Target Device" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={devices.map((item) => ({ label: `${item.name} (${item.rack?.name ?? 'Unassigned'})`, value: item.id }))}
            />
          </Form.Item>
          <Form.Item name="dstPortIndex" label="Target Port" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="cableType" label="Cable Type" rules={[{ required: true }]}>
            <Select options={cableTypes} />
          </Form.Item>
          <Form.Item name="color" label="Color">
            <Input />
          </Form.Item>
          <Form.Item name="purpose" label="Purpose">
            <Input />
          </Form.Item>

          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <div>{isOnline ? 'Online mode' : 'Offline mode'}</div>
            <Button type="primary" loading={submitting} onClick={handleSubmit}>
              Submit
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
