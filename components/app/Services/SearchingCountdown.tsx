import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { CustomText } from "@/components/CustomText";
import { Colors } from "@/constants/Colors";

/**
 * Círculo de contagem para a procura de técnicos.
 *
 * O anel esvazia-se à medida que a janela de procura passa e o tempo que falta
 * está ao centro, em números grandes: o cliente vê de relance quanto ainda
 * pode esperar. É o mesmo desenho do cronómetro da aceitação do pedido, para
 * as duas esperas da app se parecerem uma com a outra.
 *
 * Por trás do anel há um halo a pulsar — dá o sinal de "está a acontecer algo"
 * que um anel parado entre segundos não dá.
 */

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  secondsLeft: number;
  totalSeconds: number;
  size?: number;
};

const SearchingCountdown = ({ secondsLeft, totalSeconds, size = 190 }: Props) => {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const ratio = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0;
  const progress = useRef(new Animated.Value(ratio)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: ratio,
      duration: 400,
      easing: Easing.linear,
      // strokeDashoffset não é uma propriedade que o driver nativo saiba animar.
      useNativeDriver: false,
    }).start();
  }, [ratio, progress]);

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

  const minutes = Math.floor(Math.max(0, secondsLeft) / 60);
  const seconds = Math.max(0, secondsLeft) % 60;
  const label = `${minutes}:${String(seconds).padStart(2, "0")}`;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={{
          position: "absolute",
          width: size * 0.82,
          height: size * 0.82,
          borderRadius: size,
          backgroundColor: Colors.primary,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.10, 0.22] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.06] }) }],
        }}
      />

      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={progress.interpolate({
            inputRange: [0, 1],
            outputRange: [circumference, 0],
          })}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={{ position: "absolute", alignItems: "center" }}>
        <CustomText color="secondary" size="headline" boldness="bold" numberOfLines={1}>
          {label}
        </CustomText>
      </View>
    </View>
  );
};

export default SearchingCountdown;
