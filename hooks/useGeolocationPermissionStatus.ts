import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export function useGeolocationPermissionStatus() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch {
      setHasPermission(false);
    }
  };

  const requestPermission = async () => {
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      return { granted, canAskAgain };
    } catch {
      return { granted: false, canAskAgain: false };
    }
  };

  return { hasPermission, requestPermission, refetchStatus: checkPermissionStatus };
}
