import React, { PropsWithChildren, useContext, useState, useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";

const AppStateStatusContext = React.createContext<{ appStateStatus: AppStateStatus | undefined } | undefined>(undefined);

export default function AppStateStatusProvider({ children }: PropsWithChildren<{}>) {
    const [appStateStatus, setAppStateStatus] = useState<AppStateStatus | undefined>(AppState.currentState);

    useEffect(() => {
        const subscription = AppState.addEventListener("change", setAppStateStatus);
        return () => subscription.remove();
    }, []);

    return (
        <AppStateStatusContext.Provider value={{ appStateStatus }}>
            {children}
        </AppStateStatusContext.Provider>
    );
}

export function useAppStateStatus() {
    const context = useContext(AppStateStatusContext);
    if (!context) {
        throw new Error("useAppStateStatus must be used inside a AppStateStatusProvider");
    }
    return context;
}