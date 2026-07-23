import { API_ROUTES } from '@/constants/ApiRoutes';
import { Colors } from '@/constants/Colors';
import { useApi } from '@/contexts/ApiContext';
import useDebounce from '@/hooks/useDebounce';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { CustomText } from '../CustomText';

export interface PlaceSuggestion {
    description: string;
    place_id?: string;
    street_name?: string;
    city?: string;
    postal_code?: string;
    state?: string;
    [key: string]: any;
}

interface PlacesAutocompleteProps {
    value: string;
    onChangeText: (text: string) => void;
    onSelect: (suggestion: PlaceSuggestion) => void;
    placeholder?: string;
    error?: any;
    success?: any;
    disabled?: boolean;
    minChars?: number;
    suppressSuggestions?: boolean;
}

const DEBOUNCE_MS = 500;
const MIN_CHARS_DEFAULT = 3;
const MAX_SUGGESTIONS = 5;

// "Rua José Maria Teles Baltazar 10, Carvoeira, Portugal"
// → street_name: "Rua José Maria Teles Baltazar", street_number: "10", city: "Carvoeira"
function parseDescription(description: string): Partial<PlaceSuggestion> {
    const parts = description.split(',').map((p) => p.trim());
    const streetPart = parts[0] ?? '';

    const numberMatch = streetPart.match(/\s+(\d+[A-Za-z]?(?:-\d+)?)$/);
    const street_name = numberMatch
        ? streetPart.slice(0, numberMatch.index).trim()
        : streetPart;
    const street_number = numberMatch?.[1];

    // city is the part between street and country (second-to-last)
    const city = parts.length >= 3 ? parts[parts.length - 2] : parts[1];

    return { street_name, street_number, city };
}

const PlacesAutocomplete = ({
    value,
    onChangeText,
    onSelect,
    placeholder = '',
    error,
    success,
    disabled = false,
    minChars = MIN_CHARS_DEFAULT,
    suppressSuggestions = false,
}: PlacesAutocompleteProps) => {
    const { api } = useApi();
    const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const debouncedValue = useDebounce(value, DEBOUNCE_MS);
    // Arranca com o valor inicial para não pesquisar (nem abrir sugestões)
    // quando o campo vem pré-preenchido de uma morada guardada.
    const lastSearched = useRef<string>(value);
    const suppressRef = useRef(suppressSuggestions);

    useEffect(() => {
        suppressRef.current = suppressSuggestions;
        if (suppressSuggestions) {
            setSuggestions([]);
            setOpen(false);
        }
    }, [suppressSuggestions]);

    useEffect(() => {
        if (suppressRef.current) {
            setSuggestions([]);
            setOpen(false);
            return;
        }

        if (
            debouncedValue.length < minChars ||
            debouncedValue === lastSearched.current
        ) {
            if (debouncedValue.length < minChars) {
                setSuggestions([]);
                setOpen(false);
            }
            return;
        }

        lastSearched.current = debouncedValue;
        setLoading(true);

        api.post(API_ROUTES.COMMON_PLACES_AUTOCOMPLETE, { input: debouncedValue })
            .then(({ data }) => {
                const results: PlaceSuggestion[] = (data?.data?.predictions ?? []).slice(0, MAX_SUGGESTIONS);
                setSuggestions(results);
                setOpen(results.length > 0);
            })
            .catch(() => {
                setSuggestions([]);
                setOpen(false);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [debouncedValue]);

    const handleSelect = (suggestion: PlaceSuggestion) => {
        const parsed = parseDescription(suggestion.description);
        const enriched: PlaceSuggestion = { ...suggestion, ...parsed };
        onSelect(enriched);
        setSuggestions([]);
        setOpen(false);
        lastSearched.current = parsed.street_name ?? suggestion.description;
    };

    const borderColor = error
        ? Colors.error
        : success
        ? Colors.success
        : Colors.support_primary;

    return (
        <View>
            <View style={{ position: 'relative' }}>
                <TextInput
                    value={value}
                    onChangeText={(text) => {
                        onChangeText(text);
                        if (text.length < minChars) {
                            setSuggestions([]);
                            setOpen(false);
                        }
                    }}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.gray_light}
                    editable={!disabled}
                    style={{
                        borderWidth: 1,
                        borderColor,
                        borderRadius: 10,
                        paddingHorizontal: 16,
                        paddingVertical: 16,
                        paddingRight: loading ? 48 : 16,
                        fontSize: 16,
                        color: Colors.secondary,
                        fontFamily: 'Poppins_400Regular',
                        opacity: disabled ? 0.6 : 1,
                        backgroundColor: 'transparent',
                    }}
                />
                {loading && (
                    <View
                        style={{
                            position: 'absolute',
                            right: 14,
                            top: 0,
                            bottom: 0,
                            justifyContent: 'center',
                        }}
                    >
                        <ActivityIndicator size="small" color={Colors.gray_medium} />
                    </View>
                )}
            </View>

            {open && suggestions.length > 0 && (
                <View
                    style={{
                        marginTop: 4,
                        backgroundColor: Colors.support_secondary,
                        borderWidth: 1,
                        borderColor: Colors.support_primary,
                        borderRadius: 10,
                        overflow: 'hidden',
                    }}
                >
                    {suggestions.map((item, index) => (
                        <TouchableOpacity
                            key={item.place_id ?? item.description + index}
                            onPress={() => handleSelect(item)}
                            style={{
                                paddingHorizontal: 16,
                                paddingVertical: 14,
                                borderBottomWidth: index < suggestions.length - 1 ? 1 : 0,
                                borderBottomColor: Colors.support_primary,
                            }}
                        >
                            <CustomText size="small" color="secondary" numberOfLines={2}>
                                {item.description}
                            </CustomText>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

export default PlacesAutocomplete;
