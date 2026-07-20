import React from 'react';
import { ScrollView, View } from 'react-native';
import TouchOpacity from '@/components/TouchOpacity';
import { CustomText } from '@/components/CustomText';
import { DesignTokens as D } from '@/constants/DesignTokens';

export interface FilterTabItem {
    key: string;
    label: string;
    count?: number;
}

interface FilterTabsProps {
    tabs: FilterTabItem[];
    activeKey: string;
    onChange: (key: string) => void;
}

// Tabs em formato de chip com contagem (design novo — design/app-customer/historico.jsx).
// Componente próprio para não mexer nos componentes globais da aplicação.
const FilterTabs = ({ tabs, activeKey, onChange }: FilterTabsProps) => {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            // Padding interno + margem negativa: evita que a borda dos chips seja
            // cortada nas extremidades do ScrollView sem desalinhar do resto do ecrã.
            style={{ marginHorizontal: -4, marginVertical: -4 }}
            contentContainerStyle={{ flexDirection: 'row', gap: 8, padding: 4, alignItems: 'center' }}
        >
            {tabs.map((tab) => {
                const isActive = tab.key === activeKey;
                return (
                    <TouchOpacity
                        key={tab.key}
                        rounded="full"
                        otherClasses="flex-row items-center"
                        style={{
                            backgroundColor: isActive ? D.A : D.soft,
                            borderWidth: 1,
                            borderColor: isActive ? D.A : D.line,
                            borderRadius: 999,
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                        }}
                        onPress={() => onChange(tab.key)}
                    >
                        <CustomText
                            size="small"
                            color="secondary"
                            boldness="bold"
                            style={{ color: isActive ? D.ink : D.mut }}
                        >
                            {tab.label}
                        </CustomText>
                        {tab.count !== undefined && (
                            <View
                                className="rounded-full px-1 min-w-[18px] h-[18px] items-center justify-center"
                                style={{ backgroundColor: isActive ? D.countOnActive : D.countOnIdle }}
                            >
                                <CustomText
                                    size="specExtraSmall"
                                    color="secondary"
                                    boldness="bold"
                                    style={{ color: isActive ? D.ink : D.mut, lineHeight: 14 }}
                                >
                                    {tab.count}
                                </CustomText>
                            </View>
                        )}
                    </TouchOpacity>
                );
            })}
        </ScrollView>
    );
};

export default FilterTabs;
