import React from 'react';
import Svg, { G, Path, Defs, ClipPath, Rect } from 'react-native-svg';

interface ChatIconProps {
  color: string;
  filled?: boolean;
}

const ChatIcon = ({ color, filled }: ChatIconProps) => (
  <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
    <G clipPath="url(#clip0)">
      <Path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 13.4876 3.36093 14.891 4 16.1272L3 21L7.8728 20C9.10904 20.6391 10.5124 21 12 21Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M7.5 12H7.51V12.01H7.5V12Z" stroke={color} strokeWidth="3" strokeLinejoin="round"/>
      <Path d="M12 12H12.01V12.01H12V12Z" stroke={color} strokeWidth="3" strokeLinejoin="round"/>
      <Path d="M16.5 12H16.51V12.01H16.5V12Z" stroke={color} strokeWidth="3" strokeLinejoin="round"/>
    </G>
    <Defs>
      <ClipPath id="clip0">
        <Rect width="100%" height="100%" fill={color}/>
      </ClipPath>
    </Defs>
  </Svg>
);

export default ChatIcon;
