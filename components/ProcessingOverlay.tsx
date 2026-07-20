import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/Colors';
import { CustomText } from '@/components/CustomText';

interface ProcessingOverlayProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
}

const RING_SIZE = 84;
const RING_DURATION_MS = 2700;

// Anel que expande e desvanece em loop (réplica do `lrs-ring` do design pedido.html).
const PulsingRing = ({ delay }: { delay: number }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: RING_DURATION_MS,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    animation.start();

    return () => animation.stop();
  }, [delay, progress]);

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
          transform: [
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.85] }) },
          ],
        },
      ]}
    />
  );
};

// Ponto central a piscar (réplica do `lrs-dot`).
const BlinkingDot = () => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 550, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 550, useNativeDriver: true }),
      ]),
    );
    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.dot, { opacity }]} />;
};

const ProcessingOverlay = ({ visible, title, subtitle }: ProcessingOverlayProps) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.animationArea}>
        <PulsingRing delay={0} />
        <PulsingRing delay={RING_DURATION_MS / 2} />
        <BlinkingDot />
      </View>

      {!!title && (
        <CustomText size="title" color="support_secondary" boldness="bold" classes="text-center mt-10 px-8">
          {title}
        </CustomText>
      )}
      {!!subtitle && (
        <CustomText color="gray_medium" boldness="regular" classes="text-center mt-2 px-8">
          {subtitle}
        </CustomText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    backgroundColor: 'rgba(27, 27, 27, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationArea: {
    width: RING_SIZE * 2,
    height: RING_SIZE * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(250, 187, 91, 0.55)',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
  },
});

export default ProcessingOverlay;
