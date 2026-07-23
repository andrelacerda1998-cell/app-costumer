import { useCart } from "@/contexts/CartContext";
import {Colors} from '@/constants/Colors'
import {Entypo, Feather, FontAwesome6, Ionicons, MaterialCommunityIcons, Octicons} from '@expo/vector-icons'
import {router, useLocalSearchParams} from 'expo-router'
import React,{useEffect,useState} from 'react'
import {SafeAreaView} from "react-native-safe-area-context";
import {Alert, Dimensions, Platform, Pressable, ScrollView, Text, TouchableOpacity, View} from 'react-native'
import BackHeader from '@/components/app/BackHeader'
import {useAddressLabel} from '@/hooks/useAddressLabel'
import {CustomText} from "@/components/CustomText"
import {useService} from "@/contexts/ServiceContext"
import {useSchedule} from "@/contexts/ScheduleContext"
import {useSession} from "@/contexts/SessionContext"
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity"
import { useTranslation } from "react-i18next"
import { useMixpanel } from "@/contexts/MixpanelContext"
import CircledCheckMarkFilled from "@/assets/icons/circled-check-mark-1";
import BoltSm from "@/assets/icons/boltsm";
import CircledX from "@/assets/icons/circled-x-mark-1";
import CalendarSm from "@/assets/icons/calendarsm";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get("window");



const ServiceTypeInformation = () => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { track } = useMixpanel();
    const { serviceToRequest, setServiceToRequest, setScheduledService, scheduledService } = useService();
    const { addItem, hasItem } = useCart();
    const { setDataToMakeSchedule } = useSchedule();
    const { userData } = useSession();
    const addressLabel = useAddressLabel();

    useEffect(() => {
        track("service_type_viewed", { service_name: serviceToRequest?.service_type?.name });
    }, []);

    const goToSelectVendors = () => {
        if (!serviceToRequest?.service_type?.id) return;
        if (!userData) {
            router.navigate('/(app)/(modals)/(services)/(request)/address/guest');
            return;
        }
        if (!userData.address) {
            router.navigate('/(app)/(modals)/(address)/update');
            return;
        }
        if (!userData.allowed_by_zone) {
            router.navigate('/(app)/(modals)/blocked-by-zone');
            return;
        }
        router.navigate(`/(app)/(modals)/(services)/(request)/select-vendor/${serviceToRequest.service_type.id}`);
    };

    const scheduleService = () => {
        if (!serviceToRequest?.service_type?.id) return;
        if (!userData) {
            setScheduledService(true);
            router.navigate('/(app)/(modals)/(services)/(request)/address/guest');
            return;
        }
        if (!userData.address) {
            router.navigate('/(app)/(modals)/(address)/update');
            return;
        }
        if (!userData.allowed_by_zone) {
            router.navigate('/(app)/(modals)/blocked-by-zone');
            return;
        }
        setScheduledService(true);
        router.navigate(`/(app)/(modals)/(services)/(schedule)/select-technician/${serviceToRequest.service_type.id}`);
    };

    const requestUrgentService = () => {
        if (!serviceToRequest?.service_type?.id) return;
        setScheduledService(false);
        setDataToMakeSchedule(null);
        goToSelectVendors();
    };

    return (
        <SafeAreaView className="flex-1 bg-primary">
            <BackHeader
                onBack={() => {
                    setServiceToRequest(null);
                    setScheduledService(false);
                    setDataToMakeSchedule(null);
                    if (router.canGoBack()) {
                        return router.back();
                    }
                    return router.push("/(app)/(tabs)/home");
                }}
                backButtonColor="secondary"
                middleItem={() => (
                    <View className="flex flex-row items-center">
                        <CustomText color="secondary" boldness="bold" numberOfLines={1}>
                            {addressLabel}
                        </CustomText>
                    </View>
                )}
                otherClasses="p-5"
            />

            <ScrollView
                className="bg-support_secondary rounded-t-3xl space-y-4 flex-1"
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingLeft: 20,
                    paddingRight: 20,
                    paddingTop: 20,
                    justifyContent: "space-between",
                    // minHeight: height, // test to check if the yellow background that appears below the white screen remains hidden
                    minHeight: "100%",
                    paddingBottom: 20 + (insets?.bottom || 0)
            
                }}
        >
            <View>
            <View>
                <CustomText
                color="secondary"
                boldness="semiBold"
                size="large"
                classes="text-center"
                >
                {serviceToRequest?.service_type?.name || ""}
                </CustomText>
            </View>

            <View className="my-8">
                {serviceToRequest?.service_type?.includes &&
                serviceToRequest?.service_type?.includes?.length > 0 && (
                    <View>
                    <View className="flex-row items-center space-x-2 mb-1">
                        <CustomText color="secondary" boldness="semiBold">
                        {t("services.select_service_type.includes")}
                        </CustomText>
                    </View>

                        {serviceToRequest?.service_type?.includes?.map((item, index) => (
                            <View style={{ flexDirection: "row" }} key={index}>
                                <View
                                    style={{ flexDirection: "column", marginRight: 5 }}
                                >
                                    <View
                                        key={`includes-${index}`}
                                        className="w-[17px] h-[17px]"
                                    >
                                        <CircledCheckMarkFilled
                                            color="#FFFFFF"
                                            background="lime"
                                        />
                                   </View>
                                </View>
                                <View style={{ flexDirection: "column" }}>
                                <CustomText
                                    color="secondary"
                                    boldness="regular"
                                    size="medium"
                                >
                                    {item.charAt(0).toUpperCase() + item.slice(1)}
                                </CustomText>
                                </View>
                            </View>
                            )
                        )}
                    </View>
                )}

                {serviceToRequest?.service_type?.includes && serviceToRequest?.service_type?.includes?.length > 0 && (
                    <View>
                        <View className="flex-row items-center space-x-2 mt-10 mb-1">
                            <CustomText color="secondary" boldness="semiBold">
                            {t("services.select_service_type.excludes")}
                            </CustomText>
                        </View>

                {serviceToRequest?.service_type?.excludes?.map((item, index) => (
                    <View key={`excludes-${index}`}style={{ flexDirection: "row" }}>
                        <View style={{ flexDirection: "column", marginRight: 5 }}>
                            <View className="w-[17px] h-[17px]">
                                <CircledX color="red" />
                            </View>
                            </View>
                        <View style={{ flexDirection: "column" }}>
                            <CustomText color="secondary" boldness="regular" size="medium">
                                {item.charAt(0).toUpperCase() + item.slice(1)}
                            </CustomText>
                        </View>
                    </View>
                        )
                    )}
                    </View>
                )}
                 </View>
            </View>


        </ScrollView>
        

         {/* Adicionar ao cesto: junta este serviço para reservar com outros */}
         {serviceToRequest?.service_type?.id ? (
           <View className="px-5 pt-2 bg-support_secondary">
             <CustomTouchableOpacity
               size="medium"
               type="support_primary_outline"
               onPress={() => {
                 const st = serviceToRequest.service_type;
                 if (st && addItem(st)) {
                   router.navigate('/(app)/(tabs)/cart');
                 } else {
                   router.navigate('/(app)/(tabs)/cart');
                 }
               }}
             >
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                 <Ionicons name="cart-outline" size={18} color={Colors.secondary} />
                 <CustomText color="secondary" boldness="semiBold" size="small">
                   {serviceToRequest.service_type?.id && hasItem(serviceToRequest.service_type.id)
                     ? t('cart.already_in_cart')
                     : t('cart.add_to_cart')}
                 </CustomText>
               </View>
             </CustomTouchableOpacity>
           </View>
         ) : null}

         <View className="flex-row space-x-4 p-5 bg-support_secondary">
            <View className="flex-1">
                <CustomTouchableOpacity
                    textSize="medium"
                    size="medium-spec"
                    type="primary"
                    textColor="secondary"
                    textBoldness="semiBold"
                    text={t("services.select_service_type.immediate")}
                    onPress={requestUrgentService}
                    smallTextStr={t("services.select_service_type.availableTech")}
                    textSizeSM="small"
                    textBoldnessSM={`light`}
                    textNumberOfLinesSM={1}
                    smallText={true}
                    btnIcon={<BoltSm size={22} color="#000000" filled={true} />}                   
                    classes="flex-col justify-center"  
            />
            </View>
            <View className="flex-1">
                <CustomTouchableOpacity
                    textSize="medium"
                    size="medium-spec"
                    type="secondary"
                    textColor="support_secondary"                    
                    textBoldness="semiBold"
                    text={t("services.select_service_type.scheduled")}
                    onPress={scheduleService}
                    smallTextStr={t("services.select_service_type.spare25")}
                    textSizeSM="small"
                    textBoldnessSM={`light`}
                    textNumberOfLinesSM={1}
                    smallText={true}
                    btnIcon={<CalendarSm size={17} color="#ccc" filled={true} />}  
                    diffColor={'success'}       
                    classes="flex-col justify-center"             
                />
            </View>
        </View>


    </SafeAreaView>

    )
}

export default ServiceTypeInformation;
