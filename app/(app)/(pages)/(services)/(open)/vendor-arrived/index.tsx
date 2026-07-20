import { ThemedText } from '@/components/ThemedText'
import { Colors } from '@/constants/Colors'
import { AntDesign, Entypo, Feather, FontAwesome6, Ionicons, MaterialCommunityIcons, Octicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, FlatList, Image, ImageSourcePropType, Pressable, ScrollView, TouchableOpacity, View } from 'react-native'
import TouchOpacity from '@/components/TouchOpacity'
import BackHeader from '@/components/app/BackHeader'
import UrgentServiceSelector from '@/components/app/Services/service-card-selector'
import { Picker, PickerIOS } from '@react-native-picker/picker'
import { useApi } from '@/contexts/ApiContext'
import { API_ROUTES } from '@/constants/ApiRoutes'
import axios from 'axios'
import { jwtDecode } from 'jwt-decode'
import { useSession } from '@/contexts/SessionContext'
import useEcho from '@/hooks/echo'
import VendorCard from '@/components/app/Services/vendor-card-selector'
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity"
import { CustomText } from "@/components/CustomText"
import { useService } from "@/contexts/ServiceContext"
import ChatIcon from "@/assets/icons/chat"
import { useTranslation } from "react-i18next"

interface VendorsInterface {
  distance: number,
  id: number,
  name: string,
  // nif: string,
  rate: number,
  rating: number
}

const VendorArrived = () => {
  const { t } = useTranslation();
  const { api } = useApi();
  const { userData } = useSession();
  // // const [requestError, setRequestError] = useState<string | null>(null);

  const { openService } = useService();

  // const handleCloseService = () => {
  //   console.log(openService?.id, 'openService?.id in handleCloseService')
  //   api.post(API_ROUTES.POST_CLOSE_SERVICE(openService?.id as string))
  //     .then(({ data }) => {
  //       console.log({data})
  //       // router.navigate('/(app)/(services)');
  //     })
  //     .catch(error => {
  //       console.log(error.response?.data.message);
  //     });
  // }

  // const [vendors, setVendors] = useState<VendorsInterface[]>([]);
  // const [selectedVendor, setSelectedVendor] = useState<VendorsInterface | null>(null);
  // const [openServiceError, setOpenServiceError] = useState<string | null>(null);

  // // const params = useLocalSearchParams();
  // // const serviceId = params.serviceId;

  // const getVendorsOfService = async () => {
  //   if (serviceToRequest?.service?.id === null) {
  //     return;
  //   }
  //   if (openServiceError) {
  //     setOpenServiceError(null);
  //   }

  //   api.post(API_ROUTES.CUSTOMER_REQUEST_SERVICE, {
  //     service_type: serviceToRequest?.service?.id
  //   })
  //     .then(response => {
  //       console.log(response.data.data);

  //       const { vendors } = response.data.data;

  //       if (vendors.length === 0) {
  //         return setOpenServiceError("No professional was found for this service.");
  //       }

  //       setVendors(vendors);
  //       setSelectedVendor(vendors[0]);
  //     })
  //     .catch(error => {
  //       // console.log(error.response?.data.message);
  //       setOpenServiceError(error.response?.data.message);
  //     });
  // }

  // const openService = () => {
  //   if (selectedVendor === null) return;
  //   if (openServiceError) {
  //     setOpenServiceError(null);
  //   }
  //   setServiceToRequest(prev => ({
  //     ...prev,
  //     vendor: selectedVendor
  //   }))
  //   router.navigate(`/(app)/(modals)/(services)/(request)/checkout/${serviceToRequest?.service?.id}`);
  // //   api.post('customer/services/open', {
  // //     service_type: serviceId,
  // //     vendor_id: selectedVendor?.id,
  // // })
  // //   .then(({data}) => {
  // //     router.push(`/wait-accept/${data.data.service.id}`);
  // //   })
  // //   .catch(error => {
  // //     setOpenServiceError(error.response?.data.message);
  // //   });
  // }

  // useEffect(() => {
  //   getVendorsOfService();
  // }, []);

  return (
    <SafeAreaView className="flex-1 bg-primary">
      {/* <StatusBar backgroundColor={Colors.primary} animated /> */}

      <BackHeader
        backButtonColor="secondary"
        middleItem={() => (
          <View className="flex flex-row items-center">
            <CustomText color="secondary" boldness="bold" numberOfLines={1}>
              {userData?.address ? ([userData.address.street_name, userData.address.street_number].filter(Boolean).join(' ') || userData.address.name || userData.address.city || '') : t('general.no_address')}
            </CustomText>
            {/* <Entypo name="chevron-down" size={20} color={Colors.secondary} /> */}
          </View>
        )}
        // rigthItem={() => (
        //   <View className="flex items-end">
        //     <Feather name="help-circle" size={30} color={Colors.secondary} />
        //   </View>
        // )}
        otherClasses="p-5"
      />

      <View className="bg-secondary p-5 flex-1 rounded-t-3xl space-y-4">
        <View className="flex-1 justify-center items-center">
          <ScrollView className="w-full flex-grow-0">
            <View className="items-center">
              <Feather name="tool" size={90} color={Colors.primary} />
            </View>

            <CustomText color="support_secondary" boldness="medium" size="large" numberOfLines={3} classes="text-center mt-4">
              {t('services.service.vendor_arrived.title')}
            </CustomText>
            <CustomText color="support_primary" boldness="medium" size="medium" numberOfLines={3} classes="text-center mt-4">
              {t('services.service.vendor_arrived.subtitle')}
            </CustomText>
          </ScrollView>
        </View>
        
        <View>
          <CustomTouchableOpacity
            size="large"
            type="primary"
            textColor="secondary"
            textBoldness="semiBold"
            text={t('services.service.vendor_arrived.continue')}
            onPress={() => {
              router.dismissTo(`/(app)/(pages)/(services)/(open)/progress/${openService?.id}`);
            }}
          />
        </View>
      </View>

    </SafeAreaView>
  )
}

export default VendorArrived;
