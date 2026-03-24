import { useMemo, useState } from 'react';
import { Button, Card, Form, Input, Select, Space, message } from 'antd';
import { useRequest } from 'ahooks';
import { cablesApi, devicesApi } from '../../services/api';
import { createCableOffline } from '../../services/offline';

interface DeviceTemplate {
  portLayout?: string;
}

interface DeviceItem {
  id: string;
  name: string;
  rack?: { name: string };
  template?: DeviceTemplate;
}

interface PortItem {
  key: string;
  type: string;
  panel: 'FRONT' | 'REAR';
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

function toPortItems(layout: unknown): PortItem[] {
  let parsed: any = layout;
  if (typeof layout === 'string') {
    try { parsed = JSON.parse(layout); } catch { parsed = {}; }
  }
  if (!parsed || typeof parsed !== 'object') return [];
  const front = Array.isArray(parsed?.front) ? parsed.front : [];
  const rear = Array.isArray(parsed?.rear) ? parsed.rear : [];
  const normalize = (ports: any[], panel: 'FRONT' | 'REAR'): PortItem[] =>
    ports
      .map((port) => {
        const key = String(port?.index ?? port?.id ?? port?.name ?? '').trim();
        if (!key) return null;
        return { key, type: String(port?.type ?? 'UNKNOWN'), panel };
      })
      .filter((p): p is PortItem => p !== null);
  return [...normalize(front, 'FRONT'), ...normalize(rear, 'REAR')];
}

export default function MobileRecord() {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [srcDeviceId, setSrcDeviceId] = useState<string | undefined>();
  const [dstDeviceId, setDstDeviceId] = useState<string | undefined>();
  const isOnline = navigator.onLine;

  const { data: devicesResp } = useRequest<Paged<DeviceItem>, []>(() => devicesApi.list({ pageSize: 1000 }));
  const devices = devicesResp?.data ?? [];

  const srcPorts = useMemo(() => {
    if (!srcDeviceId) return [];
    const device = devices.find((d) => d.id === srcDeviceId);
    return toPortItems(device?.template?.portLayout);
  }, [srcDeviceId, devices]);

  const dstPorts = useMemo(() => {
    if (!dstDeviceId) return [];
    const device = devices.find((d) => d.id === dstDeviceId);
    return toPortItems(device?.template?.portLayout);
  }, [dstDeviceId, devices]);

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
      setSrcDeviceId(undefined);
      setDstDeviceId(undefined);
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
              onChange={(value) => {
                setSrcDeviceId(value);
                form.setFieldValue('srcPortIndex', undefined);
              }}
              options={devices.map((item) => ({ label: `${item.name} (${item.rack?.name ?? '未上架'})`, value: item.id }))}
            />
          </Form.Item>
          <Form.Item name="srcPortIndex" label="源端端口" rules={[{ required: true, message: '请选择源端端口' }]}>
            {srcPorts.length > 0 ? (
              <Select
                showSearch
                placeholder="选择端口"
                optionFilterProp="label"
                options={srcPorts.map((port) => ({
                  value: port.key,
                  label: `${port.panel === 'FRONT' ? '前' : '后'}:${port.key} (${port.type})`,
                }))}
              />
            ) : (
              <Input placeholder={srcDeviceId ? '该设备暂无端口配置，请手动输入' : '请先选择源端设备'} />
            )}
          </Form.Item>
          <Form.Item name="dstDeviceId" label="目标设备" rules={[{ required: true, message: '请选择目标设备' }]}>
            <Select
              showSearch
              placeholder="选择目标设备"
              optionFilterProp="label"
              onChange={(value) => {
                setDstDeviceId(value);
                form.setFieldValue('dstPortIndex', undefined);
              }}
              options={devices.map((item) => ({ label: `${item.name} (${item.rack?.name ?? '未上架'})`, value: item.id }))}
            />
          </Form.Item>
          <Form.Item name="dstPortIndex" label="目标端口" rules={[{ required: true, message: '请选择目标端口' }]}>
            {dstPorts.length > 0 ? (
              <Select
                showSearch
                placeholder="选择端口"
                optionFilterProp="label"
                options={dstPorts.map((port) => ({
                  value: port.key,
                  label: `${port.panel === 'FRONT' ? '前' : '后'}:${port.key} (${port.type})`,
                }))}
              />
            ) : (
              <Input placeholder={dstDeviceId ? '该设备暂无端口配置，请手动输入' : '请先选择目标设备'} />
            )}
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
