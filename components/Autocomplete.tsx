import React, { useEffect, useState } from "react";
import { TextInput, FlatList, Text, TouchableOpacity, Keyboard } from "react-native";


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
                setText(item);
                setFiltered([]);
                openSeviceFlatlist(item);
            }}
            >                            
                <Text className="p-2.5">{renderItemOnFlatList(item?.name)}</Text>
            </TouchableOpacity>
            )}
        />
    </>
  );
}

export default AutocompleteInput;