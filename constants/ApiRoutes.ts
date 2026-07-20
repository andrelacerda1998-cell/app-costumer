// Define the base URL for the API
import Constants from "expo-constants";

export const DOMAIN = Constants?.expoConfig?.extra?.API_URL;
export const PROTOCOL =  Constants?.expoConfig?.extra?.API_PROTOCOL;

export const API_BASE_URL = PROTOCOL + DOMAIN + "/api/v1";

// Define the API routes
export const API_ROUTES = {
    // Auth routes
    AUTH_LOGIN: `${API_BASE_URL}/auth/login`,
    AUTH_LOGOUT: `${API_BASE_URL}/auth/logout`,
    AUTH_ME: `${API_BASE_URL}/auth/me`,
    AUTH_LOGIN_FORGOT_PASSWORD: `${API_BASE_URL}/auth/login/forgot-password`,
    AUTH_REGISTER: `${API_BASE_URL}/auth/registration/customer`,
    AUTH_REFRESH: `${API_BASE_URL}/auth/refresh`,
    AUTH_VERIFY_USER_DATA: `${API_BASE_URL}/auth/registration/verify-user`,
    AUTH_UPDATE_PROFILE: `${API_BASE_URL}/auth/profile/update`,
    AUTH_RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
    AUTH_LOCALE: `${API_BASE_URL}/auth/locale`,
    EMAIL_VERIFY: `${API_BASE_URL}/auth/email/send-confirmation`,
    GET_SMS_VALIDATION: `${API_BASE_URL}/auth/sms-validation`,
    POST_SMS_VALIDATION: `${API_BASE_URL}/auth/sms-validation`,

    // Common routes
    COMMON_GET_SERVICES_TYPES: `${API_BASE_URL}/common/services/types`,
    COMMON_GET_GENDERS: `${API_BASE_URL}/common/genders`,
    COMMON_GET_NOTIFICATIONS: `${API_BASE_URL}/common/notifications`,
    COMMON_PLACES_AUTOCOMPLETE: `${API_BASE_URL}/common/places/autocomplete`,

    COMMON_GET_UPDATE_APP: `${API_BASE_URL}/common/app-update`,
    COMMON_APP_VERSION: `${API_BASE_URL}/common/app-version`,
    COMMON_ACCOUNT_DELETE: `${API_BASE_URL}/common/account/delete`,
    COMMON_GET_PAYMENT_METHODS: `${API_BASE_URL}/common/payment-methods`,

    // Common public
    COMMON_CHECK_ZONE: `${API_BASE_URL}/common/check-zone`,

    // Guest browsing (public)
    GUEST_GET_OPERATION_AREAS: `${API_BASE_URL}/common/services/operation-areas`,
    GUEST_GET_SERVICES_BY_OPERATION_AREA: (id: string) => `${API_BASE_URL}/common/services/operation-areas/${id}/services-types`,
    GUEST_SEARCH_OPERATION_AREAS: `${API_BASE_URL}/common/services/operation-areas/search`,
    GUEST_SEARCH_VENDORS: `${API_BASE_URL}/common/services/guest/vendors`,
    GUEST_CALCULATE_SERVICE: `${API_BASE_URL}/common/services/guest/calculate`,

    // Guest auth
    GUEST_REGISTER: `${API_BASE_URL}/auth/guest/register`,
    GUEST_LOGIN: `${API_BASE_URL}/auth/guest/login`,
    GUEST_SEND_OTP: `${API_BASE_URL}/auth/guest/phone/send-otp`,
    GUEST_VERIFY_OTP: `${API_BASE_URL}/auth/guest/phone/verify-otp`,
    PHONE_LOGIN: `${API_BASE_URL}/auth/login/phone`,
    PHONE_LOGIN_VERIFY: `${API_BASE_URL}/auth/login/phone/verify`,

    // Campaign notification tracking
    CAMPAIGN_LOG_OPEN: (campaignLogId: number) => `${API_BASE_URL}/common/notifications/campaign-log/${campaignLogId}/open`,
    CAMPAIGN_LOG_CLICK: (campaignLogId: number) => `${API_BASE_URL}/common/notifications/campaign-log/${campaignLogId}/click`,
    NOTIFICATION_OPT_OUT: `${API_BASE_URL}/common/notifications/opt-out`,

    // Customer routes
    CUSTOMER_REQUEST_SERVICE: `${API_BASE_URL}/customer/services`,
    CUSTOMER_CHANGE_ADDRESS: `${API_BASE_URL}/customer/address`,
    CUSTOMER_GET_OPEN_SERVICES: `${API_BASE_URL}/customer/services/`,
    CUSTOMER_GET_SCHEDULED_SERVICES: `${API_BASE_URL}/customer/schedule`,
    CUSTOMER_CANCEL_SCHEDULE: (id: string) => `${API_BASE_URL}/customer/schedule/${id}/cancel`,

    // Services routes
    GET_OPERATION_AREAS: `${API_BASE_URL}/common/services/operation-areas`,
    GET_SERVICES_BY_OPERATION_AREA: (id: string) => `${API_BASE_URL}/common/services/operation-areas/${id}/services-types`,
    POST_CANCEL_SERVICE: (id: string) => `${API_BASE_URL}/customer/services/${id}/cancel`,
    POST_CANCEL_PENDING_3DS: (id: string) => `${API_BASE_URL}/customer/services/${id}/cancel-pending-3ds`,
    GET_SERVICE_DETAILS: (id: string) => `${API_BASE_URL}/customer/services/${id}`,
    GET_SERVICE_ROUTE: (id: string) => `${API_BASE_URL}/customer/services/${id}/route`,
    POST_CLOSE_SERVICE: (id: string) => `${API_BASE_URL}/customer/services/${id}/close`,
    CUSTOMER_CALCULATE_SERVICE: `${API_BASE_URL}/customer/services/calculate`,
    POST_OPEN_SERVICE: `${API_BASE_URL}/customer/services/open/credit-card`,
    POST_OPEN_SERVICE_MBWAY: `${API_BASE_URL}/customer/services/open/mbway`,
    PUT_RATE_SERVICE: (id: string) => `${API_BASE_URL}/customer/services/${id}/rate`,
    GET_PENDING_SERVICES: `${API_BASE_URL}/customer/services/pending`,
    POST_SEARCH_OPERATION_AREAS: `${API_BASE_URL}/common/services/operation-areas/search`,
    POST_SERVICES_HISTORY: `${API_BASE_URL}/customer/services/history`,
    GET_SERVICE_PAYMENT_STATUS: (id: string) => `${API_BASE_URL}/customer/services/${id}/payment-status`,
    GET_VENDOR_SCHEDULE: (id: number) => `${API_BASE_URL}/customer/schedule/vendor/${id}`,
    REQUEST_SCHEDULE: `${API_BASE_URL}/customer/schedule`,   // /customer/schedule
    POST_SCHEDULE_VENDORS: `${API_BASE_URL}/customer/schedule/vendors`,
    GET_SCHEDULE_VENDOR_AVAILABILITY: (vendor_id: number) =>
      `${API_BASE_URL}/customer/schedule/vendors/${vendor_id}/availability`,
    // Payment methods
    GET_PAYMENTS_METHODS: `${API_BASE_URL}/customer/payment-methods`,
    SAVE_PAYMENT_METHOD: `${API_BASE_URL}/customer/payment-methods/credit-card`,
    GET_PAYMENT_METHOD: (id: string) => `${API_BASE_URL}/customer/payment-methods/${id}`,
    DELETE_PAYMENT_METHOD: (id: string) => `${API_BASE_URL}/customer/payment-methods/${id}`,
    SET_PAYMENT_METHOD_AS_DEFAULT: (id: string) => `${API_BASE_URL}/customer/payment-methods/${id}`,

    //PUBLIC KEY
    GET_PUBLIC_KEY: `${API_BASE_URL}/auth/key`,

    // Chat Service
    GET_SERVICE_PUBLIC_KEY: (id: string) => `${API_BASE_URL}/common/services/${id}/public-key`,
    POST_MESSAGE: (id: string) => `${API_BASE_URL}/common/services/${id}/message`,
    GET_CHATS: (id: string) => `${API_BASE_URL}/common/services/${id}/message`,

    // Billing
    GET_BILLING_INFO: `${API_BASE_URL}/customer/billing`,
    POST_UPDATE_BILLING_INFO: `${API_BASE_URL}/customer/billing`,

    // Vouchers
    POST_VALIDATE_VOUCHER: `${API_BASE_URL}/customer/vouchers/validate`,
};
