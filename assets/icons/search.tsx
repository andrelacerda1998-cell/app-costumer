import React from 'react';
import Svg, { G, Path, Defs, ClipPath, Rect } from 'react-native-svg';

interface SearchIconProps {
  color: string;
  filled?: boolean;
}

const SearchIcon: React.FC<SearchIconProps> = ({ color, filled = false }) => (
  <Svg width="100%" height="100%" viewBox="0 0 24 24" fill={filled ? color : "none"}>
    <G clipPath="url(#clip0)">
      <Path
        d="M21 21L16.6569 16.6569M16.6569 16.6569C18.1046 15.2091 19 13.2091 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19C13.2091 19 15.2091 18.1046 16.6569 16.6569Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </G>
    <Defs>
      <ClipPath id="clip0">
        <Rect width="24" height="24" fill="white" />
      </ClipPath>
    </Defs>
  </Svg>
);

export default SearchIcon;