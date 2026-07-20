import React, {useCallback, useEffect, useRef, useState} from 'react'
import {Button, FlatList, Text, View, TouchableOpacity, Platform, Image} from 'react-native'
import {SafeAreaView} from "react-native-safe-area-context";
import {useService} from "@/contexts/ServiceContext";
import {AntDesign, Entypo, Feather, Ionicons} from "@expo/vector-icons";
import {Colors} from "@/constants/Colors";
import {router, useFocusEffect} from "expo-router";
import {OperationAreaInterface, ServiceTypeInterface} from "@/types/services";
import {useApi} from "@/contexts/ApiContext";
import {API_ROUTES, DOMAIN, PROTOCOL} from "@/constants/ApiRoutes";
import {useDialog} from "@/contexts/DialogContext";
import XIcon from "@/assets/icons/x";
import {CustomText} from "@/components/CustomText";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import BackHeader from "@/components/app/BackHeader";
import IDomParser from "advanced-html-parser";
import {useTranslation} from "react-i18next";
import {useSession} from "@/contexts/SessionContext";
import AutocompleteInput from "@/components/Autocomplete";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import {orderByAlphaOrder} from "@/utils";
import {styles} from './_styles';
import BoltSm from "@/assets/icons/boltsm";


const ServicesList = () => {
    const {t} = useTranslation();
    const {api} = useApi();
    const {operationAreas, setServiceToRequest, pendingSearchTerm, setPendingSearchTerm} = useService();
    const {openDialog} = useDialog();
    const {userData} = useSession();
    const [searchedServiceTypes, setSearchedServiceTypes] = useState<ServiceTypeInterface[] | null>(null);
    const [allServiceTypes, setAllServiceTypes] = useState<ServiceTypeInterface[] | null>(null);
    const [loadingSearchedServiceTypes, setLoadingSearchedServiceTypes] = useState(false);
    const [selectedOperationAreas, setSelectedOperationAreas] = useState<OperationAreaInterface['id'][]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [appliedSearchTerm, setAppliedSearchTerm] = useState<string>('');
    const [autocompleteKey, setAutocompleteKey] = useState<number>(0);
    const [autocompleteCloseSignal, setAutocompleteCloseSignal] = useState<number>(0);

    const handleResetSearch = () => {
        setSearchTerm('');
        setAppliedSearchTerm('');
        setAutocompleteKey(k => k + 1);
    };

    useEffect(() => {
        if (pendingSearchTerm) {
            setSearchTerm(pendingSearchTerm);
            setAppliedSearchTerm(pendingSearchTerm);
            setAutocompleteKey(k => k + 1);
            setPendingSearchTerm('');
        }
    }, [pendingSearchTerm]);

    useFocusEffect(
        useCallback(() => {
            return () => {
                setSearchTerm('');
                setAppliedSearchTerm('');
                setAutocompleteKey(k => k + 1);
            };
        }, [])
    );

    useEffect(() => {
        handleSelectOperationArea({id: -1, name: t('services.list.filter_all')});
    }, [])

    const desc = (text: string) => {
        if (text[0] !== "<") return text;
        try {
            const parsed = IDomParser.parse(text);
            return parsed.documentElement?.textContent;
        } catch (error) {
            return text;
        }
    };

    const handleOpenService = (serviceType: ServiceTypeInterface) => {
        if (userData && !userData.address) {
            router.navigate('/(app)/(modals)/(address)/update');
            return;
        }
        if (userData && !userData.allowed_by_zone) {
            router.navigate('/(app)/(modals)/blocked-by-zone');
            return;
        }

        const {id, operation_area} = serviceType || {};
        setServiceToRequest(prev => ({
            service_type: serviceType,
        }));

        router.navigate('/(app)/(modals)/(services)/(request)/select-service-type/info');
    };

    const handleSearch = (operationAreas: OperationAreaInterface['id'][]) => {
        setLoadingSearchedServiceTypes(true);
        api.post(API_ROUTES.POST_SEARCH_OPERATION_AREAS, {
            operation_areas: operationAreas,
        })
            .then((response) => {
                const {data} = response.data;
                console.log(data.services_types, operationAreas, "data.services_type");
                setSearchedServiceTypes(data.services_types);
                if (operationAreas.length === 0) {
                    setAllServiceTypes(data.services_types);
                }
            })
            .catch((error) => {
                if (error.response.status !== 401) {
                    openDialog({
                        icon: <XIcon color={Colors.secondary}/>,
                        title: t('errors.title'),
                        subtitle: t('errors.occurred_an_error'),
                        closeAfterMSeconds: 2000,
                        closeOnClickOutside: true,
                    });
                }
            })
            .finally(() => {
                setLoadingSearchedServiceTypes(false);
            })
    }

    const handleSelectOperationArea = (operationArea: OperationAreaInterface) => {
        const {id} = operationArea;

        if (id === -1) {
            setSelectedOperationAreas([-1]);
            if (!selectedOperationAreas.includes(-1)) {
                handleSearch([]);
            }
            return;
        }

        const newSelectedOperationAreas = [...selectedOperationAreas].filter(item => item !== -1);
        const isAlreadySelected = newSelectedOperationAreas.includes(id);

        if (isAlreadySelected) {
            const filtered = newSelectedOperationAreas.filter(item => item !== id);

            if (filtered.length === 0) {
                setSelectedOperationAreas([-1]);
                handleSearch([]);
            } else {
                setSelectedOperationAreas(filtered);
                handleSearch(filtered);
            }
        } else {
            const updated = [...newSelectedOperationAreas, id];
            setSelectedOperationAreas(updated);
            handleSearch(updated);
        }
    }

    const isObj = (item: any) => {
        if (typeof item === "object" && !Array.isArray(item) && item !== null) {
            return true;
        } else return false;
    };

    const retrieveSuitableList = (list: any) => {
        let validList: any;

        validList = Array.isArray(list) && list.filter((el: any) => isObj(el) && el.hasOwnProperty('name') && typeof el.name === 'string') || [];
        console.log(validList, "validList")
        // return Array.isArray(validList) && validList.length > 0 && validList.map((item: any) => isObj(item) && item.hasOwnProperty('name') && typeof item.name === 'string' && item?.name) || []

        //ALTERNATIVE, TO ALSO RETRIEVE THE ID, WHICH WILL BE NEEDED TO SEARCH FOR THE SERVICE:
        return Array.isArray(validList) && validList.length > 0 && validList.map((item: any) => isObj(item) && item.hasOwnProperty('name') && typeof item.name === 'string' && item) || []

    }


    //this is to handle situations where there is no image defined:
    const images: Record<string, any> = {
        unspecified: require("../../../../assets/pictures/operation.jpeg"),
    };

    const handleSrc = (image?: any) => {

        if (!image) return images.unspecified;

        if (
            typeof image === "string" &&
            (image.startsWith("http") ||
                image.startsWith("file://") ||
                image.startsWith("data:"))
        ) {
            return {uri: image};
        }

        if (typeof image === "string" && images[image.toLowerCase()]) {
            return images[image.toLowerCase()];
        }


        return images.unspecified;
    };

    console.log(operationAreas, "operationAreas")

    const displayedServiceTypes = appliedSearchTerm
        ? (orderByAlphaOrder(allServiceTypes || searchedServiceTypes, 'name') || []).filter(
            (item: any) =>
                item?.name &&
                typeof item.name === 'string' &&
                item.name.toLowerCase().includes(appliedSearchTerm.toLowerCase())
          )
        : orderByAlphaOrder(searchedServiceTypes, 'name') || [];

    return (
        <SafeAreaView className='h-full bg-primary'>
            <BackHeader
                backButtonColor="secondary"
                middleItem={() => (
                    <CustomText color="secondary" boldness="bold" numberOfLines={1}>
                        {t('services.list.header')}
                    </CustomText>
                )}
                otherClasses="p-5"
            />


            <View className="h-full bg-support_secondary pt-5 rounded-t-3xl">
                <View className="relative z-[100] flex-[0.10] mt-2 mb-3" pointerEvents="box-none">
                    <View style={styles.container}>
                        <View style={styles.inputContainer}>
                            <AutocompleteInput
                                key={autocompleteKey}
                                style2={{elevation: 999}}
                                flatClass="
                                        absolute
                                        top-[52px]
                                        left-0
                                        right-0
                                        bg-white
                                        z-[999]
                                        max-h-[250px]
                                        "
                                openSeviceFlatlist={(item: any) => {
                                    handleOpenService(item);
                                }}
                                onTextChange={setSearchTerm}
                                closeSignal={autocompleteCloseSignal}
                                initialValue={searchTerm}
                                style={styles.input}
                                className="
                                    h-[50px]
                                    border
                                    border-[#fbfbfaff]
                                    rounded-[30px]
                                    pl-5
                                    pr-[110px]
                                    text-sm
                                    font-['Poppins_600SemiBold']
                                    bg-[#fbfbfaff]
                                "
                                placeholder={t('services.search.placeholder')}
                                placeholderTextColor="#c1cdd3ff"
                                data={(() => {
                                    const source = allServiceTypes || searchedServiceTypes;
                                    return source && Array.isArray(source) && source.length === 0 ? [] : retrieveSuitableList(source);
                                })()}
                            />
                            {(searchTerm.length > 0 || appliedSearchTerm.length > 0) && (
                                <TouchableOpacity
                                    style={styles.clearButton}
                                    onPress={handleResetSearch}
                                >
                                    <Feather name="x" size={20} color={Colors.gray_medium}/>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={styles.roundButton}
                                onPress={() => {
                                    setAppliedSearchTerm(searchTerm.trim());
                                    setAutocompleteCloseSignal(s => s + 1);
                                }}
                            >
                                <FontAwesome6 name="magnifying-glass" size={20} color="black"/>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {!appliedSearchTerm && <FlatList
                    data={[
                        {id: -1, name: t('services.list.filter_all')},
                        // ...(operationAreas || [])
                        ...(orderByAlphaOrder(operationAreas, 'name') || [])
                    ]}
                    keyExtractor={(item) => item.id.toString()}
                    // numColumns={2}
                    style={{
                        flex: 0,
                        flexGrow: 0,
                        zIndex: 1,
                    }}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    // columnWrapperStyle={{ justifyContent: 'space-between' }}
                    contentContainerStyle={{
                        // display: 'flex',
                        // flexDirection: 'row',
                        gap: 10, //reduces the gap between the filters
                        paddingHorizontal: 20,
                        paddingVertical: 10
                    }}
                    renderItem={({item}) => {
                        const isSelected = selectedOperationAreas?.includes(item.id as number);

                        return (
                            (
                                // <View className="h-40">
                                //   <CustomText
                                //     boldness="medium"
                                //     color="support_secondary"
                                //     numberOfLines={1}
                                //   >
                                //     All
                                //   </CustomText>

                                // </View>

                                <CustomTouchableOpacity
                                    // onPress={() => handleOpenService(item)}
                                    type="secondary_outline"
                                    size="large"
                                    className={`rounded-md px-3 py-1 border border-secondary flex-row space-x-2 items-center ${
                                        isSelected ? 'bg-secondary' : 'bg-support_secondary'
                                    }`}
                                    onPress={() => handleSelectOperationArea(item)}
                                    disabled={loadingSearchedServiceTypes}
                                >
                                    {item.id !== -1 && (
                                        // <Feather
                                        //     size={24}
                                        //     name="tool"
                                        //     color={isSelected ? Colors.secondary : Colors.support_secondary}
                                        // />
                                        <BoltSm size={12} color="#FABB5B" filled={true}/>
                                    )}
                                    <CustomText
                                        boldness="semiBold"
                                        color={isSelected ? 'support_secondary' : 'secondary'}
                                        numberOfLines={1}
                                        size="extraSmall"
                                    >
                                        {item.name}
                                    </CustomText>
                                </CustomTouchableOpacity>


                            )
                        )
                    }}
                />}

                <View className="flex-1 h-[80%] p-4">
                    {loadingSearchedServiceTypes
                        ? (
                            <View className="flex-1">
                                <View className="space-y-6">
                                    {Array.from({length: 8}).map((_, index) => (
                                        <View key={`skeleton-item-${index}`}
                                              className="flex-row items-center justify-between">
                                            <View className="rounded-full overflow-hidden w-12 h-12 mr-4">
                                                <View className="w-full h-full bg-gray_light"></View>
                                            </View>
                                            <View className="flex-1 space-y-2">
                                                <View className="rounded-2xl overflow-hidden w-[60%]">
                                                    <View className="w-full h-5 bg-gray_light"></View>
                                                </View>

                                                <View className="space-y-1">
                                                    <View className="rounded-2xl overflow-hidden">
                                                        <View className="w-full h-5 bg-gray_light"></View>
                                                    </View>
                                                    <View className="rounded-2xl overflow-hidden">
                                                        <View className="w-full h-5 bg-gray_light"></View>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ) : (
                            <FlatList
                                // data={searchedServiceTypes}
                                data={
                                    appliedSearchTerm
                                        ? (orderByAlphaOrder(allServiceTypes || searchedServiceTypes, 'name') || []).filter(
                                            (item: any) =>
                                                item?.name &&
                                                typeof item.name === 'string' &&
                                                item.name.toLowerCase().includes(appliedSearchTerm.toLowerCase())
                                          )
                                        : orderByAlphaOrder(searchedServiceTypes, 'name')
                                }
                                keyExtractor={(item) => item.id.toString()}
                                className={`h-full ${Platform.OS === 'android' ? 'mb-[60px]' : 'mb-[10px]'}`}
                                // numColumns={2}
                                // showsVerticalScrollIndicator={false}
                                // columnWrapperStyle={{ justifyContent: 'space-between' }}
                                ItemSeparatorComponent={() => <View className="h-[1px] w-full bg-[#DDDDDD] my-2"/>}
                                renderItem={({item}) => (
                                    <CustomTouchableOpacity
                                        onPress={() => item && handleOpenService(item)}
                                        type="secondary_outline"
                                        size="large"
                                        className="rounded-md px-4 py-2 bg-support_secondary flex-row space-x-4 items-center"
                                        disabled={loadingSearchedServiceTypes}
                                    >

                                        <Image
                                            source={handleSrc(item?.image)}
                                            className="w-[50px] h-[50px] rounded-[6px]"
                                            style={{
                                                resizeMode: "cover",
                                            }}
                                        />
                                        <View className="flex-1">
                                            <CustomText
                                                boldness="bold"
                                                color="secondary"
                                                numberOfLines={1}
                                                size="small"
                                            >
                                                {item.name}
                                            </CustomText>
                                            {item.starts_from && (
                                                <View className="flex-row">
                                                    <CustomText
                                                        boldness="medium"
                                                        color="gray_medium"
                                                        numberOfLines={1}
                                                        size="extraSmall"
                                                    >
                                                        {t('services.service.starting_from_label')}
                                                    </CustomText>
                                                    <CustomText
                                                        boldness="bold"
                                                        color="primary"
                                                        numberOfLines={1}
                                                        size="extraSmall"
                                                    >
                                                        {item.starts_from}€
                                                    </CustomText>
                                                </View>
                                            )}
                                        </View>
                                    </CustomTouchableOpacity>
                                )}
                                ListFooterComponent={
                                    appliedSearchTerm && displayedServiceTypes.length > 0 ? (
                                        <View
                                            className="mt-8 p-4 rounded-2xl flex-row items-start w-full"
                                            style={{backgroundColor: Colors.support_primary}}
                                        >
                                            <View
                                                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                                                style={{backgroundColor: Colors.primary}}
                                            >
                                                <Ionicons name="construct-outline" size={20} color={Colors.secondary}/>
                                            </View>
                                            <View className="flex-1">
                                                <CustomText
                                                    boldness="bold"
                                                    color="secondary"
                                                    size="small"
                                                    className="mb-1"
                                                >
                                                    {t('services.results_footer_card_title')}
                                                </CustomText>
                                                <CustomText
                                                    boldness="medium"
                                                    color="gray_medium"
                                                    size="extraSmall"
                                                >
                                                    {t('services.results_footer_card_subtitle')}
                                                </CustomText>
                                            </View>
                                        </View>
                                    ) : null
                                }
                                ListEmptyComponent={() => (
                                    appliedSearchTerm ? (
                                        <View className="items-center justify-center mt-10 px-6">
                                            <View
                                                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                                                style={{backgroundColor: Colors.support_primary}}
                                            >
                                                <FontAwesome6 name="magnifying-glass" size={32} color={Colors.gray_medium}/>
                                            </View>
                                            <CustomText
                                                boldness="bold"
                                                color="secondary"
                                                size="medium"
                                                className="text-center mb-2"
                                            >
                                                {t('services.no_services_found')}
                                            </CustomText>
                                            <CustomText
                                                boldness="medium"
                                                color="gray_medium"
                                                size="small"
                                                className="text-center mb-6"
                                            >
                                                {t('services.no_services_found_with_term_subtitle', {term: appliedSearchTerm})}
                                            </CustomText>
                                            <TouchableOpacity
                                                onPress={handleResetSearch}
                                                className="flex-row items-center px-6 py-3 rounded-full"
                                                style={{backgroundColor: Colors.primary}}
                                            >
                                                <Feather name="x" size={16} color={Colors.secondary}/>
                                                <CustomText
                                                    boldness="semiBold"
                                                    color="secondary"
                                                    size="small"
                                                    className="ml-2"
                                                >
                                                    {t('services.clear_search')}
                                                </CustomText>
                                            </TouchableOpacity>

                                            <View
                                                className="mt-10 p-4 rounded-2xl flex-row items-start w-full"
                                                style={{backgroundColor: Colors.support_primary}}
                                            >
                                                <View
                                                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                                                    style={{backgroundColor: Colors.primary}}
                                                >
                                                    <Ionicons name="construct-outline" size={20} color={Colors.secondary}/>
                                                </View>
                                                <View className="flex-1">
                                                    <CustomText
                                                        boldness="bold"
                                                        color="secondary"
                                                        size="small"
                                                        className="mb-1"
                                                    >
                                                        {t('services.unavailable_card_title')}
                                                    </CustomText>
                                                    <CustomText
                                                        boldness="medium"
                                                        color="gray_medium"
                                                        size="extraSmall"
                                                    >
                                                        {t('services.unavailable_card_subtitle', {term: appliedSearchTerm})}
                                                    </CustomText>
                                                </View>
                                            </View>
                                        </View>
                                    ) : (
                                        <View>
                                            <CustomText
                                                boldness="medium"
                                                color="gray_medium"
                                                numberOfLines={1}
                                                className="text-center"
                                            >
                                                {t('services.no_services_found')}
                                            </CustomText>
                                        </View>
                                    )
                                )}
                            />
                        )
                    }
                </View>
            </View>
        </SafeAreaView>
    )
}

export default ServicesList
