import api from '../api/axios';
import axios from 'axios';
import { compressVideoIfNeeded } from '../utils/compressor';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Outlet, useNavigate } from 'react-router-dom';
import type { UploadFile } from 'antd/es/upload/interface';
import { Layout, Button, Modal, Form, Input, DatePicker, Select, Radio, Upload, App, Drawer, Progress } from 'antd';
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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
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




  const uploadFileToCloudinary = async (
    fileObj: File, 
    sigData: any,
    onProgress?: (percent: number) => void
  ): Promise<string> => {
    const isVideoOrAudio = fileObj.type.startsWith('video/') || fileObj.type.startsWith('audio/');
    const resourceType = isVideoOrAudio ? 'video' : 'image';
    const fileSize = fileObj.size;

    // Use 6MB chunks for videos or large files (> 6MB) to prevent socket timeouts / stalling
    const chunkSize = 6 * 1024 * 1024; // 6MB chunk

    if (fileSize <= chunkSize) {
      const formData = new FormData();
      formData.append('file', fileObj);
      formData.append('api_key', sigData.apiKey);
      formData.append('timestamp', sigData.timestamp.toString());
      formData.append('signature', sigData.signature);
      formData.append('folder', sigData.folder || 'memories');

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${sigData.cloudName}/${resourceType}/upload`,
        formData,
        {
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total && onProgress) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(percent);
            }
          },
          timeout: 300000 // 5 minutes
        }
      );
      return response.data.secure_url;
    }

    // Large file / Video: Chunked upload (Uploads 6MB at a time so connection never stalls!)
    const uniqueUploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    let start = 0;
    let responseData: any = null;

    while (start < fileSize) {
      const end = Math.min(start + chunkSize, fileSize);
      const chunk = fileObj.slice(start, end);

      const formData = new FormData();
      formData.append('file', chunk, fileObj.name);
      formData.append('api_key', sigData.apiKey);
      formData.append('timestamp', sigData.timestamp.toString());
      formData.append('signature', sigData.signature);
      formData.append('folder', sigData.folder || 'memories');

      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${sigData.cloudName}/${resourceType}/upload`,
        formData,
        {
          headers: {
            'X-Unique-Upload-Id': uniqueUploadId,
            'Content-Range': `bytes ${start}-${end - 1}/${fileSize}`
          },
          timeout: 300000
        }
      );

      start = end;
      if (onProgress) {
        onProgress(Math.round((start * 100) / fileSize));
      }
      responseData = res.data;
    }

    return responseData.secure_url;
  };

  const handleAddMemory = async (values: any) => {
    try {
      setLoading(true);
      setUploadProgress(0);

      if (fileList.length === 0 && coverFileList.length === 0) {
        setUploadError('Please upload files!');
        setLoading(false);
        setUploadProgress(null);
        return;
      }

      const albumName = Array.isArray(values.album) ? values.album[0] : values.album;
      const savedMemories = [];

      // 1. Fetch Cloudinary upload signature for direct CDN upload (bypasses Vercel 4.5MB limit!)
      let sigData: any = null;
      try {
        setUploadStatusText('Preparing secure upload...');
        const sigRes = await api.get('/memories/signature');
        if (sigRes.data.success) {
          sigData = sigRes.data;
        }
      } catch (err) {
        console.warn('Could not fetch upload signature, falling back to server upload:', err);
      }

      // 2. Upload Cover Image (if present)
      let coverUrl = '';
      if (coverFileList.length > 0) {
        const coverRaw = (coverFileList[0].originFileObj || coverFileList[0]) as File;
        if (coverRaw instanceof File && sigData) {
          setUploadStatusText('Uploading album cover...');
          coverUrl = await uploadFileToCloudinary(coverRaw, sigData, (p) => setUploadProgress(p));
        }
      }

      if (coverUrl) {
        const coverPayload = {
          type: 'cover',
          album: albumName,
          location: '',
          date: null,
          files: [coverUrl]
        };
        const coverResponse = await api.post('/memories', coverPayload);
        if (coverResponse.data.success) {
          savedMemories.push(coverResponse.data.memory);
        }
      }

      // 3. Upload Main Media Files (Images / Videos / Audio)
      if (fileList.length > 0) {
        const uploadedUrls: string[] = [];

        if (sigData) {
          for (let i = 0; i < fileList.length; i++) {
            const f = fileList[i];
            let rawFile = (f.originFileObj || f) as File;
            if (rawFile instanceof File) {
              const fileTypeLabel = rawFile.type.startsWith('video/') ? 'Video' : rawFile.type.startsWith('audio/') ? 'Audio' : 'Photo';
              
              if (rawFile.type.startsWith('video/') && rawFile.size > 90 * 1024 * 1024) {
                setUploadStatusText(`Optimizing ${fileTypeLabel} ${i + 1}/${fileList.length} (${Math.round(rawFile.size / (1024 * 1024))}MB)...`);
                rawFile = await compressVideoIfNeeded(rawFile, (statusTxt) => setUploadStatusText(statusTxt));
              }

              setUploadStatusText(`Uploading ${fileTypeLabel} ${i + 1}/${fileList.length} (0%)...`);
              const url = await uploadFileToCloudinary(rawFile, sigData, (percent) => {
                setUploadProgress(percent);
                setUploadStatusText(`Uploading ${fileTypeLabel} ${i + 1}/${fileList.length} (${percent}%)...`);
              });
              uploadedUrls.push(url);
            }
          }
        }

        if (uploadedUrls.length > 0) {
          setUploadStatusText('Saving memory to database...');
          // Direct Cloudinary URLs payload
          const payload = {
            type: values.type || 'image',
            album: albumName || '',
            location: values.location || '',
            date: values.date ? values.date.format('YYYY-MM-DD') : '',
            files: uploadedUrls
          };
          const response = await api.post('/memories', payload);
          if (response.data.success) {
            savedMemories.push(response.data.memory);
          }
        } else {
          setUploadStatusText('Uploading files via server...');
          // Fallback multipart upload
          const formData = new FormData();
          formData.append('type', values.type || 'image');
          formData.append('location', values.location || '');
          formData.append('date', values.date ? values.date.format('YYYY-MM-DD') : '');
          formData.append('album', albumName || '');

          for (const f of fileList) {
            const rawFile = (f.originFileObj || f) as File;
            if (rawFile instanceof File) {
              formData.append('files', rawFile);
            }
          }

          const response = await api.post('/memories', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          if (response.data.success) {
            savedMemories.push(response.data.memory);
          }
        }
      }

      if (savedMemories.length > 0) {
        setMemories(prev => [...savedMemories, ...prev]);
        setIsModalVisible(false);
        form.resetFields();
        setFileList([]);
        setCoverFileList([]);
        setUploadError(null);
        message.success({ content: 'Memory saved forever!', icon: <HeartFilled style={{ color: '#fe6b8b' }} /> });
      }
    } catch (error: any) {
      console.error(error);
      let errorDetail = '';
      if (error?.response?.data?.error?.message) {
        errorDetail = `Cloudinary: ${error.response.data.error.message}`;
      } else if (error?.response?.data?.message) {
        errorDetail = error.response.data.message;
      } else if (error?.message) {
        errorDetail = error.message;
      } else {
        errorDetail = String(error);
      }
      message.error(`Failed to save memory: ${errorDetail}`);
    } finally {
      setLoading(false);
      setUploadProgress(null);
      setUploadStatusText('');
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

          {loading && uploadStatusText && (
            <div className="mb-4 p-3.5 bg-[#fffaf8] rounded-xl border border-[#ff8e53]/30 text-center font-['Nunito'] shadow-sm">
              <div className="text-sm font-bold text-[#ff7043] mb-1.5">{uploadStatusText}</div>
              {uploadProgress !== null && (
                <Progress 
                  percent={uploadProgress} 
                  status="active" 
                  strokeColor={{ '0%': '#ff8e53', '100%': '#fe6b8b' }} 
                  className="m-0"
                />
              )}
            </div>
          )}

          <Form.Item className="mt-auto pt-4 mb-0 text-right">
            <Button onClick={() => setIsModalVisible(false)} className="mr-3" disabled={loading}>
              Cancel
            </Button>
            <Button htmlType="submit" className="friendship-btn" loading={loading}>
              {loading ? (uploadStatusText || 'Uploading...') : 'Save Memory'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};