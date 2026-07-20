import React from "react";
import Svg, { Rect, Line, Circle, Path } from "react-native-svg";

const AddCardIcon = ({ color = "#000", badgeColor = "#fff", badgeBg = "#000" }) => (
  <Svg width={45} height={30} viewBox="0 0 52 36" fill="none">
    {/* Card */}
    <Rect x="1" y="1" width="36" height="24" rx="3" stroke={color} strokeWidth="2" fill="none" />
    <Line x1="1" y1="8" x2="37" y2="8" stroke={color} strokeWidth="2" />
    <Rect x="4" y="14" width="7" height="2.5" rx="1" fill={color} />
    <Rect x="13" y="14" width="5" height="2.5" rx="1" fill={color} />

    {/* Plus badge */}
    <Circle cx="44" cy="28" r="7" fill={badgeBg} />
    <Path
      d="M44 24.5V31.5M40.5 28H47.5"
      stroke={badgeColor}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export default AddCardIcon;