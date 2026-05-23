import api from '../../api/axios';
import React, { useState, useEffect } from 'react';
import { Button, Typography, Card, Popconfirm, App, Modal } from 'antd';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowLeftOutlined, EnvironmentOutlined, CalendarOutlined, HeartFilled, EyeOutlined, DeleteOutlined, CheckOutlined, CloseOutlined, AudioFilled, PlayCircleOutlined, DownloadOutlined } from '@ant-design/icons';

const { Text } = Typography;

export const Album: React.FC = () => {
  const { type, albumName } = useParams<{ type: string; albumName: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { memories, setMemories, fetchLoading } = useOutletContext<any>();

  const [previewVisible, setPreviewVisible] = useState(false);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{ id: number, memoryId: number }[]>([]);
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerDown = (fileId: number, memoryId: number) => {
    if (!isSelectionMode) {
      longPressTimer.current = setTimeout(() => {
        setIsSelectionMode(true);
        if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
    }
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const toggleSelection = (fileId: number, memoryId: number) => {
    setSelectedFiles(prev => {
      const exists = prev.find(f => f.id === fileId);
      if (exists) {
        const next = prev.filter(f => f.id !== fileId);
        if (next.length === 0) setIsSelectionMode(false);
        return next;
      }
      return [...prev, { id: fileId, memoryId }];
    });
  };

  const handleMultiDelete = () => {
    Modal.confirm({
      title: `Delete ${selectedFiles.length} item(s)?`,
      content: 'These items will be moved to the Trash. Are you sure?',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const promises = selectedFiles.map(f => api.delete(`/memories/file/${f.id}`));
          await Promise.all(promises);
          message.success(`${selectedFiles.length} item(s) moved to trash!`);
          
          setMemories((prev: any) => {
            return prev.map((m: any) => {
              const filesToDelete = selectedFiles.filter(sf => sf.memoryId === m.id).map(sf => sf.id);
              if (filesToDelete.length > 0) {
                const remainingFiles = m.files.filter((f: any) => !filesToDelete.includes(f.id));
                return { ...m, files: remainingFiles };
              }
              return m;
            }).filter((m: any) => m.files && m.files.length > 0);
          });
          
          setIsSelectionMode(false);
          setSelectedFiles([]);
        } catch (error) {
          message.error('Failed to delete items');
        }
      }
    });
  };



  const handleSwipeStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setTouchStart({ x: clientX, y: clientY });
  };

  const handleSwipeEnd = (e: React.TouchEvent | React.MouseEvent, listLength: number) => {
    if (touchStart === null) return;
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;
    
    const diffX = clientX - touchStart.x;
    const diffY = clientY - touchStart.y;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      // Horizontal swipe (Next / Prev photo)
      if (Math.abs(diffX) > 50) {
        if (diffX > 0) {
          setActiveFileIndex(prev => (prev === 0 ? listLength - 1 : prev - 1));
        } else {
          setActiveFileIndex(prev => (prev === listLength - 1 ? 0 : prev + 1));
        }
        setDetailsVisible(false);
      }
    } else {
      // Vertical swipe (Details slider or exit fullscreen)
      if (Math.abs(diffY) > 50) {
        if (diffY < 0) {
          // Swipe Up -> Open details
          setDetailsVisible(true);
        } else {
          // Swipe Down -> Close details, or if already closed, close fullscreen
          if (detailsVisible) {
            setDetailsVisible(false);
          } else {
            handleClosePreview();
          }
        }
      }
    }
    setTouchStart(null);
  };

  const mappedType = type === 'images' ? 'image' : type === 'videos' ? 'video' : 'audio';
  const itemLabelPlural = type === 'videos' ? 'Videos' : type === 'audio' ? 'Audios' : 'Photos';
  const itemLabelSingular = type === 'videos' ? 'Video' : type === 'audio' ? 'Audio' : 'Photo';

  const albumMemories = memories.filter((m: any) => m.type === mappedType && m.album === albumName && !m.isDeleted && m.type !== 'cover');

  // Flatten all files from all album memories for direct display and swiping!
  const allAlbumFiles = albumMemories.flatMap((m: any) => 
    (m.files || []).map((file: any, idx: number) => ({
      uid: file.uid || `${m.id}-${idx}`,
      id: file.id,
      data: file.data,
      type: m.type,
      location: m.location,
      date: m.date,
      album: m.album,
      description: m.description,
      memoryId: m.id,
      originalFileIndex: idx
    }))
  );

  const handleDeleteFile = async (fileId: number, memoryId: number) => {
    try {
      const response = await api.delete(`/memories/file/${fileId}`);
      if (response.data.success) {
        if (response.data.action === 'soft_delete_memory') {
          message.success('Memory moved to trash!');
          setMemories(memories.filter((m: any) => m.id !== memoryId));
        } else {
          message.success(`${itemLabelSingular} deleted successfully!`);
          setMemories(memories.map((m: any) => {
            if (m.id === memoryId) {
              return {
                ...m,
                files: m.files.filter((f: any) => f.id !== fileId)
              };
            }
            return m;
          }));
        }
      }
    } catch (error) {
      console.error(error);
      message.error(`Failed to delete ${itemLabelSingular.toLowerCase()}`);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = document.fullscreenElement || (document as any).webkitIsFullScreen || (document as any).mozFullScreen || (document as any).msFullscreenElement;
      if (!isFullscreen) {
        setPreviewVisible(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const handleView = (globalIdx: number) => {
    setActiveFileIndex(globalIdx);
    setDetailsVisible(false);
    setPreviewVisible(true);
    
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch((err) => console.log('Fullscreen error:', err));
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) {
      (elem as any).msRequestFullscreen();
    }
  };

  const handleClosePreview = () => {
    setPreviewVisible(false);
    if (document.fullscreenElement || (document as any).webkitIsFullScreen || (document as any).mozFullScreen || (document as any).msFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => console.log('Exit fullscreen error:', err));
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  };

  const handleDownload = (file: any) => {
    if (!file || !file.data) return;
    try {
      const parts = file.data.split(',');
      if (parts.length < 2) return;
      
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : '';
      const b64Data = parts[1];
      
      const byteCharacters = atob(b64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mime });
      
      let extension = 'bin';
      if (mime) {
        if (mime.includes('jpeg') || mime.includes('jpg')) extension = 'jpg';
        else if (mime.includes('png')) extension = 'png';
        else if (mime.includes('gif')) extension = 'gif';
        else if (mime.includes('mp4')) extension = 'mp4';
        else if (mime.includes('quicktime')) extension = 'mov';
        else if (mime.includes('mp3') || mime.includes('mpeg')) extension = 'mp3';
        else if (mime.includes('wav')) extension = 'wav';
        else {
          const mimeParts = mime.split('/');
          if (mimeParts[1]) extension = mimeParts[1];
        }
      }
      
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `memory-${file.id || Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (e) {
      console.error("Failed to download file:", e);
      const link = document.createElement('a');
      link.href = file.data;
      link.download = `memory-${file.id || Date.now()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined style={{ fontSize: '20px', color: '#ff8e53' }} />} 
          onClick={() => navigate(`/category/${type}`, { state: { activeTab: '2' } })} 
          className="flex items-center justify-center hover:bg-[#ff8e53]/10! w-[40px] sm:w-auto h-[40px] px-0 sm:px-4 gap-2"
          style={{ color: '#ff7043', border: '1.5px solid #ff7043', borderRadius: '50px' }}
        >
          <span className="hidden sm:inline text-sm">Back to Albums</span>
        </Button>
        <div className="flex flex-row items-center gap-2.5 ml-1 flex-wrap">
          <span className="text-2xl font-bold bg-gradient-to-r from-[#ff8e53] to-[#fe6b8b] capitalize bg-clip-text text-transparent font-['Nunito']! leading-normal">
            {albumName}
          </span>
          <span className="text-xs font-bold text-white bg-[#fe6b8b] px-2.5 py-0.5 rounded-full w-fit">
            {allAlbumFiles.length} {allAlbumFiles.length === 1 ? itemLabelSingular : itemLabelPlural}
          </span>
        </div>
      </div>

      {fetchLoading ? (
        <div className="text-center py-[60px]"><Text>Loading album...</Text></div>
      ) : allAlbumFiles.length === 0 ? (
        <div className="text-center py-[60px] bg-white/50 rounded-xl">
          <Text type="secondary" className="text-lg">No memories found in this album.</Text>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 sm:gap-6">
          {allAlbumFiles.map((file: any, globalIdx: number) => {
            const isSelected = selectedFiles.some(f => f.id === file.id);
            return (
            <div key={file.uid}>
              <Card 
                className={`polaroid-card gallery-thumbnail-card cursor-pointer transition-all ${isSelectionMode ? 'scale-[0.98]' : ''}`}
                hoverable
                onClick={() => {
                  if (isSelectionMode) {
                    toggleSelection(file.id, file.memoryId);
                  } else {
                    handleView(globalIdx);
                  }
                }}
                onPointerDown={() => handlePointerDown(file.id, file.memoryId)}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onPointerCancel={cancelLongPress}
                cover={
                  <div className="aspect-square w-full bg-[#f0f2f5] flex items-center justify-center rounded overflow-hidden relative group">
                    {file.type === 'video' ? (
                      <>
                        <video src={file.data} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors pointer-events-none">
                          <PlayCircleOutlined style={{ fontSize: '32px', color: 'white' }} />
                        </div>
                      </>
                    ) : file.type === 'audio' ? (
                      <AudioFilled style={{ fontSize: '48px', color: '#ff8e53' }} />
                    ) : (
                      <img src={file.data} alt="Memory" className="w-full h-full object-cover" />
                    )}
                    {isSelectionMode && (
                      <div className={`absolute inset-0 border-4 transition-all ${isSelected ? 'border-[#ff8e53] bg-black/20' : 'border-transparent bg-black/0'}`}>
                        <div 
                          className={`absolute rounded-full border-2 border-white flex items-center justify-center transition-colors ${isSelected ? 'bg-[#ff8e53]' : 'bg-black/30'}`}
                          style={{ width: 24, height: 24, bottom: 8, right: 8 }}
                        >
                          {isSelected && <CheckOutlined style={{ color: 'white', fontSize: '12px' }} />}
                        </div>
                      </div>
                    )}
                  </div>
                }
                actions={[
                  <Button 
                    type="text" 
                    icon={<EyeOutlined style={{ fontSize: '18px', color: '#ff8e53' }} />} 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleView(globalIdx);
                    }}
                    className="w-full h-full flex items-center justify-center hover:bg-[#ff8e53]/5!"
                  />,
                  <Popconfirm
                    title={`Delete this ${itemLabelSingular.toLowerCase()}?`}
                    description={`Are you sure you want to delete this ${itemLabelSingular.toLowerCase()}?`}
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      handleDeleteFile(file.id, file.memoryId);
                    }}
                    onCancel={(e) => e?.stopPropagation()}
                    okText="Yes"
                    cancelText="No"
                    okButtonProps={{ danger: true }}
                    key="delete-confirm"
                  >
                    <Button 
                      type="text" 
                      danger
                      icon={<DeleteOutlined style={{ fontSize: '18px', color: '#ff4d4f' }} />} 
                      onClick={(e) => e.stopPropagation()}
                      className="w-full h-full flex items-center justify-center hover:bg-red-50!"
                    />
                  </Popconfirm>
                ]}
              >
                <div className="flex justify-between! items-center text-[13px] mt-1">
                  <div className="text-[#666] flex-1">
                    {file.date ? <><CalendarOutlined /> {file.date}</> : <div/>}
                  </div>
                  <div className="text-[#666] text-right flex-1">
                    {file.location ? <><EnvironmentOutlined /> <Text ellipsis className="max-w-[100px]">{file.location}</Text></> : null}
                  </div>
                </div>
              </Card>
            </div>
            );
          })}
        </div>
      )}

      {/* Premium Media Preview Modal */}
      {/* Immersive Edge-to-Edge Full Screen Media Swiper Overlay */}
      {previewVisible && allAlbumFiles && allAlbumFiles.length > 0 && (
        <div className="fixed inset-0 w-full h-full bg-black z-[99999] flex flex-col justify-center items-center select-none overflow-hidden animate-fade-in">
          {/* Top Control Bar with dark gradient back shadow */}
          <div className="absolute top-0 left-0 right-0 w-full h-16 flex items-center px-4 z-30 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
            {/* Close Button on left end (interactive pointer events enabled) */}
            <div className="pointer-events-auto">
              <Button 
                type="text"
                icon={<span style={{ color: '#ffffff', fontSize: '20px', fontWeight: 'bold' }}>✕</span>}
                onClick={handleClosePreview}
                className="bg-black/40 hover:bg-black/60! border-none text-white rounded-full flex items-center justify-center w-9 h-9 shadow-md transition-all duration-300"
              />
            </div>

            {/* Swipe pagination indicator text centered */}
            {allAlbumFiles.length > 1 && (
              <div className="absolute left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-4 py-1.5 rounded-full font-bold pointer-events-none tracking-wider shadow-md">
                {activeFileIndex + 1} / {allAlbumFiles.length}
              </div>
            )}
          </div>

          {/* Immersive Media Frame */}
          <div 
            onTouchStart={handleSwipeStart}
            onTouchEnd={(e) => handleSwipeEnd(e, allAlbumFiles.length)}
            onMouseDown={handleSwipeStart}
            onMouseUp={(e) => handleSwipeEnd(e, allAlbumFiles.length)}
            className="cursor-grab active:cursor-grabbing w-full h-full flex justify-center items-center z-10"
          >
            {allAlbumFiles[activeFileIndex]?.type === 'video' ? (
              <video src={allAlbumFiles[activeFileIndex]?.data} controls autoPlay className="w-full h-full max-h-[85vh] sm:max-h-[90vh] object-contain bg-black" />
            ) : allAlbumFiles[activeFileIndex]?.type === 'audio' ? (
              <div className="w-full max-w-[450px] p-12 bg-gray-900/90 rounded-2xl flex flex-col items-center gap-6 shadow-2xl border border-gray-800 mx-4">
                <HeartFilled className="text-6xl text-[#fe6b8b] animate-pulse" />
                <audio src={allAlbumFiles[activeFileIndex]?.data} controls autoPlay className="w-full mt-2" />
              </div>
            ) : (
              <img src={allAlbumFiles[activeFileIndex]?.data} alt="Preview" draggable={false} className="w-full h-full max-h-[85vh] sm:max-h-[90vh] object-contain bg-black" />
            )}
          </div>

          {/* Swipe pagination indicator dots floating overlays */}
          {allAlbumFiles.length > 1 && (
            (() => {
              const total = allAlbumFiles.length;
              const dots = total === 2 
                ? [0, 1] 
                : [
                    (activeFileIndex - 1 + total) % total,
                    activeFileIndex,
                    (activeFileIndex + 1) % total
                  ];

              return (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full flex items-center justify-center gap-3 z-20 shadow-md min-w-[60px] h-[32px]">
                  {dots.map((actualIndex, position) => (
                    <div
                      key={position}
                      onClick={() => {
                        setActiveFileIndex(actualIndex);
                        setDetailsVisible(false);
                      }}
                      className={`rounded-full cursor-pointer transition-all duration-300 ${activeFileIndex === actualIndex ? 'w-2.5 h-2.5 bg-[#ff8e53]' : 'w-2 h-2 bg-white/50 hover:bg-white/80'}`}
                    />
                  ))}
                </div>
              );
            })()
          )}

          {/* Swipe up hint indicator (hidden when details are visible) */}
          {!detailsVisible && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/50 text-[9px] font-bold pointer-events-none tracking-widest animate-bounce z-20">
              <span className="text-xs">▲</span>
              <span>SWIPE UP FOR DETAILS</span>
            </div>
          )}

          {/* Immersive Sliding Details Card */}
          <div className={`absolute bottom-0 left-0 right-0 bg-[#121212]/95 backdrop-blur-md rounded-t-2xl border-t border-white/10 p-5 pb-8 z-40 transition-all duration-300 transform ${detailsVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
            {/* Small drag handle at the top center */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setDetailsVisible(false)} />
            
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3.5 sm:gap-8 text-white w-full max-w-5xl mx-auto">
              <div className="flex items-center gap-3 shrink-0">
                <CalendarOutlined className="text-lg text-[#ff8e53]" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Date</span>
                  <span className="text-sm font-medium">
                    {allAlbumFiles[activeFileIndex]?.date ? new Date(allAlbumFiles[activeFileIndex].date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Unknown Date'}
                  </span>
                </div>
              </div>

              {allAlbumFiles[activeFileIndex]?.location && (
                <div className="flex items-center gap-3 shrink-0">
                  <EnvironmentOutlined className="text-lg text-[#fe6b8b]" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Location</span>
                    <span className="text-sm font-medium">{allAlbumFiles[activeFileIndex]?.location}</span>
                  </div>
                </div>
              )}

              {allAlbumFiles[activeFileIndex]?.description && (
                <div className="mt-1 sm:mt-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 sm:border-l border-white/5 sm:pl-8 flex flex-col gap-1 flex-1">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Memories & Notes</span>
                  <span className="text-sm text-white/90 font-['Nunito'] leading-relaxed line-clamp-none sm:line-clamp-2">{allAlbumFiles[activeFileIndex]?.description}</span>
                </div>
              )}

              {/* Download Button */}
              <div className="flex items-center gap-3 shrink-0 mt-3 sm:mt-0">
                <Button
                  type="text"
                  icon={<DownloadOutlined style={{ fontSize: '24px', color: '#ff8e53' }} />}
                  onClick={() => handleDownload(allAlbumFiles[activeFileIndex])}
                  className="flex items-center justify-center hover:bg-[#ff8e53]/10! w-[48px] h-[48px] rounded-full border border-[#ff8e53]"
                  title="Download File"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Selection Action Bar */}
      {isSelectionMode && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 bg-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#ff8e53]/20 flex flex-row items-center gap-3 sm:gap-6 z-[100] font-['Nunito'] transition-all w-[92vw] sm:w-max max-w-[450px] justify-between sm:justify-center">
          <span className="font-bold text-[#ff8e53] whitespace-nowrap text-[13px] sm:text-base">
            {selectedFiles.length} Selected
          </span>
          <div className="h-5 sm:h-6 w-[1px] bg-gray-200 hidden sm:block"></div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={handleMultiDelete}
              disabled={selectedFiles.length === 0}
              className="flex items-center px-2 sm:px-4 text-[13px] sm:text-sm whitespace-nowrap"
            >
              Delete
            </Button>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedFiles([]);
              }}
              className="flex items-center text-gray-500 px-2 sm:px-4 text-[13px] sm:text-sm whitespace-nowrap"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default Album;