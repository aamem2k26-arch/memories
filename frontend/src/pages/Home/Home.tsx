import React from 'react';
import { Card, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PictureFilled, VideoCameraFilled, AudioFilled } from '@ant-design/icons';

const { Title, Text } = Typography;

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <div className="text-center mb-8">
        <Title level={2} style={{ color: '#ff8e53', fontWeight: 800 }}>Our Shared Memories</Title>
        <Text type="secondary" className="text-base">Relive the best moments we've spent together</Text>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto justify-items-center ">
        <div onClick={() => navigate('/category/images')} className="cursor-pointer w-full max-w-[320px] ">
          <Card
            className="polaroid-card"
            cover={
              <div style={{
                height: '200px',
                width: '100%',
                background: 'linear-gradient(to bottom right, #ffd3b6, #ffaaa5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <PictureFilled style={{
                  fontSize: '72px',
                  color: '#ffffff',
                  filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'
                }} />
              </div>
            }
          >
            <Card.Meta title={<span className="home-card-title" style={{ fontSize: '20px', fontWeight: 700, color: '#ff7043' }}>Our Photos</span>} description="Snapshots of joy" />
          </Card>
        </div>
        <div onClick={() => navigate('/category/videos')} className="cursor-pointer w-full max-w-[320px] rounded-4xl">
          <Card
            className="polaroid-card"
            cover={
              <div style={{
                height: '200px',
                width: '100%',
                background: 'linear-gradient(to bottom right, #a8e6cf, #dcedc1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <VideoCameraFilled style={{
                  fontSize: '72px',
                  color: '#ffffff'
                }} />
              </div>
            }
          >
            <Card.Meta title={<span className="home-card-title" style={{ fontSize: '20px', fontWeight: 700, color: '#2ecc71' }}>Our Videos</span>} description="Moving memories" />
          </Card>
        </div>
        <div onClick={() => navigate('/category/audio')} className="cursor-pointer w-full max-w-[320px]">
          <Card
            className="polaroid-card"
            cover={
              <div style={{
                height: '200px',
                width: '100%',
                background: 'linear-gradient(to bottom right, #d4a5ff, #ffb7b2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <AudioFilled style={{
                  fontSize: '72px',
                  color: '#ffffff'
                }} />
              </div>
            }
          >
            <Card.Meta title={<span className="home-card-title" style={{ fontSize: '20px', fontWeight: 700, color: '#9b59b6' }}>Voice Notes</span>} description="Laughs & stories" />
          </Card>
        </div>
      </div>
    </>
  );
};

export default Home;