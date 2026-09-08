import React, { useEffect, useState } from "react";
import { TextInput, FlatList, Text, TouchableOpacity, Keyboard, View } from "react-native";
import { useTranslation } from "react-i18next";
import RemoteThumb from "@/components/app/Services/RemoteThumb";
import { CustomText } from "@/components/CustomText";
import { renderMoney } from "@/utils/money";


interface AutocompleteProps{
 placeholder: string;
 className: string;
 data: any;
 placeholderTextColor: string;
 style: any;
 openSeviceFlatlist: Function;
 flatClass?: string;
 style2?: any;
 onTextChange?: (value: string) => void;
 closeSignal?: number;
 initialValue?: string;
}


const AutocompleteInput: React.FC<AutocompleteProps> = ({
 placeholder,
 className,
 data,
 placeholderTextColor,
 style,
 openSeviceFlatlist,
 flatClass,
 style2,
 onTextChange,
 closeSignal,
 initialValue,

}) => {

const { t } = useTranslation();
const [text, setText] = useState<string>(initialValue ?? "");
const [filtered, setFiltered] = useState<any>([]);

useEffect(() => {
 if (closeSignal === undefined) return;
 setFiltered([]);
 Keyboard.dismiss();
}, [closeSignal]);


const isObj = (item: any) => {
if (typeof item === "object" && !Array.isArray(item) && item !== null) {
    return true;
} else return false;
};


const filterText = (value: string) => {
setText(value);
onTextChange?.(value);

if (typeof value === 'string' && value.length === 0) {
    setFiltered([]);
    return;
}

if(Array.isArray(data)){
    const result = data.filter((item: any) => {
    // return item.toLowerCase().includes(value.toLowerCase())´

    //alternative to handle the ids, that will be needed to perform the search:
    return isObj(item) && item?.hasOwnProperty('name') && item?.hasOwnProperty('id') && typeof item.name === 'string' && item?.name.toLowerCase().includes(value.toLowerCase())
    });

     setFiltered(result);

}

};

const renderItemOnFlatList = (item: any) => {
 return typeof item === 'string' ? item : '';
}
  

return (  
    <>
        <TextInput className={className}
            value={text}
            onChangeText={filterText}
            placeholder={placeholder}          
            placeholderTextColor={placeholderTextColor}  
            style={style}  
        />
        <FlatList keyboardShouldPersistTaps="always" 
            // pointerEvents={autocompleteOpen ? 'none' : 'auto'}       
            className={flatClass}
            style={style2}        
            scrollEnabled={false} //ok while the list is short, because ScrollView should not have Flatlist within
            data={filtered}
            // keyExtractor={(item) => item}
            keyExtractor={(item) => item?.id}
            renderItem={({ item }) => (
            <TouchableOpacity className="border border-gray-100 rounded-md p-1" style={{marginBottom: 2}}
                onPress={() => {
                Keyboard.dismiss();
                // O nome, não o objeto: `setText(item)` metia um objeto no
                // campo de texto, que ficava em branco depois de escolher.
                setText(renderItemOnFlatList(item?.name));
                setFiltered([]);
                openSeviceFlatlist(item);
            }}
            >
                {/* Imagem e "Desde X", como na lista de tipos de serviço: com
                    o nome sozinho, escolher entre "Instalação de Torneira de
                    Lava-loiça" e "…de Casa de Banho" era ler e adivinhar o
                    preço. */}
                <View className="flex-row items-center p-2">
                    <RemoteThumb
                        uri={typeof item?.image === "string" ? item.image : null}
                        size={40}
                        radius={10}
                        fit="contain"
                    />
                    <CustomText color="secondary" size="small" boldness="semiBold" numberOfLines={2} classes="flex-1 ml-3 mr-2">
                        {renderItemOnFlatList(item?.name)}
                    </CustomText>
                    {typeof item?.starts_from === "number" && item.starts_from > 0 && (
                        <View className="flex-row items-baseline flex-shrink-0">
                            <CustomText color="gray_strong" size="extraSmall" numberOfLines={1}>
                                {t("services.service.starting_from_label")}
                            </CustomText>
                            <CustomText color="secondary" size="small" boldness="bold" numberOfLines={1} classes="ml-1">
                                {renderMoney((item.starts_from as number) * 100)}
                            </CustomText>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
            )}
        />
    </>
  );
}

export default AutocompleteInput;