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
  /**
   * Horários alternativos que o cliente aceita (até 3, o primeiro é o que vai
   * em scheduled_time_*). Servem para procurar técnicos livres em QUALQUER um
   * deles; a marcação em si continua a ser de uma hora só, porque é isso que o
   * servidor aceita.
   */
  preferred_slots?: { time_start: string; time_end: string }[];
}