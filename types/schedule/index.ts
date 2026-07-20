export interface DataMakeScheduleInterface {
  vendor_id: number;
  customer_id: number;
  scheduled_day: string;
  service_type_id: number;
  service_id?: number;
  scheduled_time_start: string;
  scheduled_time_end: string;
}