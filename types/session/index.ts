export interface UserDataInterface {
  id: number;
  address: UserAddressInterface | null;
  avatar: {
    small: string | null;
    src: string | null;
  } | null;
  can_request_service: boolean;
  date_birthday: string;
  email: string;
  email_verified_at: string;
  first_name: string;
  gender_id: number;
  language: string;
  last_name: string;
  name: string;
  nif: string | null;
  phone_number: string;
  phone_number_verified_at: string;
  two_factor_confirmed_at: string | null;
  two_factor_recovery_codes: string | null;
  two_factor_secret: string | null;
  two_factor_type: string | null;
  notifications: number;
  allowed_by_zone: boolean | null;
}

export interface UserAddressInterface {
  address_name: string | null;
  city: string;
  country: string;
  created_at: string;
  deleted_at: string | null;
  id: number;
  latitude: number;
  longitude: number;
  main_address: number;
  name: string;
  postal_code: string;
  state: string;
  street_name: string;
  street_number: string;
  additional_info: string | null;
  updated_at: string;
}
