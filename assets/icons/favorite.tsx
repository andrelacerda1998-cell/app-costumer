import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface FavoriteProps {
  color: string;
  filled?: boolean;
}

const FavoriteIcon: React.FC<FavoriteProps> = ({ color, filled = false }) => (
  <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
    <Path
      d="M19.0711 13.1421L13.4142 18.799C12.6332 19.58 11.3668 19.58 10.5858 18.799L4.92894 13.1421C2.97632 11.1895 2.97632 8.02366 4.92894 6.07103C6.88157 4.11841 10.0474 4.11841 12 6.07103C13.9526 4.11841 17.1185 4.11841 19.0711 6.07103C21.0237 8.02366 21.0237 11.1895 19.0711 13.1421Z"
      stroke={color}
      fill={filled ? color : 'none'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default FavoriteIcon;
