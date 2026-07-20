import React, { useState } from 'react';
import {View, Text, Platform, Pressable, Alert} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Entypo } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import TouchOpacity from './TouchOpacity';
import { CustomFontSize, CustomText, CustomTextBoldness } from "./CustomText";
import ArrowIcon from "@/assets/icons/arrow";
import DateTimePickerModal from "react-native-modal-datetime-picker";

interface DatePickerProps {
  initialDate?: Date;
  onDateChange: (date: Date) => void;
  pressableClass?: string;
  dateInputClass?: string;
  color?: string;
  borderColor?: string;
  focusedBorderColor?: string;
  textColor?: keyof typeof Colors;
  textClass?: string;
  disabled?: boolean;
  height?: number;
  showIcon?: boolean;
  fontSize?: CustomFontSize;
  textBoldness?: CustomTextBoldness;
}

function DatePicker({
  initialDate = new Date(),
  onDateChange,
  pressableClass,
  dateInputClass,
  color = Colors.secondary,
  borderColor = Colors.primary,
  focusedBorderColor = Colors.primary,
  textColor = "secondary",
  textClass,
  disabled,
  height = 62,
  showIcon = true,
  fontSize = "medium",
  textBoldness = "regular"
}: DatePickerProps) {
  const [date, setDate] = useState(initialDate);
  const [mode, setMode] = useState<'date' | 'time'>('date');
  const [show, setShow] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirm = (selectedDate: Date) => {
    setShow(Platform.OS === 'ios');
    setDate(selectedDate);
    onDateChange(selectedDate);
    hideDatePicker();

  };

  const showMode = (currentMode: 'date' | 'time') => {
    setShow(true);
    setMode(currentMode);
  };

  const showDatepicker = () => {
    showMode('date');
    showDatePicker();
  };

  return (
    <View className="w-full">
      <TouchOpacity
        onPress={showDatepicker}
        className={`
          relative flex flex-row justify-between items-center border-2 rounded-lg py-3 px-5 mt-2
          ${show ? focusedBorderColor : borderColor}
          ${disabled ? 'opacity-60' : ''}
          ${pressableClass}
        `}
        disabled={disabled}
        style={{
          height,
        }}
      >
        <CustomText
          color={textColor}
          className={textClass}
          numberOfLines={1}
          size={fontSize}
          boldness={textBoldness}
        >
          {date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
        </CustomText>
        {showIcon && (
          <View className="w-4 h-4">
            <ArrowIcon color={Colors.secondary} position="down" />
          </View>
        )}
      </TouchOpacity>
      {show && (
        <DateTimePickerModal
          testID="dateTimePicker"
          date={date}
          mode={mode}
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          textColor={color}
          className={`${dateInputClass}`}
          timeZoneName="UTC"
          onConfirm={handleConfirm}
          onCancel={hideDatePicker}
          isVisible={isDatePickerVisible}
        />
      )}
    </View>
  );
}

export default DatePicker;
