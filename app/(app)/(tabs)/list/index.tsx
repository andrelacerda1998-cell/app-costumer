import React, { useCallback, useEffect, useRef, useState } from 'react'
import { FlatList, Platform, TouchableOpacity, View } from 'react-native'
import { Image as ExpoImage } from 'expo-image'
import { proxiedImage } from '@/utils/imageProxy'
const NEUTRAL_PLACEHOLDER = require('@/assets/pictures/placeholder.png')
import { SafeAreaView } from "react-native-safe-area-context";
import { useService } from "@/contexts/ServiceContext";
import { Feather, Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { router, useFocusEffect } from "expo-router";
import { OperationAreaInterface, ServiceTypeInterface } from "@/types/services";
import { useApi } from "@/contexts/ApiContext";
import { API_ROUTES } from "@/constants/ApiRoutes";
import { useDialog } from "@/contexts/DialogContext";
import XIcon from "@/assets/icons/x";
import { CustomText } from "@/components/CustomText";
import CustomTouchableOpacity from "@/components/CustomTouchableOpacity";
import { useTranslation } from "react-i18next";
import { useSession } from "@/contexts/SessionContext";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { orderByAlphaOrder } from "@/utils";
import { renderMoney } from "@/utils/money";
import CategoryCard from "@/components/app/Services/CategoryCard";

/**
 * Serviços: entra-se pelas categorias, não por uma lista de 143 nomes.
 *
 * A lista alfabética completa punha "Abertura de Portão de Garagem" antes de
 * tudo o resto e obrigava a percorrer o catálogo inteiro para chegar a uma
 * limpeza. Agora o ecrã mostra as categorias do backoffice em cartões, e a
 * lista de serviços só aparece quando há uma pesquisa — que é quando o cliente
 * já disse o que quer.
 */

const ServicesList = () => {
    const { t } = useTranslation();
    const { api } = useApi();
    const { operationAreas, setServiceToRequest, pendingSearchTerm, setPendingSearchTerm } = useService();
    const { openDialog } = useDialog();
    const { userData } = useSession();
    const [searchedServiceTypes, setSearchedServiceTypes] = useState<ServiceTypeInterface[] | null>(null);
    const [allServiceTypes, setAllServiceTypes] = useState<ServiceTypeInterface[] | null>(null);
    const [loadingSearchedServiceTypes, setLoadingSearchedServiceTypes] = useState(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [appliedSearchTerm, setAppliedSearchTerm] = useState<string>('');

    const handleResetSearch = () => {
        setSearchTerm('');
        setAppliedSearchTerm('');
    };

    /**
     * A pesquisa da home chega por aqui. Fica marcada no ref porque o termo
     * pendente é consumido (e apagado) antes de o ecrã ganhar foco — sem esta
     * marca, a limpeza da entrada apagava-o e o cliente via as categorias em
     * vez do que pesquisou.
     */
    const cameFromSearch = useRef(false);

    useEffect(() => {
        if (pendingSearchTerm) {
            cameFromSearch.current = true;
            setSearchTerm(pendingSearchTerm);
            setAppliedSearchTerm(pendingSearchTerm);
            setPendingSearchTerm('');
        }
    }, [pendingSearchTerm]);

    // Limpar À ENTRADA e não só à saída: quem volta ao separador — ou reabre a
    // app nele — deve encontrar as categorias, não a pesquisa da visita
    // anterior.
    useFocusEffect(
        useCallback(() => {
            const clear = () => {
                setSearchTerm('');
                setAppliedSearchTerm('');
            };
            if (!cameFromSearch.current) clear();
            cameFromSearch.current = false;
            return clear;
        }, [])
    );

    useEffect(() => {
        handleSearch();
    }, []);

    const handleOpenService = (serviceType: ServiceTypeInterface) => {
        if (userData && !userData.address) {
            router.navigate('/(app)/(modals)/(address)/update');
            return;
        }
        if (userData && !userData.allowed_by_zone) {
            router.navigate('/(app)/(modals)/blocked-by-zone');
            return;
        }

        setServiceToRequest(prev => ({
            service_type: serviceType,
        }));

        router.navigate('/(app)/(modals)/(services)/(request)/select-service-type/info');
    };

    /** A categoria abre o mesmo ecrã que os atalhos da home. */
    const handleOpenCategory = (operationArea: OperationAreaInterface) => {
        router.navigate(`/(app)/(modals)/(services)/(request)/select-service-type/${operationArea.id}`);
    };

    /** Carrega o catálogo completo — serve a pesquisa e o autocomplete. */
    const handleSearch = () => {
        setLoadingSearchedServiceTypes(true);
        api.post(API_ROUTES.POST_SEARCH_OPERATION_AREAS, {
            operation_areas: [],
        })
            .then((response) => {
                const { data } = response.data;
                setSearchedServiceTypes(data.services_types);
                setAllServiceTypes(data.services_types);
            })
            .catch((error) => {
                if (error.response?.status !== 401) {
                    openDialog({
                        icon: <XIcon color={Colors.secondary} />,
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

    //this is to handle situations where there is no image defined:
    const handleSrc = (image?: any) => {
        if (!image) return NEUTRAL_PLACEHOLDER;
        if (
            typeof image === "string" &&
            (image.startsWith("http") ||
                image.startsWith("file://") ||
                image.startsWith("data:"))
        ) {
            return { uri: proxiedImage(image, 150) };
        }
        return NEUTRAL_PLACEHOLDER;
    };

    const categories: OperationAreaInterface[] = Array.isArray(operationAreas)
        ? orderByAlphaOrder(operationAreas, 'name') || []
        : [];

    const displayedServiceTypes = appliedSearchTerm
        ? (orderByAlphaOrder(allServiceTypes || searchedServiceTypes, 'name') || []).filter(
            (item: any) =>
                item?.name &&
                typeof item.name === 'string' &&
                item.name.toLowerCase().includes(appliedSearchTerm.toLowerCase())
        )
        : [];

    const searching = appliedSearchTerm.length > 0;

    const CategoriesGrid = (
        <View className="px-5">
            <CustomText color="secondary" size="medium" boldness="bold" classes="mb-3">
                {t('services.list.categories_title')}
            </CustomText>

            {categories.length === 0 ? (
                <View className="flex-row flex-wrap justify-between">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <View
                            key={`category-skeleton-${index}`}
                            className="rounded-2xl mb-3 bg-gray_light"
                            style={{ width: '48.5%', height: 150 }}
                        />
                    ))}
                </View>
            ) : (
                <View className="flex-row flex-wrap justify-between">
                    {categories.map((area) => (
                        <CategoryCard
                            key={area.id}
                            area={area}
                            onPress={() => handleOpenCategory(area)}
                        />
                    ))}
                </View>
            )}
        </View>
    );

    const ResultRow = ({ item }: { item: ServiceTypeInterface }) => (
        <CustomTouchableOpacity
            onPress={() => item && handleOpenService(item)}
            type="secondary_outline"
            size="large"
            className="rounded-md px-4 py-2 bg-support_secondary flex-row space-x-4 items-center"
        >
            {item?.image ? (
                <ExpoImage
                    source={handleSrc(item.image)}
                    style={{ width: 50, height: 50, borderRadius: 6 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    placeholder={NEUTRAL_PLACEHOLDER}
                    transition={150}
                    recyclingKey={typeof item.image === "string" ? item.image : item?.name}
                />
            ) : (
                <View
                    style={{
                        width: 50,
                        height: 50,
                        borderRadius: 6,
                        backgroundColor: "rgba(250,187,91,0.22)",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Feather name="tool" size={22} color={Colors.secondary} />
                </View>
            )}
            <View className="flex-1">
                <CustomText boldness="bold" color="secondary" numberOfLines={2} size="small">
                    {item.name}
                </CustomText>
                {!!item.starts_from && (
                    <View className="flex-row items-baseline">
                        <CustomText boldness="medium" color="gray_medium" numberOfLines={1} size="extraSmall">
                            {t('services.service.starting_from_label')}
                        </CustomText>
                        <CustomText boldness="bold" color="secondary" numberOfLines={1} size="extraSmall" classes="ml-1">
                            {renderMoney((item.starts_from as number) * 100)}
                        </CustomText>
                    </View>
                )}
            </View>
            <Feather name="chevron-right" size={18} color={Colors.gray_medium} />
        </CustomTouchableOpacity>
    );

    return (
        <SafeAreaView edges={['top']} className='h-full bg-primary'>
            {/* Cabeçalho: o título grande e a pergunta fazem o mesmo trabalho que
                a morada faz na home — dizer onde se está antes de pedir algo. */}
            {/* Cor sólida da marca: o gradiente diagonal deixava o topo com
                duas tonalidades e não casava com a barra de estado. */}
            <View
                style={{ backgroundColor: Colors.primary, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
            >
                <CustomText color="secondary" size="title" boldness="bold">
                    {t('services.list.title')}
                </CustomText>
                <CustomText color="secondary" size="small" boldness="regular" classes="mt-1 opacity-70">
                    {t('services.list.subtitle')}
                </CustomText>
            </View>

            <View className="flex-1 bg-support_secondary rounded-t-3xl pt-5 -mt-4">
                {searching ? (
                    <View className={`flex-1 px-4 ${Platform.OS === 'android' ? 'mb-[60px]' : 'mb-[10px]'}`}>
                        {/* A pesquisa da home traz para aqui: dizer por que termo
                            se está a filtrar, e dar a saída de volta às categorias. */}
                        <View className="flex-row items-center justify-between mb-3 px-1">
                            <CustomText color="gray_medium" size="small" boldness="regular" classes="flex-1 mr-3" numberOfLines={1}>
                                {t('services.list.results_for', { term: appliedSearchTerm })}
                            </CustomText>
                            <TouchableOpacity
                                onPress={handleResetSearch}
                                accessibilityRole="button"
                                className="flex-row items-center px-3 py-1.5 rounded-full"
                                style={{ backgroundColor: 'rgba(250,187,91,0.22)' }}
                            >
                                <Feather name="x" size={14} color="#B26A12" />
                                <CustomText color="secondary" size="extraSmall" boldness="semiBold" classes="ml-1">
                                    {t('services.clear_search')}
                                </CustomText>
                            </TouchableOpacity>
                        </View>
                        {loadingSearchedServiceTypes ? (
                            <View className="space-y-6">
                                {Array.from({ length: 8 }).map((_, index) => (
                                    <View key={`skeleton-item-${index}`} className="flex-row items-center">
                                        <View className="rounded-full overflow-hidden w-12 h-12 mr-4">
                                            <View className="w-full h-full bg-gray_light" />
                                        </View>
                                        <View className="flex-1 rounded-2xl overflow-hidden">
                                            <View className="w-full h-5 bg-gray_light" />
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <FlatList
                                data={displayedServiceTypes}
                                keyExtractor={(item) => item.id.toString()}
                                showsVerticalScrollIndicator={false}
                                ItemSeparatorComponent={() => <View className="h-[1px] w-full bg-[#EEEEEE] my-2" />}
                                renderItem={({ item }) => <ResultRow item={item} />}
                                ListFooterComponent={
                                    displayedServiceTypes.length > 0 ? (
                                        <View
                                            className="mt-8 p-4 rounded-2xl flex-row items-start w-full"
                                            style={{ backgroundColor: Colors.support_primary }}
                                        >
                                            <View
                                                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                                                style={{ backgroundColor: Colors.primary }}
                                            >
                                                <Ionicons name="construct-outline" size={20} color={Colors.secondary} />
                                            </View>
                                            <View className="flex-1">
                                                <CustomText boldness="bold" color="secondary" size="small" classes="mb-1">
                                                    {t('services.results_footer_card_title')}
                                                </CustomText>
                                                <CustomText boldness="medium" color="gray_medium" size="extraSmall">
                                                    {t('services.results_footer_card_subtitle')}
                                                </CustomText>
                                            </View>
                                        </View>
                                    ) : null
                                }
                                ListEmptyComponent={() => (
                                    <View className="items-center justify-center mt-10 px-6">
                                        <View
                                            className="w-20 h-20 rounded-full items-center justify-center mb-4"
                                            style={{ backgroundColor: Colors.support_primary }}
                                        >
                                            <FontAwesome6 name="magnifying-glass" size={32} color={Colors.gray_medium} />
                                        </View>
                                        <CustomText boldness="bold" color="secondary" size="medium" classes="text-center mb-2">
                                            {t('services.no_services_found')}
                                        </CustomText>
                                        <CustomText boldness="medium" color="gray_medium" size="small" classes="text-center mb-6">
                                            {t('services.no_services_found_with_term_subtitle', { term: appliedSearchTerm })}
                                        </CustomText>
                                        <TouchableOpacity
                                            onPress={handleResetSearch}
                                            className="flex-row items-center px-6 py-3 rounded-full"
                                            style={{ backgroundColor: Colors.primary }}
                                        >
                                            <Feather name="x" size={16} color={Colors.secondary} />
                                            <CustomText boldness="semiBold" color="secondary" size="small" classes="ml-2">
                                                {t('services.clear_search')}
                                            </CustomText>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            />
                        )}
                    </View>
                ) : (
                    <FlatList
                        data={[]}
                        renderItem={null}
                        keyExtractor={() => 'categories'}
                        showsVerticalScrollIndicator={false}
                        className={Platform.OS === 'android' ? 'mb-[60px]' : 'mb-[10px]'}
                        contentContainerStyle={{ paddingBottom: 24 }}
                        ListHeaderComponent={CategoriesGrid}
                    />
                )}
            </View>
        </SafeAreaView>
    )
}

export default ServicesList
