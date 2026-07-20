import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import CustomTouchableOpacity from "../CustomTouchableOpacity";

type ServiceCardProps = {
  Icon: () => React.JSX.Element;
  label: string;
  image: string;
  onPress: () => void;
  otherClasses?: string;
  isHome?: boolean;
  style?: any;
};

const ServiceCard = ({
  Icon,
  label,
  image,
  onPress,
  otherClasses = "",
  isHome = false,
  style,
  ...rest
}: ServiceCardProps) => {
  const styles = createStyles();

  const handleSrc = (image: any) => {
    if (image === null || image === undefined) {
      return require("../../assets/pictures/operation.jpeg");
    }

    if (process.env.NODE_ENV === "development") {
      // In emulator, we need to replace localhost with the machine's IP address
      image = image.replace('localhost', process.env.EXPO_PUBLIC_DEV_API_DOMAIN);
    }

    return { uri: image };
  };

  return (
    <CustomTouchableOpacity
      style={{
        height: 100,
        backgroundColor: "transparent",
        overflow: "hidden",
      }}
      className="bg-secondary rounded-2xl"
      onPress={onPress}
      type="secondary"
      size="large"
      {...rest}
    >
      <View style={styles.container}>
        <Image
          source={handleSrc(image)}
          style={styles.image}
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.6)"]}
          style={styles.labelContainer}
        >
          <Text style={styles.text} numberOfLines={2}>
            {label}
          </Text>
        </LinearGradient>
      </View>
    </CustomTouchableOpacity>
  );
};

const createStyles = () => StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  image: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    resizeMode: "stretch",
  },
  labelContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
    paddingLeft: 10,
    paddingBottom: 8,
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "left",
    fontFamily: "Outfit-SemiBold",
  },
});

export default ServiceCard;
