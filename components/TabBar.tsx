import { View, Platform, Text, TouchableOpacity } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from "@/constants/Colors";
import { useCart } from "@/contexts/CartContext";
import { CART_ENABLED } from "@/constants/Features";
import { Ionicons } from "@expo/vector-icons";

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { count: cartCount } = useCart();
  const routesWithAbsolutePosition = ['home'];

  /**
   * O `href: null` do expo-router não chega aqui: esta barra é um componente
   * próprio e desenha os separadores a partir de `state.routes`, sem olhar às
   * opções de navegação. Para esconder o cesto é preciso filtrá-lo aqui.
   * Ver constants/Features.ts para a razão de estar desligado.
   */
  const visibleRoutes = state.routes.filter(
    (route) => CART_ENABLED || route.name !== "cart/index",
  );

  const getCurrentTab = () => {
    return state.routes[state.index].name;
  };

  const isAbsolute = () => {
    return routesWithAbsolutePosition.includes(getCurrentTab());
  }

  return (
    // Altura mínima + inset em vez de altura fixa: com a home indicator ou com o
    // texto do sistema aumentado, a `h-24` fixa cortava os rótulos (auditoria 2026-08-03).
    <View
      className={`w-full flex-row items-center rounded-t-3xl ${isAbsolute() ? "absolute bottom-0 left-0 right-0" : ""}`}
      style={{
        // Barra branca com uma divisória fina: o âmbar de largura total pintava
        // um sexto do ecrã e roubava destaque ao que está por cima.
        backgroundColor: Colors.background,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        minHeight: 72,
        paddingTop: 10,
        paddingBottom: Math.max(insets.bottom, 10),
        // Relevo: a barra passa a flutuar sobre o conteúdo em vez de ser um
        // bloco chapado. Sombra PARA CIMA (height negativo), que é de onde a
        // barra "sai".
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -3 },
        elevation: 12,
      }}
    >
      {visibleRoutes.map((route, index) => {
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

        // Comparar por chave e não por índice: a lista está filtrada (o cesto
        // pode ter saído), por isso o índice daqui já não corresponde ao
        // state.index — o destaque saltava para o separador seguinte.
        const isFocused = state.routes[state.index]?.key === route.key;

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

        // Pedidos: botão central elevado com badge de contagem discreto.
        // A rota continua a chamar-se cart/index (renomear a rota mexeria na
        // navegação e nos deep links); só o vocabulário visível mudou.
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
              <View style={{ alignItems: 'center', marginTop: -22 }}>
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: Colors.secondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 4,
                    borderColor: Colors.primary_strong,
                    shadowColor: '#000',
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 6,
                  }}
                >
                  <Ionicons name="receipt-outline" size={24} color={Colors.support_secondary} />
                  {cartCount > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -6,
                        minWidth: 17,
                        height: 17,
                        borderRadius: 9,
                        backgroundColor: '#EF4444',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 4,
                        borderWidth: 2,
                        borderColor: Colors.background,
                      }}
                    >
                      <Text maxFontSizeMultiplier={1.2} style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                        {cartCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  maxFontSizeMultiplier={1.2}
                  style={{ color: isFocused ? Colors.primary_strong : Colors.gray_strong, fontSize: 11, marginTop: 2 }}
                >
                  {typeof label === 'string' ? label : ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }

        const textColor = isFocused ? Colors.primary_strong : Colors.gray_strong;

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
            {/* Pastilha no topo do separador ativo: o destaque deixa de ser só
                uma mudança de cor (que quase não se via) e passa a ler-se de
                relance. Slot de altura fixa para não empurrar o ícone quando
                aparece/desaparece. */}
            <View
              style={{
                height: 3,
                width: 22,
                borderRadius: 2,
                marginBottom: 7,
                backgroundColor: isFocused ? Colors.primary_strong : "transparent",
              }}
            />
            {/* O rótulo visível vem de dentro do próprio tabBarIcon (ver
                (tabs)/_layout.tsx) — não é desenhado aqui para não duplicar. */}
            {icon ? icon({ color: textColor, focused: isFocused, size: 24 }) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}