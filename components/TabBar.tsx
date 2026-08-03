import { View, Platform, Text, TouchableOpacity } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from "@/constants/Colors";
import { useCart } from "@/contexts/CartContext";
import { Ionicons } from "@expo/vector-icons";

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { count: cartCount } = useCart();
  const routesWithAbsolutePosition = ['home'];
  const routesWithRoundedTop = ['home', 'list/index', 'cart/index', 'history/index', 'profile'];

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
    // Altura mínima + inset em vez de altura fixa: com a home indicator ou com o
    // texto do sistema aumentado, a `h-24` fixa cortava os rótulos (auditoria 2026-08-03).
    <View
      className={`w-full flex-row bg-primary items-center ${isRoundedTop() ? "rounded-t-3xl" : ""} ${isAbsolute() ? "absolute bottom-0 left-0 right-0" : ""}`}
      style={{ minHeight: 72, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8) }}
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

        // Cesto: botão central elevado com badge de contagem
        if (route.name === 'cart/index') {
          return (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              onLongPress={onLongPress}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              key={route.key}
            >
              <View style={{ alignItems: 'center', marginTop: -26 }}>
                <View
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    backgroundColor: Colors.secondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 4,
                    borderColor: Colors.primary,
                    shadowColor: '#000',
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 6,
                  }}
                >
                  <Ionicons name="cart" size={26} color={Colors.primary} />
                  {cartCount > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -6,
                        minWidth: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: '#EF4444',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 4,
                        borderWidth: 2,
                        borderColor: Colors.primary,
                      }}
                    >
                      <Text maxFontSizeMultiplier={1.2} style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                        {cartCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  maxFontSizeMultiplier={1.2}
                  style={{ color: isFocused ? Colors.secondary : Colors.gray_strong, fontSize: 11, marginTop: 2 }}
                >
                  {typeof label === 'string' ? label : ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }

        const textColor = isFocused ? Colors.secondary : Colors.gray_strong;

        return (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: isFocused }}
            // Sem isto os separadores ficavam anónimos para o VoiceOver:
            // `tabBarAccessibilityLabel` não está definido em lado nenhum da app.
            accessibilityLabel={
              options.tabBarAccessibilityLabel ?? (typeof label === 'string' ? label : route.name)
            }
            // testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 4,
            }}
            key={route.key}
          >
            {/* O rótulo visível vem de dentro do próprio tabBarIcon (ver
                (tabs)/_layout.tsx) — não é desenhado aqui para não duplicar. */}
            {icon ? icon({ color: textColor, focused: isFocused, size: 24 }) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}