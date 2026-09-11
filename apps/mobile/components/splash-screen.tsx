import React, { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";

export function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      }),
    ).start();

    const animateDot = (anim: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: -10,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ),
      ]);
    };

    dotAnim.forEach((anim, index) => {
      animateDot(anim, index * 100).start();
    });
  }, []);

  return (
    <View className="flex-1 bg-canvas overflow-hidden items-center justify-center">
      {/* Ambient spotlight halo behind the wordmark — stand-in for the
          reference's conic-gradient spotlight, built from stacked soft
          circles since RN has no conic-gradient primitive. */}
      <View className="absolute h-[420px] w-[420px] rounded-full bg-violet/5" />
      <View className="absolute h-[280px] w-[280px] rounded-full bg-violet/6" />
      <View className="absolute h-[160px] w-[160px] rounded-full bg-violet/8" />

      <Animated.View
        style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}
        className="items-center"
      >
        <Text className="font-display text-[44px] text-ice text-center">
          Zakat Tracker
        </Text>
        <Text className="font-mono text-[12px] uppercase tracking-[3px] text-mist mt-2">
          Wealth, Tracked
        </Text>

        <View className="flex-row gap-3 mt-16 mb-6 h-3">
          {dotAnim.map((anim, index) => (
            <Animated.View
              key={index}
              style={{ transform: [{ translateY: anim }] }}
              className="w-2.5 h-2.5 rounded-full bg-frost"
            />
          ))}
        </View>

        <Text className="font-mono text-[11px] text-fog uppercase tracking-[2px]">
          Loading Your Dashboard
        </Text>

        <View className="mt-6 w-32 h-1.5 rounded-full bg-luminous-fill overflow-hidden">
          <Animated.View
            style={{
              width: shimmerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            }}
            className="h-full bg-linear-to-r from-ice to-frost rounded-full"
          />
        </View>
      </Animated.View>

      <View className="absolute bottom-4 w-full items-center">
        <Text className="font-sans text-[10px] text-fog">v1.0.0</Text>
      </View>
    </View>
  );
}
