import React from 'react';
import { TouchableHighlight, TouchableHighlightProps } from "react-native";

interface FilterProps extends TouchableHighlightProps {
  selectedFilter: string | number | null; 
  filter: { id?: string; label?: string; value?: string | number } | any;
  children: React.ReactNode;
  onPress: () => void;
}

const FilterButton: React.FC<FilterProps> = ({
  selectedFilter,
  filter,
  children,
  onPress,
  ...props
}) => {
  return (
    <TouchableHighlight onPress={onPress} {...props}>
      {children}
    </TouchableHighlight>
  );
};

export default FilterButton;