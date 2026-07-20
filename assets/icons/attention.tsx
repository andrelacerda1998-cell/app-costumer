import React from 'react';
import Svg, { G, Path, Defs, ClipPath, Rect } from 'react-native-svg';

interface AttentionIconProps {
  color: string;
}

const AttentionIcon: React.FC<AttentionIconProps> = ({ color }) => (
  <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
    <G clipPath="url(#clip0_196_2380)">
      <Path
        d="M12 12.0001V8.00006M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12ZM12 16.0001H12.01V16.0101H12V16.0001Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
    <Defs>
      <ClipPath id="clip0_196_2380">
        <Rect width="24" height="24" fill="white" />
      </ClipPath>
    </Defs>
  </Svg>
);

export default AttentionIcon;