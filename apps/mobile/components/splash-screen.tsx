import { Image } from "expo-image";
import React, { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";

const splashImage = require("../assets/images/zakat-splash.jpeg");

export function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    // Main entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Shimmer effect loop
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      }),
    ).start();

    // Bouncing dots animation
    const animateDot = (anim: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: -12,
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

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.4, 1, 0.4],
  });

  return (
    <View className="flex-1 bg-slate-950 overflow-hidden">
      {/* Full-bleed background artwork */}
      <Image
        source={splashImage}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        contentFit="cover"
      />

      {/* Main Content — anchored low, in the artwork's open lower area */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
        }}
        className="flex-1 items-center justify-end pb-28"
      >
        {/* Title */}
        <Animated.View
          style={{ opacity: shimmerOpacity }}
          className="mb-1"
        >
          <Text className="text-[32px] font-black text-white text-center tracking-tight">Zakat</Text>
        </Animated.View>
        <Text className="text-[14px] font-semibold text-emerald-400 uppercase tracking-widest mb-12">
          Wealth Tracker
        </Text>

        {/* Loading Dots */}
        <View className="flex-row gap-3 mb-8 h-3">
          {dotAnim.map((anim, index) => (
            <Animated.View
              key={index}
              style={{
                transform: [{ translateY: anim }],
              }}
              className="w-3 h-3 rounded-full bg-emerald-500"
            />
          ))}
        </View>

        {/* Loading Text */}
        <Text className="text-[12px] text-slate-300 font-semibold uppercase tracking-widest">
          Loading Your Dashboard
        </Text>

        {/* Progress Bar */}
        <View className="mt-8 w-32 h-1.5 rounded-full bg-slate-700/80 overflow-hidden">
          <Animated.View
            style={{
              width: shimmerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            }}
            className="h-full bg-linear-to-r from-emerald-500 to-teal-500 rounded-full"
          />
        </View>
      </Animated.View>

      {/* Version/Footer */}
      <View className="absolute bottom-4 w-full items-center">
        <Text className="text-[10px] text-slate-400">v1.0.0</Text>
      </View>
    </View>
  );
}
