import React from "react";
import Svg, { Rect, Line } from "react-native-svg";

const CreditCardIcon = ({ size = 64, color = "#000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="2"
      y="6"
      width="20"
      height="12"
      rx="2"
      ry="2"
      stroke={color}
      strokeWidth="2"
      fill="none"
    />

    <Line x1="2" y1="10" x2="22" y2="10" stroke={color} strokeWidth="2" />

    <Rect x="4" y="14" width="6" height="2" fill={color} />
    <Rect x="12" y="14" width="6" height="2" fill={color} />
  </Svg>
);

export default CreditCardIcon;
