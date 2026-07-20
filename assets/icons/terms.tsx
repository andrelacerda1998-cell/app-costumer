import React from "react";
import { Svg, G, Rect, Path } from "react-native-svg";

 

const ClipNotebookIcon = ({
  width = 22,
  height = 22,
  fill = "#000",
  xStroke = "#fff",
  strokeWidth = 2,
}) => {
  const w = width;
  const h = height;
  const scale = Math.min(w / 22, h / 22);

  return (
    <Svg width={w} height={h} viewBox="0 0 52 52" fill="none">
      <G scale={scale} origin="0,0">
        <Path d="M14 10c0-3 4-5 10-5s10 2 10 5v4H14v-4z" fill={fill} />

        <Path
          d="M12 16 C18 12, 30 12, 36 16"
          stroke="#fff"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />
        <Rect x="8" y="18" width="32" height="32" rx="2" fill={fill} />

        <Path
          d="M20 28 L28 38"
          stroke={xStroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Path
          d="M28 28 L20 38"
          stroke={xStroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
};

export default ClipNotebookIcon;
