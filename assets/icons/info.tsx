import React from "react";
import Svg, { Rect, Line, Circle } from "react-native-svg";

const InfoSquareIcon = ({ size = 18, color = "#000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="2" width="20" height="20" rx="4" fill={color} />

    <Circle cx="12" cy="8" r="1.3" fill="#fff" />

    <Line
      x1="12"
      y1="11"
      x2="12"
      y2="16"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export default InfoSquareIcon;
