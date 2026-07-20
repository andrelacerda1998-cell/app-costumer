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

    console.log("Making schedule with data:", data);

    try {
      return await api.post(API_ROUTES.REQUEST_SCHEDULE, data, { headers: { Accept: "application/json" } })
        .then((res) => console.log("Schedule made:", res.data));
    } catch (err: any) {
      console.log("error in make schedule");

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