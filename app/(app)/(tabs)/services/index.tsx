import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import BackHeader from "@/components/app/BackHeader";
import { CustomText } from "@/components/CustomText";
import FilterTabs from "@/components/FilterTabs";
import { useService } from "@/contexts/ServiceContext";
import SchedulesList from "@/app/(app)/(pages)/(schedules)/[schedule]";
import HistoryList from "@/app/(app)/(tabs)/history/index";

/**
 * Serviços — o que está marcado e o que já passou, no mesmo sítio.
 *
 * Eram dois ecrãs em dois cantos da app: a agenda na barra e o histórico dentro
 * da conta. Para o cliente é a mesma pergunta ("os meus serviços"), e a
 * resposta mudava de sítio consoante a data. Aqui a distinção é um separador,
 * não uma viagem.
 *
 * As duas listas são as que já existiam, em modo incorporado — sem cópias a
 * divergir.
 */
const ServicesTab = () => {
  const { t } = useTranslation();
  const { scheduledServices, setScheduledServices, getScheduledServices } = useService();
  const [tab, setTab] = useState<"active" | "past">("active");

  /**
   * Recarrega ao voltar ao separador, e não só no arranque.
   *
   * A lista vinha do contexto, mas quem a ia buscar era o `useFocusEffect` da
   * HOME. Quem marcasse ou cancelasse um serviço e viesse para aqui via o
   * estado anterior — e continuava a vê-lo até passar pela home outra vez.
   * O contexto é partilhado, por isso isto não duplica nada: atualiza a mesma
   * lista que a home lê.
   */
  useFocusEffect(
    useCallback(() => {
      getScheduledServices().then((response) => {
        setScheduledServices(response);
      });
    }, [])
  );

  const activeCount = Array.isArray(scheduledServices) ? scheduledServices.length : 0;

  return (
    <SafeAreaView className="flex-1 bg-primary" edges={["top", "left", "right"]}>
      <View className="px-5 pt-3 pb-2">
        <BackHeader
          hideBack
          backButtonColor="secondary"
          middleItem={() => (
            <CustomText color="secondary" boldness="bold" numberOfLines={1}>
              {t("tabs.services")}
            </CustomText>
          )}
        />
      </View>

      <View className="flex-1 rounded-t-3xl pt-4" style={{ backgroundColor: "#FAF7F2" }}>
        <View className="px-5 pb-3">
          <FilterTabs
            tabs={[
              // A contagem só no que está marcado: é aí que ela diz alguma
              // coisa ("tenho 3 por acontecer"). No histórico seria só um total.
              { key: "active", label: t("services_tab.active"), count: activeCount || undefined },
              { key: "past", label: t("services_tab.past") },
            ]}
            activeKey={tab}
            onChange={(key) => setTab(key as "active" | "past")}
          />
        </View>

        {tab === "active" ? <SchedulesList embedded /> : <HistoryList embedded />}
      </View>
    </SafeAreaView>
  );
};

export default ServicesTab;
