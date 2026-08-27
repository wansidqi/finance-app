import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Text, View } from "react-native";

const { width, height } = Dimensions.get("window");

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
    <View className="flex-1 bg-slate-950 items-center justify-center overflow-hidden">
      {/* Background Gradient Orbs */}
      <View
        className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20"
        style={{
          backgroundColor: "#10b981",
        }}
      />
      <View
        className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-10"
        style={{
          backgroundColor: "#f59e0b",
        }}
      />

      {/* Main Content */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
        }}
        className="items-center"
      >
        {/* Logo Container with Shimmer */}
        <View className="mb-8 relative">
          {/* Outer Glow Ring */}
          <Animated.View
            style={{
              opacity: shimmerOpacity,
            }}
            className="absolute inset-0 rounded-full border-2 border-emerald-500"
          />

          {/* Main Logo */}
          <View className="w-24 h-24 rounded-full bg-linear-to-br from-emerald-500 to-teal-600 items-center justify-center shadow-2xl border border-emerald-300/30">
            <Ionicons name="hand-right" size={48} color="#ffffff" />
          </View>

          {/* Accent Ring */}
          <View className="absolute inset-0 rounded-full border border-emerald-400/20" />
        </View>

        {/* Title */}
        <Text className="text-[32px] font-black text-white text-center tracking-tight mb-1">
          Zakat
        </Text>
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
        <Text className="text-[12px] text-slate-400 font-semibold uppercase tracking-widest">
          Loading Your Dashboard
        </Text>

        {/* Progress Bar */}
        <View className="mt-8 w-32 h-1.5 rounded-full bg-slate-700 overflow-hidden">
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

      {/* Bottom Text */}
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
        className="absolute bottom-16 items-center"
      >
        <Text className="text-[11px] text-slate-500 text-center max-w-xs">
          Manage your wealth, calculate zakat, track liabilities
        </Text>
      </Animated.View>

      {/* Version/Footer */}
      <View className="absolute bottom-4 items-center">
        <Text className="text-[10px] text-slate-600">v1.0.0</Text>
      </View>
    </View>
  );
}
