import React from "react";
import { View } from "react-native";
import Svg, { Polygon } from "react-native-svg";

interface BoltProps {
  size?: number;
  color: string;
  strokeWidth?: number;
  filled: boolean;
  rotate?: number;
  accessibilityLabel?: string;
  style?: any;
}

//recreated because we need another bolt to another screen; later, delete one of them
const BoltSm: React.FC<BoltProps> = ({
  size = 24,
  color = "#000",
  strokeWidth = 2,
  filled = false,
  rotate = 0,
  accessibilityLabel = "bolt icon",
  style,
  ...props
}) => {
  const points = "13 2 3 14 9.5 14 8.5 22 21 9 14 9 13 2";

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[
        { width: size, 
          height: size, 
          transform: [{ rotate: `${rotate}deg` }], 
           justifyContent: "center",  // centraliza vertical
      alignItems: "center",      // centraliza horizontal
        },
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" {...props}>
        {filled ? (
          <Polygon points={points} fill={color} />
        ) : (
          <Polygon
            points={points}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </Svg>
    </View>
  );
};

export default BoltSm;
