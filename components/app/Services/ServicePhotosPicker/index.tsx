import React from "react";
import { ActivityIndicator, Image, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { useApi } from "@/contexts/ApiContext";

export const MAX_SERVICE_PHOTOS = 5;

export type ServicePhoto = {
  /** id do media no backend; null enquanto está a subir. */
  id: number | null;
  /** uri local, para a miniatura aparecer de imediato. */
  uri: string;
  status: "uploading" | "done" | "error";
};

type Props = {
  photos: ServicePhoto[];
  onChange: (photos: ServicePhoto[]) => void;
};

/**
 * Fotos do problema, juntas pelo cliente no checkout.
 *
 * As fotos sobem UMA A UMA e ANTES do pagamento, para o pedido que cobra
 * continuar a ser JSON pequeno: só os ids viajam com ele. Assim, uma rede fraca
 * a subir uma foto não é uma rede fraca a pagar, e a espera acontece enquanto o
 * cliente ainda está a preencher o resto em vez de o prender no fim.
 *
 * Nada aqui bloqueia o pagamento: uma foto que falhe fica marcada e o cliente
 * pode retirá-la e seguir. O objetivo é ajudar o técnico a preparar-se, não
 * impedir a reserva — e um pedido sem foto continua a ser um pedido válido.
 */
const ServicePhotosPicker = ({ photos, onChange }: Props) => {
  const { t } = useTranslation();
  const { api } = useApi();
  const photosRef = React.useRef(photos);
  photosRef.current = photos;

  const uploadPhoto = async (uri: string) => {
    // A miniatura entra já em "uploading": ver a foto aparecer no momento em que
    // se escolhe é o que diz que o toque foi registado.
    const optimistic: ServicePhoto = { id: null, uri, status: "uploading" };
    onChange([...photosRef.current, optimistic]);

    const form = new FormData();
    const name = uri.split("/").pop() || "photo.jpg";
    const extension = name.split(".").pop()?.toLowerCase() || "jpg";
    form.append("photo", {
      uri,
      name,
      // heic/heif: é o formato por omissão do iPhone e o backend aceita-o.
      type: extension === "png" ? "image/png" : extension.startsWith("he") ? `image/${extension}` : "image/jpeg",
    } as any);

    try {
      const { data } = await api.post(API_ROUTES.CUSTOMER_SERVICE_PHOTOS, form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });
      const id = data?.data?.id ?? null;
      onChange(
        photosRef.current.map((photo) =>
          photo.uri === uri && photo.status === "uploading"
            ? { ...photo, id, status: id ? "done" : "error" }
            : photo,
        ),
      );
    } catch {
      onChange(
        photosRef.current.map((photo) =>
          photo.uri === uri && photo.status === "uploading" ? { ...photo, status: "error" } : photo,
        ),
      );
    }
  };

  const pick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const remaining = MAX_SERVICE_PHOTOS - photosRef.current.length;
    if (remaining <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.7,
    });
    if (result.canceled) return;

    for (const asset of result.assets) {
      await uploadPhoto(asset.uri);
    }
  };

  const remove = async (photo: ServicePhoto) => {
    onChange(photosRef.current.filter((item) => item.uri !== photo.uri));
    // Apagar no servidor é secundário: o que conta é não ir no pedido. Se falhar,
    // fica um ficheiro órfão em espera — invisível e de poucos KB.
    if (photo.id) {
      api.delete(API_ROUTES.CUSTOMER_SERVICE_PHOTO(photo.id)).catch(() => {});
    }
  };

  const canAddMore = photos.length < MAX_SERVICE_PHOTOS;

  return (
    <View className="mt-4">
      <CustomText color="secondary" size="small" boldness="bold">
        {t("services.checkout.photos_title")}
      </CustomText>
      <CustomText color="gray_medium" size="extraSmall" boldness="regular" classes="mt-0.5 mb-3">
        {t("services.checkout.photos_hint")}
      </CustomText>

      <View className="flex-row" style={{ flexWrap: "wrap", gap: 10 }}>
        {photos.map((photo) => (
          <View key={photo.uri} style={{ width: 72, height: 72 }}>
            <Image
              source={{ uri: photo.uri }}
              style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: Colors.support_primary }}
              resizeMode="cover"
            />

            {photo.status === "uploading" && (
              <View
                className="items-center justify-center"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  borderRadius: 12,
                  backgroundColor: "rgba(0,0,0,0.35)",
                }}
              >
                <ActivityIndicator color={Colors.support_secondary} />
              </View>
            )}

            {/* Falha visível na própria miniatura. Um toast desaparece e deixava
                o cliente a pagar convencido de que a foto seguiu. */}
            {photo.status === "error" && (
              <View
                className="items-center justify-center"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  borderRadius: 12,
                  backgroundColor: "rgba(237,73,73,0.85)",
                }}
              >
                <Feather name="alert-triangle" size={18} color={Colors.support_secondary} />
              </View>
            )}

            <TouchableOpacity
              onPress={() => remove(photo)}
              accessibilityRole="button"
              accessibilityLabel={t("services.checkout.photos_remove_a11y")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: Colors.secondary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="x" size={13} color={Colors.support_secondary} />
            </TouchableOpacity>
          </View>
        ))}

        {canAddMore && (
          <TouchableOpacity
            onPress={pick}
            accessibilityRole="button"
            accessibilityLabel={t("services.checkout.photos_add")}
            style={{
              width: 72,
              height: 72,
              borderRadius: 12,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: Colors.gray_light,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="camera" size={20} color={Colors.gray_medium} />
            <CustomText color="gray_medium" size="specExtraSmall" boldness="medium" classes="mt-1">
              {t("services.checkout.photos_add")}
            </CustomText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default ServicePhotosPicker;
