import React from "react";
import Svg, { Rect, Path } from "react-native-svg";

const LogoutIconLeft = ({ size = 64, color = "#000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="8"
      y="4"
      width="12"
      height="16"
      rx="2"
      ry="2"
      stroke={color}
      strokeWidth="2"
      fill="none"
    />

    <Path
      d="M8 12h10"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 8l-4 4 4 4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default LogoutIconLeft;
