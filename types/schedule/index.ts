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
  /** Repetição escolhida no ecrã da data; ausente quando é uma vez só. */
  recurrence?: "weekly" | "biweekly" | "monthly";
  /**
   * Marcação já existente que este pagamento vem confirmar (ocorrência de uma
   * série). Sem isto o servidor criaria uma segunda marcação no mesmo horário.
   */
  schedule_id?: number;
}