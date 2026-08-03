import React, {ReactNode, useContext, useState} from "react";
import {DataMakeScheduleInterface} from "@/types/schedule";
import {useApi} from "@/contexts/ApiContext";
import {API_ROUTES} from "@/constants/ApiRoutes";

interface ScheduleContextType {
  dataToMakeSchedule: DataMakeScheduleInterface | null;
  setDataToMakeSchedule: React.Dispatch<React.SetStateAction<DataMakeScheduleInterface | null>>;
  makeSchedule: (service_id: any) => Promise<any>;
}

const ScheduleContext = React.createContext<ScheduleContextType>({
  dataToMakeSchedule: null,
  setDataToMakeSchedule: () => {},
  makeSchedule: async () => {},
});

export const ScheduleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { api } = useApi();
  const [dataToMakeSchedule, setDataToMakeSchedule] = useState<DataMakeScheduleInterface | null>(null);

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