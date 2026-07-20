import { API_ROUTES } from '@/constants/ApiRoutes';
import { useApi } from '@/contexts/ApiContext';
import * as Location from 'expo-location';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

export interface LocationFields {
    street_name: string;
    street_number: string;
    postal_code: string;
    city: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
}

export function useLocationFill() {
    const { api } = useApi();
    const { t } = useTranslation();
    const [locationLoading, setLocationLoading] = useState(false);
    const [suppressSearch, setSuppressSearch] = useState(false);

    const requestLocation = async (onFill: (fields: LocationFields) => void) => {
        setLocationLoading(true);
        setSuppressSearch(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('errors.title'), t('general.location_permission_denied'));
                return;
            }

            // Tentar primeiro a última localização conhecida (imediata; cobre os ~50% que já
            // funcionavam). Se não existir, pedir a localização atual com precisão explícita e
            // repetir uma vez para o caso do fornecedor GPS ainda estar frio.
            let location = await Location.getLastKnownPositionAsync({
                maxAge: 120000,          // 2 min
                requiredAccuracy: 100,   // metros
            });

            if (!location) {
                try {
                    location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });
                } catch (_e) {
                    location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });
                }
            }

            if (!location) {
                throw new Error('location-unavailable');
            }

            const { latitude, longitude } = location.coords;
            const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });

            if (geocoded.length > 0) {
                const geo = geocoded[0];
                const street_name = geo.street || '';
                const street_number = geo.streetNumber || '';
                const city = geo.city || geo.subregion || '';
                const state = geo.region || '';
                const country = geo.country || 'Portugal';

                let postal_code = geo.postalCode || '';
                if (postal_code && !/^\d{4}-\d{3}$/.test(postal_code)) {
                    try {
                        const searchTerm = [street_name, city, 'Portugal'].filter(Boolean).join(', ');
                        const { data } = await api.post(API_ROUTES.COMMON_PLACES_AUTOCOMPLETE, { input: searchTerm });
                        const predictions: any[] = data?.data?.predictions ?? [];
                        const match = predictions.find((p) => p.postal_code && /^\d{4}-\d{3}$/.test(p.postal_code));
                        if (match?.postal_code) postal_code = match.postal_code;
                    } catch (_) {}
                }

                onFill({ street_name, street_number, postal_code, city, state, country, latitude, longitude });
            }
        } catch (_) {
            Alert.alert(t('errors.title'), t('general.location_unavailable'));
        } finally {
            setLocationLoading(false);
            setTimeout(() => setSuppressSearch(false), 600);
        }
    };

    return { locationLoading, suppressSearch, requestLocation };
}
