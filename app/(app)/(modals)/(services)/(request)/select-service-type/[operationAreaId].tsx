import {ThemedText} from '@/components/ThemedText'
import {Colors} from '@/constants/Colors'
import {Entypo, Feather, FontAwesome6, Ionicons, MaterialCommunityIcons, Octicons} from '@expo/vector-icons'
import {router, useLocalSearchParams} from 'expo-router'
import {StatusBar} from 'expo-status-bar'
import React, {useEffect, useMemo, useRef, useState} from 'react'
import { Image as ExpoImage } from 'expo-image'
import { proxiedImage } from '@/utils/imageProxy'
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
import ScrollHint from "@/components/app/Services/ScrollHint";
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

    // Aquece a cache das miniaturas dos tipos de serviço assim que carregam.
    useEffect(() => {
        if (Array.isArray(availableServices)) {
            availableServices.forEach((sv: any) => {
                if (sv?.image && typeof sv.image === "string") {
                    ExpoImage.prefetch(proxiedImage(sv.image, 150)!, { cachePolicy: "memory-disk" }).catch(() => {});
                }
            });
        }
    }, [availableServices]);

    const [requestError, setRequestError] = useState<string | null>(null);
    const listRef = useRef<FlatList<any>>(null);
    const [contentHeight, setContentHeight] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);
    const [scrollY, setScrollY] = useState(0);
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
        // Sem isto, o erro de uma tentativa anterior ficava colado: mesmo quando a
        // repetição corria bem, o ecrã continuava a mostrar o estado de falha.
        setRequestError(null);
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

    // Tocar num tipo de serviço abre logo o detalhe (sem botão intermédio).
    const openServiceType = (item: any) => {
        if (!item) return;
        setCurrentlySelected(item);
        track('service_viewed', { service_name: item?.name, price_from: item?.starts_from });
        setServiceToRequest(prev => ({ service_type: item }));
        setSelectedServiceType(item.id, item);
        router.navigate({
            pathname: '/(app)/(modals)/(services)/(request)/select-service-type/info',
        });
    };

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
        // Ordena uma CÓPIA (não muta o array original) com fallback de string vazia.
        const ordered = [...list].sort((a: any, b: any) => {
        const aStr = isObj(a) && typeof a?.[criteria] === 'string' ? a[criteria].trim().toUpperCase() : '';
        const bStr = isObj(b) && typeof b?.[criteria] === 'string' ? b[criteria].trim().toUpperCase() : '';

           return aStr < bStr? -1 : aStr > bStr ? 1 : 0;
        });

          return ordered;

     }else{
        return   [];
     }
    }

    // Lista ordenada memoizada — evita re-ordenar (e mutar) a cada render.
    const sortedServices = useMemo(
        () => orderByAlphaOrder(availableServices, "name"),
        [availableServices]
    );




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
            if (!name) return "";

            return name.charAt(0).toUpperCase() + name.slice(1);
            } else return "";

        } else return label;
    }
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
                        // returnTo: 'back' — o chip da morada serve para a MUDAR,
                        // não para iniciar um pedido. Confirmar volta para aqui.
                        // Abre a lista de moradas guardadas, não o formulário em
                        // branco: quem toca no chip quer trocar de morada, e
                        // reescrever a de ontem à mão não é trocar.
                        onPress={() => router.navigate(
                            session
                                ? '/(app)/(modals)/(address)/list'
                                : '/(app)/(modals)/(services)/(request)/address/history'
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
               

                <View className="space-y-3 flex-1">
              

                <View className="space-y-3 flex-1">
                {loadingServices ? (
                    <View className="flex-1 flex-col overflow-hidden space-y-4">
                        {Array.from({length: 14}).map((_, index) => (
                            <View key={`loading-services-${index}`} className="w-full flex-row justify-between bg-support_primary rounded-lg p-3 h-14"></View>
                        ))}
                    </View>
                ) : (
                    <View className="flex-1">
                    <FlatList
                        ref={listRef}
                        data={sortedServices}
                        keyExtractor={(item) => item?.id?.toString()}
                        contentContainerStyle={{ gap: 6, paddingBottom: 24 }}
                        showsVerticalScrollIndicator={false}
                        // "Há mais para baixo": guarda-se se a lista é maior que
                        // o ecrã e a que distância do fim vai o scroll.
                        onContentSizeChange={(_w, h) => setContentHeight(h)}
                        onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
                        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
                        scrollEventThrottle={32}
                        renderItem={({item}) => (
                            <UrgentServiceSelector 
                                item={item}        
                                selected={selectedService === item?.id}
                                diffBackground={currentlySelected?.id === item?.id}
                                Icon={() => (
                                    <BoltIcon size={24} color="#000000" filled={true} />
                                )}
                                label={item?.name || ''}
                                onPress={() => openServiceType(item)}
                            />
                        )}
                        ListEmptyComponent={() => (
                            /* Falhar a carregar NÃO é o mesmo que não haver serviços na zona.
                               Antes mostravam-se as duas mensagens ao mesmo tempo e a app dizia
                               ao cliente que a zona dele não era servida quando o problema era
                               de rede — motivo de desinstalação (auditoria 2026-08-03). */
                            requestError ? (
                                <View className="items-center px-8">
                                    <Feather name="wifi-off" size={28} color={Colors.gray_medium} />
                                    <CustomText color="secondary" boldness="bold" size="medium" classes="text-center mt-3">
                                        {t('errors.load_failed_title')}
                                    </CustomText>
                                    <CustomText color="gray_medium" size="small" classes="text-center mt-1 mb-4">
                                        {t('errors.load_failed_subtitle')}
                                    </CustomText>
                                    <TouchableOpacity
                                        onPress={() => getServicesTypesBasedOnOperationArea(operationAreaId)}
                                        className="rounded-full px-5 py-2.5"
                                        style={{ backgroundColor: Colors.primary }}
                                    >
                                        <CustomText color="secondary" size="small" boldness="bold">
                                            {t('errors.try_again')}
                                        </CustomText>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <CustomText color="gray_strong" classes="text-center px-5">
                                    {t('services.select_service_type.no_services_found')}
                                </CustomText>
                            )
                        )}
                    />
                    {/* Só quando falta mesmo conteúdo por ver — e não nos
                        últimos pontos, onde já se percebe que acabou. */}
                    <ScrollHint
                        visible={contentHeight - viewportHeight - scrollY > 48}
                        onPress={() => listRef.current?.scrollToEnd({ animated: true })}
                    />
                    </View>
                )}
                  </View>
              </View>


                {/* O erro é agora apresentado dentro da lista vazia, com botão de
                    repetir — mostrá-lo também aqui duplicava a mensagem e, pior,
                    aparecia ao lado de "não há serviços nesta área" (contraditório). */}
                </View>               

        </SafeAreaView>
    )
}

export default ServiceSelection;
