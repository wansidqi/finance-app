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

// Asset Card Skeleton
export function AssetCardSkeleton() {
  const { opacity } = AnimatedSkeleton();

  return (
    <Animated.View
      style={{ opacity }}
      className="w-80 rounded-card bg-glass-surface p-6 mr-4 border border-glass-edge"
    >
      <View className="mb-4">
        <View className="h-6 bg-white/10 rounded-md mb-2 w-24" />
        <View className="h-8 bg-white/10 rounded-md w-32" />
      </View>

      <View className="mb-4 gap-2">
        <View className="h-4 bg-white/10 rounded-md w-full" />
        <View className="h-4 bg-white/10 rounded-md w-3/4" />
      </View>

      <View className="mb-4 flex-row justify-between gap-3">
        <View className="flex-1">
          <View className="h-3 bg-white/10 rounded-md mb-2 w-20" />
          <View className="h-6 bg-white/10 rounded-md" />
        </View>
        <View className="flex-1">
          <View className="h-3 bg-white/10 rounded-md mb-2 w-20" />
          <View className="h-6 bg-white/10 rounded-md" />
        </View>
      </View>

      <View className="h-2 bg-white/10 rounded-full mb-3" />

      <View className="flex-row gap-2">
        <View className="flex-1 h-10 bg-white/10 rounded-button" />
        <View className="h-10 bg-white/10 rounded-button w-16" />
      </View>
    </Animated.View>
  );
}

// Multiple asset skeletons container
export function AssetSkeletonLoader() {
  return (
    <View className="flex-row px-6 gap-4">
      <AssetCardSkeleton />
      <AssetCardSkeleton />
      <AssetCardSkeleton />
    </View>
  );
}
