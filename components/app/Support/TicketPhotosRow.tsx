import React from "react";
import { Image, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { MAX_TICKET_PHOTOS, type TicketPhoto } from "@/hooks/useTicketPhotos";

/**
 * As miniaturas das fotos a juntar, mais o botão de adicionar.
 *
 * Vive à parte porque aparece nos dois sítios onde se escreve ao suporte: no
 * primeiro pedido e em cada resposta. Duas cópias divergiam à primeira
 * alteração, e o cliente passava a ter dois comportamentos diferentes para a
 * mesma coisa.
 */
export default function TicketPhotosRow({
  photos,
  onAdd,
  onRemove,
  disabled = false,
  compact = false,
}: {
  photos: TicketPhoto[];
  onAdd: () => void;
  onRemove: (uri: string) => void;
  disabled?: boolean;
  /** Na caixa de resposta há menos espaço: miniaturas mais pequenas. */
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const size = compact ? 52 : 68;

  return (
    <View className="flex-row flex-wrap items-center">
      {photos.map((photo) => (
        <View key={photo.uri} className="mr-2 mb-2">
          <Image
            source={{ uri: photo.uri }}
            style={{ width: size, height: size, borderRadius: 12, backgroundColor: Colors.support_primary }}
          />
          {/* O X sobrepõe-se ao canto da miniatura: com ele por baixo, três
              fotos empurravam o botão de enviar para fora do ecrã. */}
          <TouchableOpacity
            onPress={() => onRemove(photo.uri)}
            disabled={disabled}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={t("support_ticket.photos_remove")}
            className="absolute -top-1.5 -right-1.5 rounded-full items-center justify-center"
            style={{ width: 22, height: 22, backgroundColor: Colors.secondary }}
          >
            <Feather name="x" size={13} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ))}

      {photos.length < MAX_TICKET_PHOTOS && (
        <TouchableOpacity
          onPress={onAdd}
          disabled={disabled}
          accessibilityLabel={t("support_ticket.photos_add")}
          className="mr-2 mb-2 items-center justify-center rounded-xl"
          style={{
            width: size,
            height: size,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: Colors.support_primary,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Feather name="camera" size={compact ? 15 : 18} color={Colors.gray_medium} />
          {!compact && (
            <CustomText color="gray_medium" size="specExtraSmall" boldness="regular" classes="mt-0.5">
              {t("support_ticket.photos_add")}
            </CustomText>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
