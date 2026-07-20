import React from 'react';
import Svg, { Path } from 'react-native-svg';

const LocationIcon = ({ color }: { color: string }) => {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 18 20" fill="none">
      <Path d="M9 19L14 14C16.7614 11.2386 16.7614 6.76143 14 4C11.2386 1.23857 6.76143 1.23857 4 4C1.23857 6.76143 1.23857 11.2386 4 14L9 19Z" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      <Path d="M9 10C10.1046 10 11 9.10457 11 8C11 6.89543 10.1046 6 9 6C7.89543 6 7 6.89543 7 8C7 9.10457 7.89543 10 9 10Z" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
    </Svg>
  )
}

export default LocationIcon;