import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface XIconProps {
  color: string;
}

const XIcon: React.FC<XIconProps> = ({ color }) => (
  <Svg width="100%" height="100%" viewBox="0 0 14 14" fill="none">
    <Path d="M13 1L1 13M1 1L13 13" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

export default XIcon;