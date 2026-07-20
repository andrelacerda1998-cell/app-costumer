import React from "react";
import { View } from "react-native";
import Svg, { Rect, Line } from "react-native-svg";

const CalendarSm = ({
  size = 24,
  color = "red",
  strokeWidth = 2,
  filled = true,
}) => {
  return (
  <View
    style={{
      width: size,
      height: size,
      justifyContent: "center",       
      alignItems: "center",          
    }}
  > 
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {filled ? (
        <>
          <Rect x="3" y="5" width="18" height="16" rx="2" fill={color} />

          <Rect x="3" y="5" width="18" height="4" fill="#FFF" />
        </>
      ) : (
        <>
          <Rect
            x="3"
            y="5"
            width="18"
            height="16"
            rx="2"
            stroke={color}
            strokeWidth={strokeWidth}
          />

          <Line
            x1="3"
            y1="9"
            x2="21"
            y2="9"
            stroke={color}
            strokeWidth={strokeWidth}
          />

          <Rect x="7" y="13" width="2" height="2" fill={color} />
          <Rect x="11" y="13" width="2" height="2" fill={color} />
          <Rect x="15" y="13" width="2" height="2" fill={color} />
        </>
      )}
    </Svg>
    </View>
  );
};

export default CalendarSm;
