import React from "react";
import Svg, { Polygon, Line } from "react-native-svg";

const TrashCanIcon = ({ size = 64 }) => {
   
  const stroke = Math.max(size / 32, 1);  

   
  const bucketTopWidth = 45;
  const bucketBottomWidth = 32;
  const bucketHeight = 45;
  const lidHeight = 10;
  const lidWidth = 36;

  const bucketX = (64 - bucketTopWidth) / 2;
  const bucketY = lidHeight + 5;

  const bucketPoints = `     ${bucketX},${bucketY} 
    ${bucketX + bucketTopWidth},${bucketY} 
    ${bucketX + bucketTopWidth - (bucketTopWidth - bucketBottomWidth) / 2},${
    bucketY + bucketHeight
  } 
    ${bucketX + (bucketTopWidth - bucketBottomWidth) / 2},${
    bucketY + bucketHeight
  }
  `;

  
  const lineHeight = bucketHeight * 0.6;
  const lineStartY = bucketY + (bucketHeight - lineHeight) / 2;
  const lineEndY = lineStartY + lineHeight;

  const centerX = bucketX + bucketTopWidth / 2;
  const lineSpacing = bucketBottomWidth / 4;
  const linePositions = [centerX - lineSpacing, centerX, centerX + lineSpacing];

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
  
      <Polygon
        points={`           ${(64 - lidWidth) / 2},0 
          ${(64 + lidWidth) / 2},0 
          ${(64 + lidWidth) / 2},${lidHeight} 
          ${(64 - lidWidth) / 2},${lidHeight}
        `}
        fill="white"
        stroke="black"
        strokeWidth={stroke}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      <Polygon
        points={bucketPoints}
        fill="white"
        stroke="black"
        strokeWidth={stroke}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
       
      {linePositions.map((x, i) => (
        <Line
          key={i}
          x1={x}
          y1={lineStartY}
          x2={x}
          y2={lineEndY}
          stroke="black"
          strokeWidth={stroke}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </Svg>
  );
};

export default TrashCanIcon;
