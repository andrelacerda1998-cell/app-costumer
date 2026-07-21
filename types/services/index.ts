import { UserAddressInterface } from "../session";

export interface OperationAreaInterface {
  id: number;
  name: string;
  /** Ausente na pseudo-área "Todos" (id -1). */
  image?: string;
}

export enum ServiceStatus {
  PENDING = 'Pending',
  SCHEDULED = 'Scheduled',
  CANCELED = 'Canceled',
  ACCEPTED = 'Accepted',
  CLOSED = 'Closed',
  REFUSED = 'Refused',
  FINISHED = 'Finished',
  ARRIVED = 'Arrived',
  REFUSED_MBWAY = 'RefusedMbway',
  EXPIRED_MBWAY = 'ExpiredMbway',
  CANCELED_MBWAY = 'CanceledMbway',
}

export interface ServiceInterface {
  id: string;
  name: string;
  description: string;
  vendor_id: string;
  status: ServiceStatus;
  customer: {
    email: string;
    id: number;
    name: string;
    phone: string | null;
  };
  address: UserAddressInterface | null;
  customer_notes: string | null;
  distance: string;
  invoice?: string;
  amount: number;
  /** Preço apresentado ao cliente (usado em analytics; nem sempre presente). */
  price?: number;
  service_type: ServiceTypeInterface | null;
  vendor: {
    user: {
      id: number,
      name: string,
      phone: string | null,
      email: string;
      avatar: {
        small: string;
        src: string;
      }
    },
    location:{
      latitude: number,
      longitude: number
    }
    price_rate: string;
  } | null;
  vendor_notes: string | null;
  rating_by_customer: number | null;
  created_at: string;
  updated_at: string;
  server_time?: string;
  scheduled?: boolean;
  is_scheduled?: boolean;
  scheduled_day?: string;
  scheduled_time_start?: string;
  scheduled_time_end?: string;
  schedule?: {
    scheduled_day?: string;
    scheduled_time_start?: string;
    scheduled_time_end?: string;
    price?: number;
  } | null;
  schedule_details?: {
    service_id?: string | number;
    price?: number;
  } | null;
}

export interface ServiceWithVendorInterface {
  id?: string | number;
  service_type?: ServiceTypeInterface;
  vendor?: {
    id: number;
    distance: number;
    name: string;
    rate: number;
    rating: number;
  };
}

export interface AdressInterface {
  id: number;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface ServiceTypeInterface {
  id: number;
  name?: string;
  time?: number;
  description?: string;
  image?: string;
  includes?: string[];
  excludes?: string[];
  operation_area?: OperationAreaInterface;
  starts_from?: number;
}

export interface VendorsInterface2 {
  distance: number,
  id: number,
  name: string, 
  rate: number,
  rating: number,
  avatar: {
    small: string,
    src: string,
  },
}


export interface ScheduledService{
   
  id: number;
  status: string;
  scheduled_day: string;
  scheduled_time_start: string;
  scheduled_time_end: string;
  service_id: number;
  /** Preço apresentado na listagem de agendamentos (nem sempre presente). */
  price?: number;
  vendor: {
    id: number;
    name: string
    avatar: null | string;
  },
  service_type: {
    id: number;
    name: string;
  },
  created_at: string;   
}
