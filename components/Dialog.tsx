import { useDialog } from "@/contexts/DialogContext";
import React, { useEffect } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { CustomText } from "./CustomText";
import CustomTouchableOpacity from "./CustomTouchableOpacity";
import { StatusBar } from "expo-status-bar";

/**
 * A caixa de diálogo da app — avisos, erros e confirmações.
 *
 * Usa o `Modal` do próprio React Native e não o `react-native-modal`: com esse,
 * a partir do SDK 54 (RN 0.81) o diálogo abria (isOpen a true) e não desenhava
 * nada. Nenhum erro, nenhum aviso — o cliente tocava em "Pedir agora", o
 * servidor recusava com uma mensagem escrita para ser lida, e o ecrã não mexia.
 *
 * Ao mesmo tempo sai o `react-native-click-outside`: tocar fora é o que o
 * `Pressable` do fundo já faz, e aquela biblioteca não tem manutenção desde
 * 2023.
 */
const Dialog: React.FC = () => {
  const { isOpen, closeDialog, content } = useDialog();

  useEffect(() => {
    if (!isOpen || !content?.closeAfterMSeconds) return;
    const timer = setTimeout(() => closeDialog(), content.closeAfterMSeconds);
    return () => clearTimeout(timer);
    // `closeDialog` fica de fora de propósito: é recriada a cada render do
    // provider, e tê-la aqui reiniciava o contador sem parar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, content]);

  const dismiss = () => {
    if (content?.onCancel) content.onCancel();
    closeDialog();
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <StatusBar style="light" animated />

      {/* O fundo escuro fecha ao toque, quando o conteúdo o permite. */}
      <Pressable
        onPress={content?.closeOnClickOutside ? dismiss : undefined}
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      >
        {content && (content.customContent ? (
          content.customContent
        ) : (
          /* O toque no cartão não fecha: só o fundo. */
          <Pressable
            onPress={() => {}}
            className="w-full gap-y-8 p-8 bg-secondary rounded-xl"
          >
            {content.icon && (
              <View className="items-center justify-center">
                <View className="w-10 h-10 p-3 rounded-full bg-primary">
                  {content.icon}
                </View>
              </View>
            )}
            <View className="gap-y-2">
              <CustomText size="large" color="primary" boldness="semiBold" classes="text-center">
                {content.title}
              </CustomText>
              {content.subtitle && (
                <CustomText size="small" color="gray_medium" boldness="semiBold" classes="text-center">
                  {content.subtitle}
                </CustomText>
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
          </Pressable>
        ))}
      </Pressable>
    </Modal>
  );
};

export default Dialog;
