import { Mixpanel } from 'mixpanel-react-native';
const MIXPANEL_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN ?? '';
const trackAutomaticEvents = false;
const mixpanel = new Mixpanel(MIXPANEL_TOKEN, trackAutomaticEvents);

let hasConsent: boolean = false;
let initStarted: boolean = false;

export const initMixpanel = async (): Promise<boolean> => {
  //if (initStarted) return true;
  initStarted = true;
  try {
    await mixpanel.init(false, {}, 'https://api-eu.mixpanel.com');
    mixpanel.setLoggingEnabled(true);
    return true;
  } catch (error) {
    console.error('Mixpanel init error:', error);
    initStarted = false;
    return false;
  }
};

export const setDistinctId = (id: string): void => {
  mixpanel.identify(id);
};

export const getDistinctId = (): Promise<string> => {
  return mixpanel.getDistinctId();
};

export const track = (eventName: string, properties?: Record<string, any>): void => {
  if (!hasConsent) return;
  mixpanel.track(eventName, properties);
};

export const identify = (userId: string): void => {
  mixpanel.identify(userId);
};

export const setUserProfile = (properties: Record<string, any>): void => {
  if (!hasConsent) return;
  mixpanel.getPeople().set(properties);
};

export const reset = (): void => {
  mixpanel.reset();
};

export const optInTracking = (): void => {
  hasConsent = true;
  mixpanel.optInTracking();
};

export const optOutTracking = (): void => {
  hasConsent = false;
  mixpanel.optOutTracking();
};

export const isTrackingEnabled = (): boolean => hasConsent;

export const flush = (): void => {
  mixpanel.flush();
};
