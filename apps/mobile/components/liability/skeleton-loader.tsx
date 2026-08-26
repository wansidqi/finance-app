import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

// Skeleton loader animation
function AnimatedSkeleton() {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3],
  });

  return { opacity };
}

// Liability Card Skeleton
export function LiabilityCardSkeleton() {
  const { opacity } = AnimatedSkeleton();

  return (
    <Animated.View
      style={{ opacity }}
      className="mb-5 rounded-3xl overflow-hidden"
    >
      <View className="bg-slate-700/30 px-6 py-6 border border-slate-600/50">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="h-6 bg-slate-600 rounded-full w-24" />
        </View>

        {/* Name */}
        <View className="mb-4">
          <View className="h-7 bg-slate-600 rounded-md w-40" />
        </View>

        {/* Balance and Payment */}
        <View className="flex-row justify-between items-start mb-4 gap-2">
          <View className="flex-1">
            <View className="h-3 bg-slate-600 rounded-md mb-2" />
            <View className="h-6 bg-slate-600 rounded-md" />
          </View>
          <View className="flex-1">
            <View className="h-3 bg-slate-600 rounded-md mb-2" />
            <View className="h-6 bg-slate-600 rounded-md" />
          </View>
        </View>

        {/* Commitment Card */}
        <View className="mb-4 bg-slate-600/20 rounded-2xl px-4 py-3.5 flex-row items-center justify-between border border-slate-600/50">
          <View className="flex-1">
            <View className="h-3 bg-slate-600 rounded-md mb-2 w-24" />
            <View className="h-7 bg-slate-600 rounded-md w-16" />
          </View>
          <View className="h-8 bg-slate-600 rounded-md w-8" />
        </View>

        {/* Progress Bar */}
        <View className="mb-4">
          <View className="h-2 rounded-full bg-slate-600" />
        </View>

        {/* Payment Section */}
        <View className="mt-4">
          <View className="h-3 bg-slate-600 rounded-md mb-2 w-24" />
          <View className="flex-row gap-2.5">
            <View className="flex-1 h-10 bg-slate-600 rounded-lg" />
            <View className="h-10 bg-slate-600 rounded-lg w-16" />
          </View>
        </View>

        {/* Pay Button */}
        <View className="mt-4 h-12 bg-slate-600 rounded-lg" />
      </View>
    </Animated.View>
  );
}

// Multiple liability skeletons container
export function LiabilitySkeletonLoader() {
  return (
    <View className="px-6">
      <LiabilityCardSkeleton />
      <LiabilityCardSkeleton />
      <LiabilityCardSkeleton />
    </View>
  );
}
