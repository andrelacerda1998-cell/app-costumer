import React from 'react'
import Svg, { Circle, Path } from 'react-native-svg'

type UserAvatarIconProps = {
  color?: string;
  width?: string | number;
  height?: string | number;
}

const UserAvatarIcon = ({ 
  color = "#000", 
  width = "100%", 
  height = "100%" 
}: UserAvatarIconProps) => {
  return (
    <Svg 
      width={width}
      height={height}
      viewBox="0 0 266 266" 
      fill="none"
    >
      <Circle cx={133} cy={133} r={133} fill={color} />
      <Path 
        d="M133 133C158.405 133 179 112.405 179 87C179 61.595 158.405 41 133 41C107.595 41 87 61.595 87 87C87 112.405 107.595 133 133 133Z" 
        fill="white"
      />
      <Path 
        d="M133 154C89.9333 154 55 188.933 55 232C55 242.667 69.8 266 133 266C196.2 266 211 242.667 211 232C211 188.933 176.067 154 133 154Z" 
        fill="white"
      />
    </Svg>
  )
}

export default UserAvatarIcon