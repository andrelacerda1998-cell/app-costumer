export interface ScheduleVendorInterface {
  original_price: any;
  id: number;
  name: string;
  rate: number;
  distance: number;
  rating: number;
  avatar: string;
  is_online: boolean;
  has_auto_accept: boolean;
}

export interface AvailableSlot {
  date: string; // "2025-01-20"
  day_name: string; // "Mo", "Tu", etc.
  time_start: string; // "09:00"
  time_end: string; // "10:00"
  auto_accept: boolean;
  enabled?: boolean;
}
