import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

interface LoaderProps {
  text?: string;
  size?: number;
}

export const Loader: React.FC<LoaderProps> = ({ text = 'Loading...', size = 48 }) => {
  return (
    <div className="flex flex-col justify-center items-center py-12 gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Underlay Track */}
        <div 
          className="absolute inset-0 rounded-full border-[4.5px]" 
          style={{ borderColor: 'rgba(255, 142, 83, 0.12)' }} 
        />
        {/* Premium Rotating Arc */}
        <div 
          className="absolute inset-0 rounded-full border-[4.5px] animate-spin" 
          style={{ 
            borderColor: 'transparent', 
            borderTopColor: '#ff8e53',
            animationDuration: '0.85s',
            animationTimingFunction: 'cubic-bezier(0.3, 0.8, 0.3, 1)'
          }} 
        />
      </div>
      {text && (
        <Text className="text-[#ff8e53] font-bold text-sm tracking-wider animate-pulse font-['Nunito']">
          {text}
        </Text>
      )}
    </div>
  );
};

export default Loader;