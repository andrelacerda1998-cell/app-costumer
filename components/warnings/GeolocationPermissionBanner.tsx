import React, { useEffect, useState } from 'react'
import { TouchableOpacity, View, ActivityIndicator } from "react-native"
import { CustomText } from "../CustomText"
import LocationIcon from "@/assets/icons/location"
import { Colors } from "@/constants/Colors"
import { useTranslation } from "react-i18next"
import { useMixpanel } from "@/contexts/MixpanelContext"
import AsyncStorage from '@react-native-async-storage/async-storage'

interface GeolocationPermissionBannerProps {
  onRequestPermission: () => void;
  isLoading?: boolean;
  hasPermission?: boolean;
}

const GeolocationPermissionBanner = ({ onRequestPermission, isLoading = false, hasPermission = false }: GeolocationPermissionBannerProps) => {
  const { t } = useTranslation();
  const { track } = useMixpanel();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    loadDismissedState();
  }, []);

  useEffect(() => {
    if (hasPermission) {
      AsyncStorage.removeItem('geolocation_banner_dismissed').catch(console.error);
    }
  }, [hasPermission]);

  const loadDismissedState = async () => {
    try {
      const dismissed = await AsyncStorage.getItem('geolocation_banner_dismissed');
      if (dismissed === 'true') {
        setIsVisible(false);
      }
    } catch (error) {
      console.error('Error loading geolocation banner state:', error);
    }
  };

  useEffect(() => {
    if (!isVisible) return;
    track('geolocation_permission_prompted');
  }, [isVisible, track]);

  if (!isVisible) return null;

  return (
    /* Cartão claro com o quadrado preto dos outros banners da Home. O roxo
       cheio era a única cor estranha ao ecrã inteiro e lia-se como um anúncio;
       o pedido de localização é da app, não de terceiros, e deve parecê-lo. */
    <View
      className="flex-row items-center rounded-2xl bg-support_secondary p-3"
      style={{
        borderWidth: 1,
        borderColor: "rgba(250,187,91,0.55)",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      <View
        className="items-center justify-center"
        style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.secondary }}
      >
        <View className="w-5 h-5">
          <LocationIcon color={Colors.primary} />
        </View>
      </View>

      <View className="flex-1 ml-3 mr-2">
        <CustomText color="secondary" boldness="bold" size="small" numberOfLines={1}>
          {t('geolocation.permission_title')}
        </CustomText>
        <CustomText color="gray_strong" size="extraSmall" boldness="regular" numberOfLines={2} classes="mt-0.5">
          {t('geolocation.permission_description')}
        </CustomText>
      </View>

      {/* Só a ação que interessa. O "Agora não" escondia o banner para sempre
          (ficava guardado) e o cliente perdia, num toque, a forma de ver os
          técnicos da sua zona — sem localização a app não tem o que mostrar. */}
      <TouchableOpacity
        onPress={onRequestPermission}
        disabled={isLoading}
        activeOpacity={0.85}
        className="rounded-full items-center justify-center"
        style={{ backgroundColor: Colors.primary, paddingVertical: 10, paddingHorizontal: 18, minWidth: 88 }}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.secondary} size="small" />
        ) : (
          <CustomText color="secondary" boldness="bold" size="small" numberOfLines={1}>
            {t('geolocation.permission_button')}
          </CustomText>
        )}
      </TouchableOpacity>
    </View>
  )
}

export default GeolocationPermissionBanner
