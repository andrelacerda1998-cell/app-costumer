import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { useDialog } from "@/contexts/DialogContext";

/**
 * "Quando queres o serviço?" — imediato ou agendado.
 *
 * Vive aqui, e não dentro de um ecrã, porque a mesma decisão aparece em dois
 * sítios: na ficha do serviço e no cesto. Estavam apresentados de forma
 * diferente (modal num lado, dois botões no rodapé no outro) e a razão era
 * simplesmente terem sido escritos em ficheiros separados. Duplicar o JSX
 * garantiria que voltavam a divergir à primeira alteração.
 */
export const useServiceModeChooser = () => {
  const { openDialog, closeDialog } = useDialog();
  const { t } = useTranslation();

  const openModeChooser = ({
    onImmediate,
    onScheduled,
  }: {
    onImmediate: () => void;
    onScheduled: () => void;
  }) => {
    openDialog({
      customContent: (
        <View
          className="rounded-2xl bg-support_secondary px-5 py-5"
          style={{ width: "90%", maxWidth: 360 }}
        >
          {/* Saída visível: tocar fora já fechava, mas isso não se vê. */}
          <TouchableOpacity
            onPress={closeDialog}
            accessibilityRole="button"
            accessibilityLabel={t("general.close")}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ position: "absolute", top: 12, right: 12, padding: 6, zIndex: 1 }}
          >
            <Feather name="x" size={20} color={Colors.gray_medium} />
          </TouchableOpacity>

          <CustomText
            color="secondary"
            boldness="bold"
            size="large"
            classes="text-center mb-4"
            style={{ paddingHorizontal: 28 }}
          >
            {t("services.select_service_type.choose_mode_title")}
          </CustomText>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              closeDialog();
              onImmediate();
            }}
            className="rounded-2xl items-center justify-center py-3.5 mb-3"
            style={{ backgroundColor: Colors.primary }}
          >
            <View className="flex-row items-center">
              <Ionicons name="flash" size={18} color={Colors.secondary} />
              <CustomText color="secondary" size="large" boldness="bold" classes="ml-1.5">
                {t("services.select_service_type.immediate")}
              </CustomText>
            </View>
            <CustomText color="secondary" size="extraSmall" boldness="semiBold">
              {t("services.select_service_type.availableTech")}
            </CustomText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              closeDialog();
              onScheduled();
            }}
            className="rounded-2xl items-center justify-center py-3.5"
            style={{ backgroundColor: Colors.secondary }}
          >
            <View className="flex-row items-center">
              <Ionicons name="calendar" size={17} color={Colors.support_secondary} />
              <CustomText color="support_secondary" size="large" boldness="bold" classes="ml-1.5">
                {t("services.select_service_type.scheduled")}
              </CustomText>
            </View>
            <CustomText color="success" size="extraSmall" boldness="semiBold">
              {t("services.select_service_type.spare25")}
            </CustomText>
          </TouchableOpacity>
        </View>
      ),
    });
  };

  return { openModeChooser };
};

export default useServiceModeChooser;
