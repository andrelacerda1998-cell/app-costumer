import React, { useEffect } from 'react'
import {TouchableOpacity, View} from "react-native"
import { CustomText } from "../CustomText"
import AttentionIcon from "@/assets/icons/attention"
import { Colors } from "@/constants/Colors"
import {useSession} from "@/contexts/SessionContext";
import {useRouter} from "expo-router";
import { useTranslation } from "react-i18next"
import { useMixpanel } from "@/contexts/MixpanelContext"

const CompleteYourProfile = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { track } = useMixpanel();

  useEffect(() => {
    track('profile_completion_prompted');
  }, []);

  return (
    <TouchableOpacity
      onPress={()=> {
        router.push('/(app)/(modals)/complete-profile')
      }}
      className="flex-row items-center rounded-xl overflow-hidden"
      style={{
        backgroundColor: "#FDF3E1",
        borderWidth: 1,
        borderColor: Colors.primary,
        borderLeftWidth: 5,
        paddingVertical: 12,
        paddingHorizontal: 12,
      }}
    >
      <View className="w-[10%]">
        <View className="w-7 h-7">
          <AttentionIcon color={Colors.secondary} />
        </View>
      </View>
      <View className="w-[90%]">
        <CustomText color="secondary" boldness="semiBold">
          {t('complete_profile.notice')}
        </CustomText>
      </View>
    </TouchableOpacity>
  )
}

export default CompleteYourProfile
