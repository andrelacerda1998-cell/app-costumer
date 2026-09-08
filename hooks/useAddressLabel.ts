import { useSession } from '@/contexts/SessionContext';
import { useGuestSession } from '@/contexts/GuestSessionContext';
import { useTranslation } from 'react-i18next';
import { formatAddressFull } from '@/utils/address';

const buildLabel = (...parts: Array<string | undefined | null>) =>
    parts.filter((part) => typeof part === 'string' && part.trim().length > 0).join(' ').trim();

export function formatAddressLabel(addr?: {
    street_name?: string | null;
    street_number?: string | null;
    name?: string | null;
    city?: string | null;
    country?: string | null;
} | null): string {
    if (!addr) return '';
    return buildLabel(addr.street_name, addr.street_number)
        || buildLabel(addr.name)
        || buildLabel(addr.city, addr.country);
}

export function useAddressLabel(): string {
    const { userData } = useSession();
    const { guestSession } = useGuestSession();
    const { t } = useTranslation();

    if (userData?.address) {
        const label = formatAddressLabel(userData.address);
        if (label) return label;
    }

    const ga = guestSession?.guest_address;
    if (ga) {
        const label = buildLabel(
            ga.street_name,
            ga.street_number
        ) || buildLabel(
            ga.name,
            ga.city
        ) || buildLabel(
            ga.city,
            ga.country
        );
        if (label) return label;
    }

    return t('general.no_address');
}

/** A mesma morada do `useAddressLabel`, mas com a cidade. */
export function useFullAddressLabel(): string {
    const { userData } = useSession();
    const { guestSession } = useGuestSession();
    const { t } = useTranslation();

    const label =
        formatAddressFull(userData?.address) || formatAddressFull(guestSession?.guest_address);

    return label || t('general.no_address');
}
