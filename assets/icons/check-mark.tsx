import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface CheckMarkProps {
  color: string;
}

const CheckMark: React.FC<CheckMarkProps> = ({ color }) => (
  <Svg width="100%" height="100%" viewBox="0 0 17 12" fill="none">
    <Path d="M16 1L6 11L1 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>
);

export default CheckMark;
