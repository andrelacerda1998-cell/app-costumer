import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

/**
 * Pulso de radar para a espera pelos técnicos.
 *
 * Anéis âmbar que se expandem e desvanecem a partir do centro — a metáfora do
 * "à procura à tua volta" que um simples spinner não dá. Três anéis desfasados
 * criam a onda contínua; ao centro, um ícone de procura fixo.
 *
 * useNativeDriver em tudo (scale + opacity): a animação corre na UI thread e não
 * engasga quando o JS está ocupado com o pedido em curso.
 */
const RING_COUNT = 3;
const CYCLE_MS = 2100;

export default function SearchingPulse({ size = 150 }: { size?: number }) {
  const anims = useRef(
    Array.from({ length: RING_COUNT }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    const loops = anims.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay((i * CYCLE_MS) / RING_COUNT),
          Animated.timing(v, {
            toValue: 1,
            duration: CYCLE_MS,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [anims]);

  const core = size * 0.4;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {anims.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: Colors.primary,
            opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.35, 0] }),
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
          }}
        />
      ))}
      <View
        style={{
          width: core,
          height: core,
          borderRadius: core / 2,
          backgroundColor: Colors.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: Colors.primary,
          shadowOpacity: 0.5,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
      >
        <Feather name="search" size={core * 0.5} color={Colors.secondary} />
      </View>
    </View>
  );
}
