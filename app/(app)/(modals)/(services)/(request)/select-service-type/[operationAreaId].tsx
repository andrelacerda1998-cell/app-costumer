import {ThemedText} from '@/components/ThemedText'
import {Colors} from '@/constants/Colors'
import {Entypo, Feather, FontAwesome6, Ionicons, MaterialCommunityIcons, Octicons} from '@expo/vector-icons'
import {router, useLocalSearchParams} from 'expo-router'
import {StatusBar} from 'expo-status-bar'
import React, {useEffect, useState} from 'react'
import {SafeAreaView} from "react-native-safe-area-context";
import {Alert, Dimensions, Platform, Pressable, ScrollView, Text, TouchableOpacity, View} from 'react-native'
import BackHeader from '@/components/app/BackHeader'
import UrgentServiceSelector from '@/components/app/Services/service-card-selector'
import {Picker} from '@react-native-picker/picker'
import {useApi} from '@/contexts/ApiContext'
import {API_ROUTES} from '@/constants/ApiRoutes'
import {useSession} from '@/contexts/SessionContext'
import {useGuestSession} from '@/contexts/GuestSessionContext'
import {useAddressLabel} from '@/hooks/useAddressLabel'
import {CustomText} from "@/components/CustomText"
import {useService} from "@/contexts/ServiceContext"
import {OperationAreaInterface, ServiceTypeInterface} from "@/types/services"
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity"
import {FlatList} from "react-native"
import TouchOpacity from "@/components/TouchOpacity";
import {useActionSheet} from "@expo/react-native-action-sheet";
import { useTranslation } from "react-i18next"
import BoltIcon from "@/assets/icons/bolt";
import { useMixpanel } from '@/contexts/MixpanelContext';

const ServiceSelection = () => {
    const { t } = useTranslation();
    const params = useLocalSearchParams();
    const { track } = useMixpanel();
    const operationAreaId = params.operationAreaId as string;
    const {operationAreas, setServiceToRequest, setSaveService} = useService();
    const {api} = useApi();
    const { showActionSheetWithOptions } = useActionSheet();
    const {session} = useSession();
    const { setSelectedServiceType } = useGuestSession();
    const addressLabel = useAddressLabel();
    const [selectedService, setSelectedService] = useState<number | null>(null);
    const [operationArea, setOperationArea] = useState<OperationAreaInterface['id'] | null>(Number(operationAreaId) || null);
    const [availableServices, setAvailableServices] = useState<ServiceTypeInterface[]>([]);
    const [requestError, setRequestError] = useState<string | null>(null);
    const [loadingServices, setLoadingServices] = useState<boolean>(true);
    const [currentlySelected, setCurrentlySelected] =
    useState<ServiceTypeInterface | undefined>();


    useEffect(()=> {
      // currentlySelected && console.log('currentlySelected', currentlySelected); 
      currentlySelected &&  setSaveService(currentlySelected);   
    }, [currentlySelected]);

    useEffect(() => {
        getServicesTypesBasedOnOperationArea(operationAreaId);
    }, [operationAreaId]);

  
    const handlePressIosPicker = () => {
        let options: string[] = [];

        if (operationAreas === null){
            return;
        }

        for (const service of operationAreas) {
            options.push(service.name);
        }
        options.push(t('general.ios_picker.cancel'))

        const cancelButtonIndex = options.indexOf(t('general.ios_picker.cancel'));

        showActionSheetWithOptions({
            options: options,
            cancelButtonIndex:cancelButtonIndex,
            title: t('general.ios_picker.choose_an_option')
        }, (selectedIndex) => {
            // @ts-ignore
            const label = options[selectedIndex];

            if (label === t('general.ios_picker.cancel')) {
                return;
            }

            let operationArea = operationAreas.filter(value => value.name === label);
            if (operationArea === null){
                return;
            }
            const value = operationArea[0].id;
            setOperationArea(value);
            getServicesTypesBasedOnOperationArea(value.toString());
            setSelectedService(null);
        });
    }

    const getServicesTypesBasedOnOperationArea = async (operationAreaId: string) => {
        setLoadingServices(true);
        try {
            const response = await api.get(API_ROUTES.GET_SERVICES_BY_OPERATION_AREA(operationAreaId));
            const {services} = response.data.data;
            setAvailableServices(services);
        } catch (error) {
            setRequestError(t('errors.occurred_an_error'));
        } finally {
            setLoadingServices(false);
        }
    }

    const goToInfo = () => {        

        if (!currentlySelected) {
            Alert.alert(
                t("services.select_service_type.warning.title"),
                t("services.select_service_type.warning.text")
            );
            return;
            }

            //check the vendor being added here, sometimes it is the wrong vendor
        setServiceToRequest(prev => ({
            // service_type: item,
            service_type: currentlySelected,
        }));
        setSelectedServiceType(currentlySelected.id, currentlySelected);
        router.navigate({
            pathname: '/(app)/(modals)/(services)/(request)/select-service-type/info',
        });
    }

    const formatLabel = (label: any) => {
        if (typeof label === "string") {
        if (label && label.length > 2) {
            let capitalized: string = "";

            capitalized = label[0].toUpperCase().concat(label.slice(1));

            return capitalized;
        } else return label;
        } else return "";
  };


   const isObj = (item: any) => {
    if (typeof item === "object" && !Array.isArray(item) && item !== null) {
      return true;
    } else return false;
   };


    const orderByAlphaOrder = (list: any, criteria: string) => {
     if(list && Array.isArray(list) && list.length > 0){
        let ordered = list.sort((a: any, b: any) => {
        let aStr = isObj(a) && a?.hasOwnProperty(criteria) && typeof a[criteria] === 'string'  && a[criteria]?.trim()?.length > 0 && a[criteria]?.toUpperCase();
        let bStr = isObj(b) && b?.hasOwnProperty(criteria) && typeof b[criteria] === 'string'  && b[criteria]?.trim()?.length > 0 && b[criteria]?.toUpperCase();

           return aStr < bStr? -1 : aStr > bStr ? 1 : 0;
        });           
          
          return ordered || [];

     }else{
        return   [];
     }
    }
   



    const getServiceLabel = (operationAreas: OperationAreaInterface[] | null, operationArea: number | null) => {

    let label: string = '';

        if (operationAreas && Array.isArray(operationAreas) && operationArea) {

            let res = operationAreas.filter((opArea: OperationAreaInterface, idx: number) => {
                return opArea?.id === operationArea;
            });

            if (
            res &&
            Array.isArray(res) &&
            res.length > 0 &&
            isObj(res[0]) &&
            res[0]?.hasOwnProperty('name') &&
            typeof res[0].name === "string"
            ) {
                
            const name = res[0].name.trim();
            if (!name) return "Service";

            return name.charAt(0).toUpperCase() + name.slice(1);
            } else return 'Service';

        } else return label;
    }
    console.log(availableServices, "availableServices")
    return (
        <SafeAreaView className="flex-1 bg-support_secondary">
            <BackHeader
                onBack={() => {
                    setServiceToRequest(null);
                    if (router.canGoBack()) {
                        return router.back();
                    }
                    return router.push("/(app)/(tabs)/home");
                }}
                backButtonColor="secondary"
                middleItem={() => (
                    <CustomTouchableOpacity
                        size="small"
                        type="transparent"
                        className="flex flex-row items-center"
                        onPress={() => router.navigate(
                            session
                                ? '/(app)/(modals)/(address)/update'
                                : '/(app)/(modals)/(services)/(request)/address/guest'
                        )}
                    >
                        <CustomText color="secondary" boldness="bold" numberOfLines={1}>
                            {addressLabel}
                        </CustomText>
                        <Entypo name="chevron-down" size={20} color={Colors.secondary}/>
                    </CustomTouchableOpacity>
                )}
                // rigthItem={() => (
                //     <View className="flex items-end">
                //         <Feather name="help-circle" size={30} color={Colors.secondary}/>
                //     </View>
                // )}
                otherClasses="p-5"
            />

            <View className="flex-1 bg-support_secondary p-5 rounded-t-3xl space-y-4">
                <View>
                    <CustomText color="secondary" boldness="semiBold" size="large" classes="text-center mb-3">                       
                        {getServiceLabel(operationAreas, operationArea)}
                    </CustomText>
                    <View className="pl-8 pr-8">                    
                    </View>
                </View>
               

                <View className="space-y-3">
              

                <View className="space-y-3">
                {loadingServices ? (
                    <View className="flex-1 flex-col overflow-hidden space-y-4">
                        {Array.from({length: 14}).map((_, index) => (
                            <View key={`loading-services-${index}`} className="w-full flex-row justify-between bg-[#111215] rounded-lg p-3 h-14"></View>
                        ))}
                    </View>
                ) : (
                    <FlatList
                        // data={availableServices}
                        data={availableServices && Array.isArray(availableServices) &&  orderByAlphaOrder(availableServices, "name") || []}
                        keyExtractor={(item) => item?.id?.toString()}
                        contentContainerStyle={{ gap: 6 }}
                        renderItem={({item}) => (
                            <UrgentServiceSelector 
                                item={item}        
                                selected={selectedService === item?.id}
                                diffBackground={currentlySelected?.id === item?.id}
                                Icon={() => (
                                    <BoltIcon size={24} color="#000000" filled={true} />
                                )}
                                label={item?.name || ''}
                                onPress={() => {
                                    setCurrentlySelected(item);
                                    track('service_viewed', {
                                        service_name: item?.name,
                                        price_from: item?.starts_from
                                    });
                                }}
                            />
                        )}
                        ListEmptyComponent={() => (
                            <CustomText color="gray_strong" classes="text-center px-5">
                                {t('services.select_service_type.no_services_found')}
                            </CustomText>
                        )}
                    />
                )}
                  </View>
              </View>


                <View>
                    {
                        requestError && (
                            <CustomText color="error" classes="text-center pb-2">
                                {requestError}
                            </CustomText>
                        )
                    }
                    </View>
                </View>               

                  <View className="mb-4 pl-5 pr-5">
                    <CustomTouchableOpacity
                        size="large"
                        type="primary"
                        textColor="secondary"
                        textBoldness="semiBold"
                        text={t("services.select_service_type.button_label")}
                        onPress={goToInfo}
                        disabled={currentlySelected === undefined}
                        
                    />
                 </View>

        </SafeAreaView>
    )
}

export default ServiceSelection;
