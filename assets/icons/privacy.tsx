import React from "react";
import { Svg, G, Path, Ellipse, Rect, Circle } from "react-native-svg";

const PrivacyPolicy = ({
  width = 22,
  height = 22,
  color = "#000",
  stroke = "#000",
  strokeWidth = 1,
}) => {
  const w = width;
  const h = height;
  const scale = Math.min(w / 22, h / 22);

  return (
    <Svg width={w} height={h} viewBox="0 0 52 52" fill="none">
      <G scale={scale} origin="0,0">
        <Ellipse cx="24" cy="16" rx="18" ry="5" fill={color} opacity="1" />

        <Path
          d="M10 16c0-5 6-10 14-10s14 5 14 10c0 0-2-1-4-1-2 0-4 1-10 1s-8-1-10-1c-2 0-4 1-4 1z"
          fill={color}
        />

        <Path
          d="M8 16c0 1.5 8 4 16 4s16-2.5 16-4"
          stroke={stroke}
          strokeWidth={0.6}
          opacity={0.08}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <Rect
          x="9"
          y="26"
          width="12"
          height="8"
          rx="4"
          ry="4"
          fill="#ffffff"
          opacity="1"
        />
        <Rect
          x="9"
          y="26"
          width="12"
          height="8"
          rx="4"
          ry="4"
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth * 2}
        />

        <Rect
          x="27"
          y="26"
          width="12"
          height="8"
          rx="4"
          ry="4"
          fill="#ffffff"
          opacity="1"
        />
        <Rect
          x="27"
          y="26"
          width="12"
          height="8"
          rx="4"
          ry="4"
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth * 2}
        />

        <Path
          d="M21 30h6"
          stroke={stroke}
          strokeWidth={strokeWidth * 2}
          strokeLinecap="round"
        />

        <Path
          d="M8 29c-1 0-2 1-2 2v0"
          stroke={stroke}
          strokeWidth={strokeWidth * 2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M42 29c1 0 2 1 2 2v0"
          stroke={stroke}
          strokeWidth={strokeWidth * 2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <Ellipse cx="15" cy="29" rx="3" ry="1.6" fill="#000" opacity="0.06" />
        <Ellipse cx="33" cy="29" rx="3" ry="1.6" fill="#000" opacity="0.06" />
      </G>
    </Svg>
  );
};

export default PrivacyPolicy;
