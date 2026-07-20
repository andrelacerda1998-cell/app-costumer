import React from 'react'
import {TouchableOpacity, View} from "react-native"
import { CustomText } from "../CustomText"
import { Colors } from "@/constants/Colors"
import {useSession} from "@/contexts/SessionContext";
import {useRouter} from "expo-router";
import { useTranslation } from "react-i18next"
import AttentionIcon from "@/assets/icons/attention";

const BlockedByZone = () => {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <TouchableOpacity onPress={()=>router.push('/(app)/(modals)/blocked-by-zone')} className="flex-row justify-between items-center bg-[#6A40DA] p-3 rounded-xl">
      <View className="w-[10%]">
        <View className="w-7 h-7">
          <AttentionIcon color={Colors.support_secondary} />
        </View>
      </View>
      <View className="w-[90%]">
        <CustomText color="support_secondary">
          {t('general.blocked_by_zone')}
        </CustomText>
      </View>
    </TouchableOpacity>
  )
}

export default BlockedByZone
