import { useEffect, useCallback, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';


type UseStateHook<T> = [[boolean, T | null], (value: T | null) => void];

function useAsyncState<T>(
    initialValue: [boolean, T | null] = [true, null]
): UseStateHook<T> {
    return useReducer(
        (state: [boolean, T | null], action: T | null = null): [boolean, T | null] => [false, action],
        initialValue
    ) as UseStateHook<T>;
}

export async function setStorageItemAsync(key: string, value: string | null) {
    try {
        if (value == null) {
            await AsyncStorage.removeItem(key);
        } else {
            const stringifyValue = JSON.stringify(value);
            await AsyncStorage.setItem(key, stringifyValue);
        }
    } catch (e) {
        console.error(e);
    }
}

export function useAsyncStorage(key: string): UseStateHook<string> {
    const [state, setState] = useAsyncState<string>();

    useEffect(() => {
        const getStorageItem = async () => {

            try {
                const value = await AsyncStorage.getItem(key);
                const parsedValue = value ? JSON.parse(value) : null;
                setState(parsedValue);
            } catch (e) {
                setState(null);
            }
        };

        getStorageItem();
    }, [key]);

    const setValue = useCallback(
        (value: string | null) => {
            setState(value);
            setStorageItemAsync(key, value);
        },
        [key]
    );

    return [state, setValue];
}
