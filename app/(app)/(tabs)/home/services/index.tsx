import BackHeader from '@/components/app/BackHeader';
import ServiceMainCard from '@/components/app/ServiceMainCard';
import { CustomText } from "@/components/CustomText";
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useService } from "@/contexts/ServiceContext";
import { useSession } from "@/contexts/SessionContext";
import { OperationAreaInterface } from "@/types/services";
import { Entypo, Feather } from '@expo/vector-icons';
import { router } from "expo-router";
import React from 'react';
import { useTranslation } from "react-i18next";
import { View, Text, FlatList, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ServicesScreen = () => {
  const { t } = useTranslation();
  const { operationAreas } = useService();
  const { userData } = useSession();

  const handleOpenService = (operationArea: OperationAreaInterface) => {
    const { id } = operationArea;

    if (userData && !userData.address) {
      router.navigate('/(app)/(modals)/(address)/update');
    } else if (userData && !userData.allowed_by_zone) {
      router.navigate('/(app)/(modals)/blocked-by-zone');
    } else {
      router.navigate(`/(app)/(modals)/(services)/(request)/select-service-type/${id}`);
    }
  };

  return (
    <SafeAreaView className={`flex-1 pb-28 bg-primary ${Platform.OS === 'android' ? 'pb-[100px]' : 'pb-[50px]'}`}>
      <BackHeader
        backButtonColor="secondary"
        middleItem={() => (
          <CustomText boldness="bold" color="secondary" numberOfLines={1}>
            {t('services.title_plural')}
          </CustomText>
        )}
        otherClasses="my-4 px-2"
      />

      <View className="flex-1 px-4">
        {operationAreas === null ? (
          <View className="space-y-4 pt-2">
            {Array.from({ length: 8 }, (_, index) => (
              <View
                key={index}
                className="w-full h-[72px] rounded-xl bg-support_secondary opacity-60"
              />
            ))}
            <ActivityIndicator className="mt-4" color={Colors.secondary} />
          </View>
        ) : (
          <FlatList
            data={operationAreas}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View className="w-full mb-4">
                <ServiceMainCard
                  Icon={() => <Feather name="tool" size={32} color={Colors.primary} />}
                  label={item.name}
                  onPress={() => {
                    handleOpenService(item)
                  }}
                />
              </View>
            )}
            ListEmptyComponent={() => (
              <View className="items-center justify-center mt-16 px-6">
                <View className="w-20 h-20 rounded-full items-center justify-center mb-4 bg-support_secondary">
                  <Feather name="tool" size={32} color={Colors.gray_medium} />
                </View>
                <CustomText
                  boldness="bold"
                  color="secondary"
                  size="medium"
                  className="text-center"
                >
                  {t('services.no_services_found')}
                </CustomText>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default ServicesScreen;
