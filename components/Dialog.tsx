import { useDialog } from "@/contexts/DialogContext";
import React, { useEffect } from 'react';
import { View, Text, Button, StyleSheet, Platform, Dimensions } from 'react-native';
import { CustomText } from "./CustomText";
import CustomTouchableOpacity from "./CustomTouchableOpacity";
import { useClickOutside } from "react-native-click-outside";
import { StatusBar } from "expo-status-bar";
import Modal from "react-native-modal";
import CheckMark from "@/assets/icons/check-mark";
import { Colors } from "@/constants/Colors";

// const deviceWidth = Dimensions.get("window").width;
// const deviceHeight =
//   Platform.OS === "ios"
//     ? Dimensions.get("window").height
//     : require("react-native-extra-dimensions-android").get(
//         "REAL_WINDOW_HEIGHT"
//       );

const Dialog: React.FC = () => {
  const { isOpen, closeDialog, content } = useDialog();

  const dropDownRef = useClickOutside<View>(() => {
    if (content?.onCancel) content?.onCancel();
    closeDialog();
  });

  useEffect(() => {
    if (content && content.closeAfterMSeconds) {
      const timer = setTimeout(() => {
        closeDialog();
      }, content.closeAfterMSeconds || 2000);
      return () => clearTimeout(timer);
    }
  }, [content, closeDialog]);

  const wrapperClasses = content?.customContent
    ? "items-center justify-center"
    : "items-center justify-center bg-secondary rounded-xl";

  return (
    <Modal
      isVisible={isOpen}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropColor="rgba(0, 0, 0, 0.7)"
      onBackdropPress={() => {
        if (content?.onCancel) content?.onCancel();
        closeDialog();
      }}
      onBackButtonPress={() => {
        if (content?.onCancel) content?.onCancel();
        closeDialog();
      }}
    >
      <View className={wrapperClasses}>

        <StatusBar style="light" backgroundColor="rgba(0, 0, 0, 0.5)" animated />
        
        {content && (
          content.customContent ? content.customContent : (
            <View
              ref={content?.closeOnClickOutside ? dropDownRef : undefined}
              className="w-full space-y-8 p-8"
            >
              {content.icon && (
                <View className="items-center justify-center">
                  <View className="w-10 h-10 p-3 rounded-full bg-primary">
                    {content.icon}
                  </View>
                </View>
              )}
              <View className="space-y-2">
                <CustomText size="large" color="primary" boldness="semiBold" className="text-center">{content.title}</CustomText>
                {content.subtitle && (
                  <CustomText size="small" color="gray_light" boldness="semiBold" className="text-center">{content.subtitle}</CustomText>
                )}
              </View>
              {content.successButtonText && content.cancelButtonText && (
                <View className="flex-row justify-between">
                  <View className="w-[48%]">
                    <CustomTouchableOpacity
                      size="medium"
                      type="support_secondary_outline"
                      textColor="support_secondary"
                      textBoldness="semiBold"
                      text={content.cancelButtonText}
                      onPress={() => {
                        closeDialog();
                        if (content.onCancel) content.onCancel();
                      }}
                    />
                  </View>
                  <View className="w-[48%]">
                    <CustomTouchableOpacity
                      size="medium"
                      type="primary"
                      textColor="secondary"
                      textBoldness="semiBold"
                      text={content.successButtonText}
                      onPress={() => {
                        closeDialog();
                        if (content.onSuccess) content.onSuccess();
                      }}
                    />
                  </View>
                </View>
              )}
            </View>
          )
        )}
      </View>
    </Modal>
  );
};

export default Dialog;
