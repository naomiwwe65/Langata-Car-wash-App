import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

type Bubble = {
  left: number;
  size: number;
  durationMs: number;
  delayMs: number;
  startY: number;
  endY: number;
  color: string;
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function WaterBackground() {
  const bubbles = useMemo<Bubble[]>(() => {
    const count = 16;
    const items: Bubble[] = [];
    for (let i = 0; i < count; i += 1) {
      const size = Math.round(8 + Math.random() * 22); // 8 - 30
      const left = Math.max(0, Math.min(screenWidth - size, Math.random() * screenWidth));
      const durationMs = Math.round(9000 + Math.random() * 9000); // 9s - 18s
      const delayMs = Math.round(Math.random() * 6000);
      const startY = screenHeight + Math.random() * screenHeight * 0.3; // start off-screen
      const endY = -size * 2; // float past the top
      const blue = 'rgba(59, 130, 246, 0.12)';
      const teal = 'rgba(45, 212, 191, 0.10)';
      const color = Math.random() > 0.5 ? blue : teal;
      items.push({ left, size, durationMs, delayMs, startY, endY, color });
    }
    return items;
  }, []);

  const animatedValues = useRef(bubbles.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = animatedValues.map((val, idx) => {
      const { durationMs, delayMs } = bubbles[idx];
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(val, {
            toValue: 1,
            duration: durationMs,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        { resetBeforeIteration: true }
      );
      return loop;
    });
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [animatedValues, bubbles]);

  return (
    <View pointerEvents="none" style={styles.container}>
      {bubbles.map((b, idx) => {
        const translateY = animatedValues[idx].interpolate({
          inputRange: [0, 1],
          outputRange: [b.startY, b.endY],
        });
        const opacity = animatedValues[idx].interpolate({
          inputRange: [0, 0.1, 0.9, 1],
          outputRange: [0, 0.6, 0.6, 0],
        });
        const scale = animatedValues[idx].interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.8, 1, 0.9],
        });
        return (
          <Animated.View
            key={`bubble-${idx}`}
            style={[
              styles.bubble,
              {
                left: b.left,
                width: b.size,
                height: b.size,
                backgroundColor: b.color,
                transform: [{ translateY }, { scale }],
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  bubble: {
    position: 'absolute',
    top: 0,
    borderRadius: 999,
  },
});



