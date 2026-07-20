import React from 'react';
import Svg, { G, Path, Defs, ClipPath, Rect } from 'react-native-svg';

interface MoreIconProps {
  color: string;
}

const MoreIcon: React.FC<MoreIconProps> = ({ color }) => (
  <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
    <G clipPath="url(#clip0_7_621)">
      <Path d="M12 6V18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 12H18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </G>
    <Defs>
      <ClipPath id="clip0_7_621">
        <Rect width="24" height="24" fill="white" />
      </ClipPath>
    </Defs>
  </Svg>
);

export default MoreIcon;