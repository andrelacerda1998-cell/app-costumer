import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import CustomTouchableOpacity from "../CustomTouchableOpacity";
import { proxiedImage } from "../../utils/imageProxy";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { serviceIcon } from "./Services/operationAreaIcon";
import { Radius } from "@/constants/Layout";

const NEUTRAL_PLACEHOLDER = require("../../assets/pictures/placeholder.png");


type ServiceCardProps = {
  Icon: () => React.JSX.Element;
  label: string;
  /** handleSrc já trata a ausência (fallback local). */
  image?: string;
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

  // Sem fotografia não vale a pena fingir uma: o placeholder cinzento por baixo
  // do degradê escuro lia-se como imagem que não carregou. Nesse caso o cartão
  // passa a claro, com o ícone da categoria — ver o ramo `hasImage` abaixo.
  const hasImage = typeof image === "string" && image.trim().length > 0;

  const handleSrc = (image: any) => {
    if (image === null || image === undefined) {
      return NEUTRAL_PLACEHOLDER; // sem imagem → placeholder neutro da marca
    }

    if (process.env.NODE_ENV === "development") {
      // In emulator, we need to replace localhost with the machine's IP address
      image = image.replace('localhost', process.env.EXPO_PUBLIC_DEV_API_DOMAIN);
    }

    return { uri: proxiedImage(image, 400) };
  };

  if (!hasImage) {
    return (
      <CustomTouchableOpacity
        type="transparent"
        size="large"
        onPress={onPress}
        itemsCenter={false}
        style={{
          height: 76,
          borderRadius: Radius.md,
          padding: 0,
          overflow: "hidden",
          backgroundColor: "#FBF4E9",
          borderWidth: 1,
          borderColor: "rgba(250,187,91,0.35)",
        }}
        {...rest}
      >
        <View style={styles.fallback}>
          <View style={styles.fallbackIcon}>
            <Feather name={serviceIcon(label)} size={16} color="#A85F12" />
          </View>
          <Text style={styles.fallbackText} numberOfLines={2}>
            {label}
          </Text>
        </View>
      </CustomTouchableOpacity>
    );
  }

  return (
    <CustomTouchableOpacity
      style={{
        height: 76,
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
          contentFit="cover"
          cachePolicy="memory-disk"
          placeholder={NEUTRAL_PLACEHOLDER}
          placeholderContentFit="cover"
          transition={200}
          recyclingKey={typeof image === "string" ? image : label}
        />
        {/* Degradê mais forte e com paragem intermédia: a 0,6 o nome ficava a ler-se
            mal sobre as fotos claras (ex.: Decoração, Limpeza Doméstica). O texto
            branco precisa de fundo escuro garantido, não do acaso da fotografia. */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.45)", "rgba(0,0,0,0.82)"]}
          locations={[0, 0.45, 1]}
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
    // Cor de espera enquanto a imagem carrega — evita o cartão "vazio".
    backgroundColor: "#2A2A28",
  },
  image: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  fallback: {
    width: "100%",
    height: "100%",
    padding: 12,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  fallbackIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(250,187,91,0.28)",
  },
  fallbackText: {
    color: Colors.secondary,
    fontSize: 13.5,
    fontFamily: "Outfit-SemiBold",
    fontWeight: "600",
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "left",
    fontFamily: "Outfit-SemiBold",
    // Sombra: garante contraste mesmo se a foto tiver uma zona clara mesmo por baixo.
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default ServiceCard;
