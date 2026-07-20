import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface HomeIconProps {
  color?: string;
  filled?: boolean;
}

const HomeIcon: React.FC<HomeIconProps> = ({ color = 'white', filled = false }) => (
  <Svg width="100%" height="100%" viewBox="0 0 18 18" fill={filled ? color : "none"}>
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M13.704 17H12.2027C11.3422 16.9804 10.6791 16.3369 10.6791 15.5351V13.2462C10.6791 12.9715 10.4391 12.7484 10.1449 12.7484H7.89244C7.60444 12.7502 7.36622 12.9742 7.36622 13.2462V15.528C7.36622 15.5831 7.35822 15.6373 7.34222 15.6871C7.25778 16.424 6.59733 17 5.79733 17H4.296C2.47822 17 1 15.6018 1 13.8844V7.40076C1.008 6.66119 1.36533 5.98385 1.98222 5.53851L7.08356 1.63623C8.20622 0.788219 9.77156 0.788219 10.8916 1.63445L16.0293 5.54029C16.632 5.97851 16.9902 6.65408 17 7.38476V13.8844C17 15.6018 15.5218 17 13.704 17Z"
      stroke={color}
      strokeWidth={filled ? "0" : "1.8"}
    />
  </Svg>
);

  export default HomeIcon;