import { useState } from 'react';
import { Alert, Button, List, Modal, Space, Typography, Upload, message } from 'antd';
import { DownloadOutlined, InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';

const { Dragger } = Upload;
const { Text } = Typography;

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

interface ImportModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onDownloadTemplate: () => Promise<Blob>;
  onImport: (file: File) => Promise<ImportResult>;
  templateName: string;
  onSuccess?: () => void;
}

export default function ImportModal({
  open,
  title,
  onClose,
  onDownloadTemplate,
  onImport,
  templateName,
  onSuccess,
}: ImportModalProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleDownload = async () => {
    try {
      const blob = await onDownloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = templateName;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success('Template downloaded');
    } catch (error: any) {
      message.error(error?.message || 'Download failed');
    }
  };

  const handleImport = async () => {
    const file = fileList[0]?.originFileObj;
    if (!file) {
      message.warning('Please select a file first.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const importResult = await onImport(file);
      setResult(importResult);
      if (importResult.success > 0) {
        onSuccess?.();
      }
      if (importResult.failed > 0) {
        message.warning(`${importResult.failed} rows failed`);
      } else {
        message.success('Import completed');
      }
    } catch (error: any) {
      message.error(error?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls',
    fileList,
    maxCount: 1,
    beforeUpload: (file) => {
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      if (!isExcel) {
        message.error('Only Excel files are supported.');
        return Upload.LIST_IGNORE;
      }
      return false;
    },
    onChange: ({ fileList: nextList }) => {
      setFileList(nextList.slice(-1));
      setResult(null);
    },
    onRemove: () => {
      setResult(null);
    },
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      onOk={handleImport}
      okButtonProps={{ loading, disabled: fileList.length === 0 }}
      okText="Import"
      width={680}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Text strong>1. Download template</Text>
          <div style={{ marginTop: 8 }}>
            <Button icon={<DownloadOutlined />} onClick={handleDownload}>
              Download
            </Button>
          </div>
        </div>

        <div>
          <Text strong>2. Upload file</Text>
          <div style={{ marginTop: 8 }}>
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Drop or click to choose Excel file</p>
              <p className="ant-upload-hint">Supported: .xlsx, .xls</p>
            </Dragger>
          </div>
        </div>

        {result && (
          <div>
            <Alert
              type={result.failed > 0 ? 'warning' : 'success'}
              showIcon
              message={`Success: ${result.success}, Failed: ${result.failed}`}
            />
            {result.errors.length > 0 && (
              <List
                size="small"
                style={{ marginTop: 12, maxHeight: 240, overflow: 'auto' }}
                dataSource={result.errors}
                renderItem={(item) => <List.Item>{item}</List.Item>}
              />
            )}
          </div>
        )}
      </Space>
    </Modal>
  );
}
