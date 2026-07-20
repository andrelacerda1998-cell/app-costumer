import { Text, View } from 'react-native';
import { Redirect, SplashScreen, Stack } from 'expo-router';
import { useSession } from '@/contexts/SessionContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AppLayout() {
    const { session, isLoading } = useSession();

    // You can keep the splash screen open, or render a loading screen like we do here.
    if (isLoading) {
        return SplashScreen.preventAutoHideAsync();
    }

    SplashScreen.hideAsync();

    // Only require authentication within the (app) group's layout as users
    // need to be able to access the (auth) group and sign in again.
    if (session) {
        // On web, static rendering will stop here as the user is not authenticated
        // in the headless Node process that the pages are rendered in.
        return <Redirect href="/(app)/(tabs)/home" />;
    }

    return (
        <Stack screenOptions={{
            headerShown: false,
        }}>
            <Stack.Screen
                name="index"
                options={{
                    animation: "fade_from_bottom"
                }}
            />
            <Stack.Screen
                name="signup/index"
                options={{
                    animation: "fade_from_bottom"
                }}
            />
            <Stack.Screen
                name="signin/index"
                options={{
                    animation: "fade_from_bottom"
                }}
            />
            <Stack.Screen
                name="forgot-password/index"
                options={{
                    animation: "fade_from_bottom"
                }}
            />
        </Stack>
    );
    // This layout can be deferred because it's not the root layout.
}
