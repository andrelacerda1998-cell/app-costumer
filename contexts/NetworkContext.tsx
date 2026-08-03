import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import NetInfo from "@react-native-community/netinfo";

/**
 * Estado da ligação à internet, disponível em toda a app.
 *
 * O `@react-native-community/netinfo` já era dependência do projeto mas só era
 * usado dentro do `hooks/echo.ts` (reconexão do websocket). Sem isto, a app
 * comportava-se como se estivesse tudo bem quando não havia rede: a Home
 * mostrava as categorias da cache e nada avisava o cliente (auditoria
 * 2026-08-03). Aqui o estado é elevado para a app inteira poder reagir.
 */
interface NetworkContextProps {
  /** false só quando temos a certeza de que não há ligação utilizável. */
  isConnected: boolean;
}

const NetworkContext = createContext<NetworkContextProps>({ isConnected: true });

export const NetworkProvider = ({ children }: { children: ReactNode }) => {
  // Começa otimista: mostrar "sem ligação" durante o arranque, antes da primeira
  // leitura do NetInfo, seria pior do que não mostrar nada.
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // `isInternetReachable` é null enquanto o sistema ainda não validou a
      // ligação — nesse caso confia-se apenas no `isConnected` para não piscar
      // o aviso em transições normais de rede.
      const reachable =
        state.isInternetReachable === null ? state.isConnected : state.isInternetReachable;
      setIsConnected(!!state.isConnected && !!reachable);
    });

    return () => unsubscribe();
  }, []);

  return <NetworkContext.Provider value={{ isConnected }}>{children}</NetworkContext.Provider>;
};

export const useNetwork = () => useContext(NetworkContext);
