export interface PaymentMethod {
    id: number;
    bin: string;
    last4: string;
    type: string;
    brand: string;
    brand_description: string|null;
    expire_month: string;
    expire_year: string;
    holder: string;
    isDefault: boolean;
    created_at: string|null;
    updated_at: string|null;
}
