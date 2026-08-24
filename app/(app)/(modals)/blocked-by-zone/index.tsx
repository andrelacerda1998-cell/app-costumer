import { Colors } from '@/constants/Colors'
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import { TouchableOpacity, View } from 'react-native'
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import BackHeader from '@/components/app/BackHeader'
import { useSession } from '@/contexts/SessionContext'
import { useGuestSession } from '@/contexts/GuestSessionContext'
import { useTranslation } from "react-i18next"
import { CustomText } from "@/components/CustomText"
import CustomTextInput from "@/components/CustomTextInput"
import { useMixpanel } from "@/contexts/MixpanelContext"
import { useDialog } from '@/contexts/DialogContext'
import CheckMark from '@/assets/icons/check-mark'

const BlockedByZone = () => {
  const { t } = useTranslation();
  const { track } = useMixpanel();
  const { userData } = useSession();
  const { guestSession } = useGuestSession();
  const { openDialog } = useDialog();

  const stripPrefix = (phone: string | null | undefined) =>
    (phone ?? '').replace(/^\+?351/, '').replace(/\s/g, '');

  const [city, setCity] = useState<string>(
    guestSession?.guest_address?.city || userData?.address?.city || ''
  );
  const [phone, setPhone] = useState<string>(
    stripPrefix(guestSession?.guest_phone || userData?.phone_number)
  );

  useEffect(() => {
    track("blocked_by_zone_viewed");
  }, []);

  const onClose = () => {
    if (router.canGoBack()) {
      return router.back();
    }
    return router.push("/(app)/(tabs)/home");
  };

  const phoneDigits = phone.replace(/\D/g, '');
  const canSubmit = city.trim().length > 1 && phoneDigits.length === 9;

  const onNotifyMe = () => {
    // Sem endpoint próprio de lista de espera no backend: o registo segue
    // pelo Mixpanel, que o negócio já consulta para leads/funil.
    track("zone_waitlist_submitted", {
      city: city.trim(),
      phone: `+351${phoneDigits}`,
      is_guest: !userData,
    });
    openDialog({
      icon: <CheckMark color={Colors.secondary} />,
      title: t('session.blocked_by_zone.success_title'),
      subtitle: t('session.blocked_by_zone.success_subtitle', { city: city.trim() }),
      closeAfterMSeconds: 2500,
      closeOnClickOutside: true,
    });
    onClose();
  };

  return (
    <SafeAreaView className="flex-1 bg-support_secondary p-5">

      <BackHeader
        backButtonColor="secondary"
        middleItem={() => (
          <CustomText size="medium" color="secondary" boldness="bold" numberOfLines={1}>
            {t('session.blocked_by_zone.header')}
          </CustomText>
        )}
        onBack={onClose}
      />

      <KeyboardAwareScrollView bottomOffset={40} showsVerticalScrollIndicator={false}>
        <View
          className="self-center items-center justify-center rounded-full mt-8"
          style={{ width: 168, height: 168, backgroundColor: "rgba(250,187,91,0.12)" }}
        >
          <MaterialCommunityIcons name="map-marker-remove-variant" size={80} color={Colors.primary} />
        </View>

        <CustomText size="title" color="secondary" boldness="bold" classes="text-center mt-8">
          {t('session.blocked_by_zone.title')}
        </CustomText>
        <CustomText size="medium" color="gray_medium" boldness="regular" classes="text-center mt-3">
          {t('session.blocked_by_zone.subtitle')}
        </CustomText>

        <View className="mt-8">
          <CustomText color="secondary" size="medium" boldness="bold">
            {t('session.blocked_by_zone.city_label')}
          </CustomText>
          <View className="mt-2">
            <CustomTextInput
              size="large"
              value={city}
              onChangeText={setCity}
              placeholder={t('session.blocked_by_zone.city_placeholder')}
            />
          </View>
        </View>

        <View className="mt-5">
          <CustomText color="secondary" size="medium" boldness="bold">
            {t('session.blocked_by_zone.phone_label')}
          </CustomText>
          <View className="mt-2 flex-row items-center" style={{ gap: 10 }}>
            <View
              className="items-center justify-center rounded-xl"
              style={{ borderWidth: 1, borderColor: "#E4E3E3", paddingVertical: 16, paddingHorizontal: 16 }}
            >
              <CustomText color="secondary" size="medium" boldness="semiBold">
                +351
              </CustomText>
            </View>
            <View className="flex-1">
              <CustomTextInput
                size="large"
                value={phone}
                onChangeText={(v: string) => setPhone(v.replace(/[^\d\s]/g, ''))}
                placeholder={t('session.blocked_by_zone.phone_placeholder')}
                keyboardType="phone-pad"
                maxLength={11}
              />
            </View>
          </View>
        </View>

        <View className="mt-4 flex-row items-center" style={{ gap: 12 }}>
          <View
            className="items-center justify-center rounded-full"
            style={{ width: 44, height: 44, backgroundColor: "rgba(250,187,91,0.15)" }}
          >
            <Feather name="message-square" size={18} color={Colors.secondary} />
          </View>
          <View className="flex-1">
            <CustomText color="gray_medium" size="small" boldness="regular">
              {t('session.blocked_by_zone.sms_note')}
            </CustomText>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onNotifyMe}
          disabled={!canSubmit}
          className="mt-6"
          style={{
            backgroundColor: canSubmit ? Colors.primary : "rgba(250,187,91,0.35)",
            borderRadius: 999,
            paddingVertical: 18,
            paddingHorizontal: 24,
            alignItems: "center",
            justifyContent: "center",
            ...(canSubmit
              ? {
                  shadowColor: Colors.primary,
                  shadowOpacity: 0.55,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 8,
                }
              : {}),
          }}
        >
          <CustomText
            color="secondary"
            size="large"
            boldness="bold"
            numberOfLines={1}
            style={{ opacity: canSubmit ? 1 : 0.5 }}
          >
            {t('session.blocked_by_zone.notify_me')}
          </CustomText>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  )
}

export default BlockedByZone;
