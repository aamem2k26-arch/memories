import api from '../../api/axios';
import { Button, Popconfirm, App } from 'antd';
import { Loader } from '../../components/Loader';
import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeftOutlined, UndoOutlined, DeleteOutlined, PictureFilled, VideoCameraFilled, AudioFilled, RestOutlined, SmileOutlined } from '@ant-design/icons';

export const Trash: React.FC = () => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { memories, setMemories } = useOutletContext<any>();
  const [trashMemories, setTrashMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrash = async () => {
      try {
        const response = await api.get('/memories/trash');
        if (response.data.success) {
          setTrashMemories(response.data.memories);
        }
      } catch (error) {
        message.error('Failed to load trash');
      } finally {
        setLoading(false);
      }
    };
    fetchTrash();
  }, [message]);

  const handleRestore = async (id: number) => {
    try {
      const response = await api.put(`/memories/${id}/restore`);
      if (response.data.success) {
        message.success('Memory restored!');
        const restoredMemory = trashMemories.find(m => m.id === id);
        setTrashMemories(trashMemories.filter(m => m.id !== id));
        if (restoredMemory) {
          setMemories([{ ...restoredMemory, isDeleted: false }, ...memories]);
        }
      }
    } catch (error) {
      message.error('Failed to restore memory');
    }
  };

  const handleHardDelete = async (id: number) => {
    try {
      const response = await api.delete(`/memories/${id}/hard`);
      if (response.data.success) {
        message.success('Memory permanently deleted!');
        setTrashMemories(trashMemories.filter(m => m.id !== id));
      }
    } catch (error) {
      message.error('Failed to delete memory');
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-row items-center gap-4">
        <Button
          type="text"
          icon={<ArrowLeftOutlined style={{ fontSize: '20px', color: '#ff8e53' }} />}
          onClick={() => navigate('/home')}
          className="flex items-center justify-center hover:bg-[#ff8e53]/10! w-[40px] sm:w-auto h-[40px] px-0 sm:px-4 gap-2 shrink-0"
          style={{ color: '#ff7043', border: '1.5px solid #ff7043', borderRadius: '50px' }}
        >
          <span className="hidden sm:inline text-sm">Back Home</span>
        </Button>
        <div className="flex flex-row items-center gap-2.5 sm:gap-3 flex-wrap">
          <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#ff8e53] to-[#fe6b8b] capitalize bg-clip-text text-transparent font-['Nunito']! leading-normal">
            Trash Bin
          </span>
          <RestOutlined className="text-xl sm:text-2xl" style={{ color: '#ff8e53' }} />
          <span className="text-[10px] sm:text-xs font-bold text-white bg-[#fe6b8b] px-2.5 py-0.5 rounded-full w-fit ml-1">
            {trashMemories.length} {trashMemories.length === 1 ? 'Item' : 'Items'}
          </span>
        </div>
      </div>

      {loading ? (
        <Loader text="Loading trash..." />
      ) : trashMemories.length === 0 ? (
        <div className="text-center py-[60px] bg-[#fffaf8] backdrop-blur-md rounded-2xl max-w-md mx-auto mt-10 border border-[#ff8e53]/20 shadow-sm">
          <SmileOutlined style={{ fontSize: '72px', color: '#ff8e53' }} className="mb-4" />
          <h2 className="text-2xl font-black text-[#ff8e53] block mb-2 font-['Nunito']">Trash is Clean & Tidy!</h2>
          <span className="text-sm font-['Nunito'] text-gray-500">There are no deleted memories here.</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
          {trashMemories.map((memory: any) => (
            <div
              key={memory.id}
              className="polaroid-card flex flex-col justify-between bg-white opacity-90 hover:opacity-100 transition-all duration-300"
            >
              {/* Photo Area */}
              <div className="aspect-square w-full bg-[#f0f2f5] flex items-center justify-center rounded overflow-hidden relative">
                {memory.files.length > 0 ? (
                  <img src={memory.files[0].data} alt="Memory" className="w-full h-full object-cover filter sepia-[20%] grayscale-[20%]" />
                ) : (
                  memory.type === 'image' ? <PictureFilled style={{ fontSize: '32px', color: '#ff8e53' }} /> :
                    memory.type === 'video' ? <VideoCameraFilled style={{ fontSize: '32px', color: '#ff8e53' }} /> :
                      <AudioFilled style={{ fontSize: '32px', color: '#ff8e53' }} />
                )}

                {/* Trash Badge */}
                <div className="absolute top-1.5 right-1.5 bg-red-500/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold font-['Nunito'] shadow-sm border border-white/20">
                  Deleted
                </div>
              </div>

              {/* Information Area */}
              <div className="py-2 flex-grow flex flex-col justify-between">
                <div className="text-center">
                  <div className="text-xs sm:text-sm font-bold text-[#ff7043] truncate mb-0.5 font-['Nunito'] px-1">
                    {memory.album || 'No Album'}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-gray-500 truncate font-['Nunito'] px-1">
                    {memory.date || 'No Date'}
                  </div>
                </div>

                {/* Actions Area */}
                <div className="flex gap-1 justify-center mt-2 pt-2 border-t border-gray-100">
                  <Popconfirm
                    title="Restore Memory"
                    description="Are you sure you want to restore this?"
                    onConfirm={() => handleRestore(memory.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={<UndoOutlined />}
                      className="text-[#2ecc71] hover:bg-[#2ecc71]/10 font-bold px-1.5 py-1 h-auto text-[10px] sm:text-xs font-['Nunito'] flex-1"
                    >
                      Restore
                    </Button>
                  </Popconfirm>
                  <Popconfirm
                    title="Delete Permanently"
                    description="This action cannot be undone."
                    onConfirm={() => handleHardDelete(memory.id)}
                    okText="Yes"
                    cancelText="No"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      className="font-bold hover:bg-red-50/10 px-1.5 py-1 h-auto text-[10px] sm:text-xs font-['Nunito'] flex-1"
                    >
                      Delete
                    </Button>
                  </Popconfirm>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default Trash;