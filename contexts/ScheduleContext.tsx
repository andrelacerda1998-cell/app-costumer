import React, {ReactNode, useContext, useState} from "react";
import {DataMakeScheduleInterface} from "@/types/schedule";
import {useApi} from "@/contexts/ApiContext";
import {API_ROUTES} from "@/constants/ApiRoutes";

/** Slot tal como o backend o devolve em /vendors/{id}/availability. */
export type AvailabilitySlot = {
  date: string;
  time_start: string;
  time_end: string;
  enabled?: boolean;
};

interface ScheduleContextType {
  dataToMakeSchedule: DataMakeScheduleInterface | null;
  setDataToMakeSchedule: React.Dispatch<React.SetStateAction<DataMakeScheduleInterface | null>>;
  makeSchedule: (service_id: any) => Promise<any>;
  /**
   * Disponibilidade por técnico, recolhida uma vez no ecrã de escolha de data.
   *
   * O fluxo passou a ser "quando → quem", e a disponibilidade só existe por
   * técnico no backend (getAvailableSlots($vendor, $duration)); não há endpoint
   * de "quem está livre nesta hora". Como a app só mostra 3 técnicos, a união
   * da agenda desses 3 é todo o espaço de opções que o cliente veria — por isso
   * recolhe-se aqui e reutiliza-se no ecrã seguinte para filtrar, em vez de
   * repetir os pedidos.
   */
  vendorAvailability: Record<number, AvailabilitySlot[]>;
  setVendorAvailability: React.Dispatch<React.SetStateAction<Record<number, AvailabilitySlot[]>>>;
}

const ScheduleContext = React.createContext<ScheduleContextType>({
  dataToMakeSchedule: null,
  setDataToMakeSchedule: () => {},
  makeSchedule: async () => {},
  vendorAvailability: {},
  setVendorAvailability: () => {},
});

export const ScheduleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { api } = useApi();
  const [dataToMakeSchedule, setDataToMakeSchedule] = useState<DataMakeScheduleInterface | null>(null);
  const [vendorAvailability, setVendorAvailability] = useState<Record<number, AvailabilitySlot[]>>({});

  const makeSchedule = async (service_id: any) => {
    const data = {
      ...dataToMakeSchedule,
      service_id,
    }

    // Sem logs do payload nem da resposta: `data` leva morada, data/hora e
    // identificadores do cliente, e isso não pode ficar nos logs do dispositivo.
    try {
      // O `.then` vazio mantém o valor resolvido em `undefined`, como antes.
      return await api.post(API_ROUTES.REQUEST_SCHEDULE, data, { headers: { Accept: "application/json" } })
        .then(() => undefined);
    } catch (err: any) {
      if (__DEV__) console.log("error in make schedule");

      throw err?.response?.data ?? err;
    }
  }

  return (
    <ScheduleContext.Provider
      value={{
        dataToMakeSchedule,
        setDataToMakeSchedule,
        makeSchedule,
        vendorAvailability,
        setVendorAvailability,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const value = useContext(ScheduleContext);
  if (!value) {
    throw new Error('useSchedule must be wrapped in a <ScheduleProvider />');
  }

  return value;
}