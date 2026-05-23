import api from '../api/axios';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Outlet, useNavigate } from 'react-router-dom';
import type { UploadFile } from 'antd/es/upload/interface';
import { Layout, Button, Modal, Form, Input, DatePicker, Select, Radio, Upload, App, Drawer } from 'antd';
import { LogoutOutlined, HeartFilled, PlusOutlined, UploadOutlined, MenuOutlined, DeleteOutlined, CloseOutlined } from '@ant-design/icons';

const { Header, Content } = Layout;

export const MainLayout: React.FC = () => {
  const { logout } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [memories, setMemories] = useState<any[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [coverFileList, setCoverFileList] = useState<UploadFile[]>([]);
  const [_uploadError, setUploadError] = useState<string | null>(null);
  const mediaType = Form.useWatch('type', form);

  const albums = Array.from(new Set(memories.filter(m => !m.isDeleted && m.type !== 'cover').map(m => m.album))).filter(Boolean);

  React.useEffect(() => {
    const fetchMemories = async () => {
      try {
        const response = await api.get('/memories');
        if (response.data.success) {
          setMemories(response.data.memories);
        }
      } catch (error) {
        message.error("Failed to fetch memories");
      } finally {
        setFetchLoading(false);
      }
    };
    fetchMemories();
  }, [message]);

  const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => {
        const fileError = reader.error || new Error('File read failed (could be out of memory or restricted file access)');
        reject(fileError);
      };
    });


  const handleAddMemory = async (values: any) => {
    try {
      setLoading(true);

      // Convert cover file to base64 if present
      let coverBase64 = '';
      if (coverFileList.length > 0) {
        const coverRaw = coverFileList[0].originFileObj || coverFileList[0];
        if (coverRaw instanceof File) {
          coverBase64 = await getBase64(coverRaw);
        }
      }

      if (fileList.length === 0 && !coverBase64) {
        setUploadError('Please upload files!');
        setLoading(false);
        return;
      }

      const albumName = Array.isArray(values.album) ? values.album[0] : values.album;
      const savedMemories = [];

      // 1. Save cover image memory separately (type: 'cover') if uploaded
      if (coverBase64) {
        const coverPayload = {
          type: 'cover',
          album: albumName,
          location: '',
          date: null,
          files: [coverBase64]
        };
        const coverResponse = await api.post('/memories', coverPayload);
        if (coverResponse.data.success) {
          savedMemories.push(coverResponse.data.memory);
        }
      }

      // 2. Save the actual memory (if there are general files) using FormData to avoid base64 memory crashes
      if (fileList.length > 0) {
        const formData = new FormData();
        formData.append('type', values.type || 'image');
        formData.append('location', values.location || '');
        formData.append('date', values.date ? values.date.format('YYYY-MM-DD') : '');
        formData.append('album', albumName || '');

        for (const f of fileList) {
          const rawFile = f.originFileObj || f;
          if (rawFile instanceof File) {
            formData.append('files', rawFile);
          }
        }

        const response = await api.post('/memories', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        if (response.data.success) {
          savedMemories.push(response.data.memory);
        }
      }

      if (savedMemories.length > 0) {
        // Prepend all saved memories to the state
        setMemories(prev => [...savedMemories, ...prev]);
        setIsModalVisible(false);
        form.resetFields();
        setFileList([]);
        setCoverFileList([]);
        setUploadError(null);
        message.success({ content: 'Memory saved forever!', icon: <HeartFilled style={{ color: '#fe6b8b' }} /> });
      }
    } catch (error) {
      console.error(error);
      let errorDetail = "";
      if (error && typeof error === 'object') {
        const anyErr = error as any;
        
        // Handle native Event or ProgressEvent (in case it still occurs)
        if (typeof Event !== 'undefined' && error instanceof Event) {
          const target = error.target;
          if (typeof FileReader !== 'undefined' && target instanceof FileReader) {
            errorDetail = `File read error: ${target.error?.message || target.error?.name || 'Failed to read file'}`;
          } else {
            errorDetail = `Browser Event: ${error.type}`;
          }
        } 
        // Handle Axios Response or Server error message
        else {
          const data = anyErr.response?.data;
          if (data && typeof data === 'object' && data.message) {
            errorDetail = data.message;
          } else if (data && typeof data === 'string' && !data.trim().startsWith('<')) {
            errorDetail = data.trim();
          } else if (anyErr.message) {
            errorDetail = anyErr.message;
          } else if (anyErr.name) {
            errorDetail = `${anyErr.name}: ${anyErr.message || ''}`;
          } else {
            const str = JSON.stringify(anyErr);
            errorDetail = (str === '{}' || str === '{"isTrusted":true}') ? String(error) : str;
          }
        }
      } else if (error) {
        errorDetail = String(error);
      }
      
      if (errorDetail.length > 200) {
        errorDetail = errorDetail.substring(0, 200) + '...';
      }
      message.error(`Failed to save memory: ${errorDetail || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout className="min-h-screen bg-transparent">
      <Header 
        className="flex justify-between items-center bg-white/70 backdrop-blur-md px-4 py-2 shadow-sm sticky top-0 z-10 h-auto leading-normal"
        style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div
          className="text-2xl font-bold text-[#ff8e53] cursor-pointer font-['Nunito']"
          onClick={() => navigate('/home')}
        >
          AA Memories
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-3">

          <Button
            className="friendship-btn"
            icon={<PlusOutlined />}
            size="large"
            style={{ borderRadius: '50px', padding: '0 16px' }}
            onClick={() => setIsModalVisible(true)}
          >
            Add Memories
          </Button>
          <Button
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => navigate('/trash')}
            className="font-bold text-sm px-3 py-1 hover:bg-[#ff8e53]/10!"
            style={{ color: '#ff7043', border: '1.5px solid #ff7043', borderRadius: '50px' }}
          >
            View Trash
          </Button>
          <Button
            type="text"
            danger
            icon={<LogoutOutlined />}
            onClick={logout}
            className="font-bold text-sm px-3 py-1"
            style={{ border: '1.5px solid #ff4d4f', borderRadius: '50px' }}
          >
            See you later
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <Button 
            type="text" 
            icon={<MenuOutlined style={{ fontSize: '24px', color: '#ff8e53' }} />} 
            onClick={() => setDrawerVisible(true)} 
            style={{ padding: 0, width: 'auto', height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            className="flex items-center justify-center"
          />
        </div>
      </Header>

      <Drawer
        closable={false}
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        size={250}
      >
        {/* Custom Header with close icon at the right end */}
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100">
          <span className="text-[#ff8e53] font-bold text-lg font-['Nunito']">Menu</span>
          <Button 
            type="text" 
            icon={<CloseOutlined style={{ fontSize: '24px' }} />} 
            onClick={() => setDrawerVisible(false)} 
            className="drawer-close-btn p-0 flex items-center justify-center"
          />
        </div>

        <div className="flex flex-col gap-4">
          <Button
            className="friendship-btn w-full"
            icon={<PlusOutlined />}
            size="large"
            style={{ borderRadius: '50px' }}
            onClick={() => { setIsModalVisible(true); setDrawerVisible(false); }}
          >
            Add Memories
          </Button>
          <Button
            type="text"
            icon={<DeleteOutlined />}
            className="font-bold text-base w-full flex justify-center items-center py-2 hover:bg-[#ff8e53]/10!"
            onClick={() => { navigate('/trash'); setDrawerVisible(false); }}
            style={{ color: '#ff7043', border: '1.5px solid #ff7043', borderRadius: '50px' }}
          >
            View Trash
          </Button>
          <Button
            type="text"
            danger
            icon={<LogoutOutlined />}
            onClick={logout}
            className="font-bold text-base w-full flex justify-center items-center py-2"
            style={{ border: '1.5px solid #ff4d4f', borderRadius: '50px' }}
          >
            See you later
          </Button>
        </div>
      </Drawer>

      <Content className="px-3 py-5 md:p-5 max-w-[1200px] mx-auto w-full">
        <Outlet context={{ memories, setMemories, fetchLoading }} />
      </Content>

      <Modal
        title={<span className="text-[#ff7043] text-xl">Add New Memory</span>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnHidden
        style={{ top: 40 }}
        width={680}
        styles={{ body: { minHeight: '540px', maxHeight: '85vh', overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column' } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddMemory}
          initialValues={{ type: 'image' }}
          className="mt-6"
          style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}
        >
          <div className="flex flex-col gap-2">
            <Form.Item name="type" label="Media Type">
              <Radio.Group buttonStyle="solid">
                <Radio.Button value="image">Image</Radio.Button>
                <Radio.Button value="video">Video</Radio.Button>
                <Radio.Button value="audio">Audio</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Form.Item
                label="Album Cover Image"
                name="cover"
              >
                <Upload
                  listType="picture-card"
                  fileList={coverFileList}
                  maxCount={1}
                  accept="image/*"
                  beforeUpload={(file) => {
                    const isTooLarge = file.size && file.size > 20 * 1024 * 1024;
                    if (isTooLarge) {
                      message.error(`"${file.name}" is too large! Max allowed size is 20MB to prevent mobile browser crashes.`);
                      return Upload.LIST_IGNORE;
                    }
                    return false;
                  }}
                  onRemove={() => {
                    setCoverFileList([]);
                    setTimeout(() => form.validateFields(['files']), 0);
                  }}
                  onChange={({ fileList: newFileList }) => {
                    setCoverFileList(newFileList);
                    setTimeout(() => form.validateFields(['files']), 0);
                  }}
                >
                  {coverFileList.length === 0 && (
                    <div>
                      <UploadOutlined />
                      <div className="mt-2">Upload Cover</div>
                    </div>
                  )}
                </Upload>
              </Form.Item>

              <Form.Item
                label="Upload Files"
                required
                name="files"
                rules={[
                  {
                    validator: () => {
                      if (fileList.length === 0 && coverFileList.length === 0) {
                        return Promise.reject(new Error('Please upload files!'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Upload
                  listType="picture-card"
                  fileList={fileList}
                  accept={mediaType === 'video' ? 'video/*' : mediaType === 'audio' ? 'audio/*' : 'image/*'}
                  beforeUpload={(file) => {
                    const isVideo = file.type?.startsWith('video/');
                    const maxAllowedSize = isVideo ? 500 * 1024 * 1024 : 50 * 1024 * 1024; // 500MB for video, 50MB for image/audio
                    const isTooLarge = file.size && file.size > maxAllowedSize;
                    if (isTooLarge) {
                      message.error(`"${file.name}" is too large! Max allowed size is ${isVideo ? '500MB' : '50MB'}.`);
                      return Upload.LIST_IGNORE;
                    }
                    return false;
                  }}
                  onRemove={(file) => {
                    const updated = fileList.filter(f => f.uid !== file.uid);
                    setFileList(updated);
                    setTimeout(() => form.validateFields(['files']), 0);
                  }}
                  onChange={({ fileList: newFileList }) => {
                    // Deduplicate files by name and size to ensure absolute safety
                    const uniqueFiles = newFileList.filter((file, index, self) => 
                      index === self.findIndex((t) => t.name === file.name && t.size === file.size)
                    );
                    setFileList(uniqueFiles);
                    setTimeout(() => form.validateFields(['files']), 0);
                  }}
                  multiple
                >
                  <div>
                    <UploadOutlined />
                    <div className="mt-2">Upload</div>
                  </div>
                </Upload>
              </Form.Item>
            </div>

            <Form.Item
              name="album"
              label="Album Name"
              rules={[
                {
                  validator: (_, value) => {
                    if (!value || value.length === 0) {
                      return Promise.reject(new Error('Please select or create an album!'));
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <Select
                mode="tags"
                placeholder="Select existing or type to create new album"
                maxCount={1}
                options={albums.map(a => ({ value: a, label: a }))}
              />
            </Form.Item>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Form.Item name="location" label="Location">
                <Input placeholder="E.g., Paris, France" />
              </Form.Item>
              <Form.Item name="date" label="Date">
                <DatePicker className="w-full" />
              </Form.Item>
            </div>
          </div>

          <Form.Item className="mt-auto pt-6 mb-0 text-right">
            <Button onClick={() => setIsModalVisible(false)} className="mr-3">
              Cancel
            </Button>
            <Button htmlType="submit" className="friendship-btn" loading={loading}>
              Save Memory
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};