import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

interface CircleProps {
  color: string;
  background: string;
}

const CircledCheckMarkFilled: React.FC<CircleProps> = ({
  color,
  background,
}) => {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12"
        cy="11.9999"
        r="9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={background}
      />
      <Path
        d="M15 10L11 14L9 12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default CircledCheckMarkFilled;
