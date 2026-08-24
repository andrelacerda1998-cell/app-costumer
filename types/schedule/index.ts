export interface DataMakeScheduleInterface {
  /**
   * Opcional desde que o fluxo passou a ser "quando → quem": o técnico só é
   * conhecido no ecrã seguinte ao da data, e é lá que este campo se completa.
   */
  vendor_id?: number;
  customer_id?: number;
  scheduled_day: string;
  service_type_id: number;
  service_id?: number;
  scheduled_time_start: string;
  scheduled_time_end: string;
}