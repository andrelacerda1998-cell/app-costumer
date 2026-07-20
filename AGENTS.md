# Mixpanel Analytics Implementation

## Overview

This project uses Mixpanel for event-based analytics tracking. The implementation includes a consent gate for EU/CA users and supports the full user journey from app open to service completion.

## Configuration

**Project Token:** `b48e678b1348530cb925454cd98a630d`

**Token Location:** `services/MixpanelService.ts`

**Consent Required:** Yes (EU/CA users)

## SDK

- **Package:** `mixpanel-react-native`
- **Platform:** React Native (Expo managed workflow)

## Architecture

```
contexts/MixpanelContext.tsx     # Provider and consent management
services/MixpanelService.ts     # Mixpanel wrapper service
components/ConsentBanner.tsx     # Consent UI component
components/ConsentBannerWrapper.tsx  # Conditional rendering wrapper
```

## Provider Structure

The MixpanelProvider wraps the app in `app/_layout.tsx`. The ConsentBanner is shown to users who haven't given consent yet.

## Events Tracked

| Event | Properties | Trigger |
|-------|-----------|---------|
| `app_opened` | `source` (organic/mupi/meta/google) | App load |
| `category_viewed` | `category_name`, `category_id` | User taps category |
| `service_viewed` | `service_name`, `price_from` | User selects service |
| `technician_list_viewed` | `service_name`, `technicians_count` | Vendor list loads |
| `technician_selected` | `technician_id`, `price`, `rating`, `position_in_list` | User picks technician |
| `checkout_started` | `service_name`, `technician_id`, `price` | Checkout screen loads |
| `phone_entered` | — | User enters phone |
| `sms_sent` | — | OTP sent |
| `sms_verified` | `time_to_verify_seconds` | OTP validated |
| `service_confirmed` | `price`, `is_new_user` | Service accepted |
| `profile_completion_prompted` | — | Profile prompt shown |
| `profile_completed` | `fields_filled` | Profile completed |
| `sign_up_completed` | `sign_up_method`, `platform` | Registration complete |

## Identity Management

**On Login/Signup:** User is identified via `identify(userId)` and profile is set via `people.set()` in `SessionContext.tsx` → `fetchAndSaveUserData()`.

**On Logout:** `reset()` is called in `SessionContext.tsx` → `signOut()`.

## Consent Handling

- Mixpanel is initialized but tracking is opt-in
- `giveConsent()` calls `optInTracking()` to enable tracking
- `revokeConsent()` calls `optOutTracking()` to disable tracking
- Events are only tracked when `hasConsent === true`

## Adding New Events

1. Import `useMixpanel` from `@/contexts/MixpanelContext`
2. Destructure `track` from the hook
3. Call `track('event_name', { property: value })` at the appropriate trigger point

Example:
```typescript
import { useMixpanel } from '@/contexts/MixpanelContext';

const MyComponent = () => {
  const { track } = useMixpanel();

  const handleAction = () => {
    track('my_event', { property: 'value' });
  };
};
```

## Anti-Patterns

- Do NOT use Mixpanel directly without going through `MixpanelContext`
- Do NOT track events before consent is given
- Do NOT identify users with email addresses - use internal IDs
- Do NOT send PII as event properties

## Files Modified for Mixpanel

- `app/_layout.tsx` - Added MixpanelProvider and ConsentBannerWrapper
- `contexts/MixpanelContext.tsx` - New consent management context
- `contexts/SessionContext.tsx` - Added identity management calls
- `services/MixpanelService.ts` - New Mixpanel wrapper service
- `components/ConsentBanner.tsx` - New consent UI component
- `components/ConsentBannerWrapper.tsx` - New conditional render wrapper
- `app/(auth)/signin/index.tsx` - Added phone/sms events
- `app/(auth)/signup/index.tsx` - Added sign_up_completed event
- `app/(app)/(tabs)/home/index.tsx` - Added app_opened and category_viewed events
- `app/(app)/(modals)/(services)/(request)/select-service-type/[operationAreaId].tsx` - Added service_viewed event
- `app/(app)/(modals)/(services)/(request)/select-vendor/[serviceId].tsx` - Added technician_list_viewed and technician_selected events
- `app/(app)/(modals)/(services)/(request)/checkout/[serviceId].tsx` - Added checkout_started event
- `app/(app)/(modals)/(services)/(request)/wait-accept/[serviceId].tsx` - Added service_confirmed event