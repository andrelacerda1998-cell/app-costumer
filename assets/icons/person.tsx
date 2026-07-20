import React from "react";
import { Svg, Circle, Path } from "react-native-svg";

const ProfileIcon = ({
  size = 48,
  circleColor = "#fff",
  personColor = "#333",
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Circle
        cx="32"
        cy="32"
        r="28"
        fill="none"
        stroke="#000000"
        strokeWidth={8}
      />

      <Circle cx="32" cy="32" r="28" fill={circleColor} />

      <Circle cx="32" cy="22" r="10" fill={personColor} />

      <Path
        d="M16 54c0-8.837 7.163-16 16-16s16 7.163 16 16"
        fill={personColor}
      />
    </Svg>
  );
};

export default ProfileIcon;
