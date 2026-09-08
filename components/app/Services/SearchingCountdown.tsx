import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Colors } from "@/constants/Colors";

/**
 * Sinal de "estamos à procura", no ecrã de escolha de técnico.
 *
 * Era uma contagem decrescente com o tempo ao centro. Um número a descer é uma
 * promessa — "em 3 minutos isto resolve-se" — que a app não controla: quem
 * responde são os técnicos. E ver 0:12 a aproximar-se do fim dá a sensação de
 * fracasso iminente antes de haver fracasso nenhum.
 *
 * Fica um anel a rodar: diz que está a acontecer alguma coisa sem prometer
 * quando acaba. A janela de procura continua a existir por baixo — ao esgotar,
 * o ecrã mostra o "sem técnicos" com o botão de tentar de novo.
 */

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  size?: number;
};

const SearchingCountdown = ({ size = 190 }: Props) => {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* Halo a respirar por trás do anel. */}
      <Animated.View
        style={{
          position: "absolute",
          width: size * 0.8,
          height: size * 0.8,
          borderRadius: size,
          backgroundColor: Colors.primary,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.22] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.06] }) }],
        }}
      />

      {/* O anel inteiro fica quieto; só o arco roda. */}
      <View style={{ position: "absolute" }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(0,0,0,0.08)"
            strokeWidth={stroke}
            fill="none"
          />
        </Svg>
      </View>

      <Animated.View
        style={{
          transform: [
            { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) },
          ],
        }}
      >
        <Svg width={size} height={size}>
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={Colors.primary}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            // Um quarto de volta a girar: dá o sentido do movimento sem
            // sugerir progresso, que seria outra promessa.
            strokeDasharray={`${circumference * 0.25} ${circumference * 0.75}`}
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

export default SearchingCountdown;
