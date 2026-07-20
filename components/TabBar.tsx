import { View, Platform, Text, TouchableOpacity } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from "@/constants/Colors";
import { useSession } from "@/contexts/SessionContext";

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const routesWithAbsolutePosition = ['home'];
  const routesWithRoundedTop = ['home', 'list/index', 'history/index', 'profile'];

  const getCurrentTab = () => {
    return state.routes[state.index].name;
  };

  const isAbsolute = () => {
    return routesWithAbsolutePosition.includes(getCurrentTab());
  }

  const isRoundedTop = () => {
    return routesWithRoundedTop.includes(getCurrentTab());
  }

  return (
    <View
      className={`w-full flex-row h-24 bg-primary items-center ${isRoundedTop() ? "rounded-t-3xl" : ""} ${isAbsolute() ? "absolute bottom-0 left-0 right-0" : ""}`}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];

        // Skip routes without an icon (auto-discovered non-tab routes)
        if (!options.tabBarIcon) return null;

        const label =
          options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;
        const icon = options.tabBarIcon;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            // testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: route.name === 'history/index' && !session ? 0.5 : 1,
            }}
            key={route.key}
          >
            {icon ? icon({ color: isFocused ? Colors.secondary : Colors.gray_strong, focused: isFocused, size: 24 }) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}