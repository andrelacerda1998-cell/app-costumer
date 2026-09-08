import React from 'react'
import {TouchableOpacity, View} from "react-native"
import { CustomText } from "../CustomText"
import { Colors } from "@/constants/Colors"
import {useSession} from "@/contexts/SessionContext";
import {useRouter} from "expo-router";
import { useTranslation } from "react-i18next"
import AttentionIcon from "@/assets/icons/attention";

const PhoneNeedsToVerify = () => {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <TouchableOpacity onPress={()=>router.push('/(app)/(modals)/sms')} className="flex-row items-center rounded-xl overflow-hidden"
      style={{
        backgroundColor: "#FDF3E1",
        borderWidth: 1,
        borderColor: Colors.primary,
        borderLeftWidth: 5,
        paddingVertical: 12,
        paddingHorizontal: 12,
      }}>
      <View className="w-[10%]">
        <View className="w-7 h-7">
          <AttentionIcon color={Colors.secondary} />
        </View>
      </View>
      <View className="w-[90%]">
        <CustomText color="secondary" boldness="semiBold">
          {t('general.phone_verification_required')}
        </CustomText>
      </View>
    </TouchableOpacity>
  )
}

export default PhoneNeedsToVerify
