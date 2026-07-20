import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface ArrowProps {
  color: string;
  position: 'left' | 'right' | 'up' | 'down';
  strokeWidth?: number;
}

const ArrowIcon: React.FC<ArrowProps> = ({ color, position, strokeWidth = 2, ...props }) => {
  let rotation = 0;
  switch (position) {
    case 'left':
      rotation = 0;
      break;
    case 'up':
      rotation = 90;
      break;
    case 'right':
      rotation = 180;
      break;
    case 'down':
      rotation = -90;
      break;
  }

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 9 16"
      fill="none"
      {...props}
      style={{ transform: [{ rotate: `${rotation}deg` }] }}
    >
      <Path
        d="M7.46154 1L1 8L7.46154 15"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default ArrowIcon;