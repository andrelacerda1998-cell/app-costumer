import React from "react";
import { Svg, Path, Circle } from "react-native-svg";

const GearIcon = ({ size = 24, color = "black" }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19.4 12.9c.04-.3.06-.6.06-.9s-.02-.6-.06-.9l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.07 7.07 0 0 0-1.56-.9l-.38-2.65A.5.5 0 0 0 14 2h-4a.5.5 0 0 0-.5.44l-.38 2.65a7.07 7.07 0 0 0-1.56.9l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64L4.6 11.1c-.04.3-.06.6-.06.9s.02.6.06.9l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.14.24.44.34.68.22l2.49-1c.48.36 1 .66 1.56.9l.38 2.65c.05.27.27.44.5.44h4c.23 0 .45-.17.5-.44l.38-2.65c.56-.24 1.08-.54 1.56-.9l2.49 1c.24.12.54.02.68-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
    </Svg>
  );
};

export default GearIcon;
