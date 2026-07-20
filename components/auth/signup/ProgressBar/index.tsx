import React from 'react';
import { View } from 'react-native';

interface ProgressBarProps {
  percentage: number;
}

function ProgressBar({ percentage = 0 }: ProgressBarProps) {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  return (
    <View className="w-full h-[4px] bg-support_primary rounded-full overflow-hidden mb-4">
      <View
        className="h-full bg-primary rounded-full"
        style={{ width: `${clampedPercentage}%` }}
      />
    </View>
  );
}

export default ProgressBar;