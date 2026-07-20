import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

const CircledX = ({ color }: { color: string }) => {
  return (
    <Svg width="95%" height="95%" viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="11.9999" r="9" fill="#EF4444" />
      <Path
        d="M9 9L15 15M15 9L9 15"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default CircledX;
