import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACCENT = "#34d399";
const INACTIVE = "#64748b";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const barHeight = 52 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,

        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: barHeight,
          paddingTop: 10,
          paddingBottom: insets.bottom,
          backgroundColor: "#020617",
          borderTopWidth: 1,
          borderTopColor: "rgba(255, 255, 255, 0.08)",
          elevation: 0,
        },

        tabBarItemStyle: {
          height: 42,
          justifyContent: "center",
          alignItems: "center",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="stats-chart-outline"
              activeIcon="stats-chart"
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="asset"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="wallet-outline" activeIcon="wallet" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="liability"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="card-outline" activeIcon="card" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="zakat-tracker"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="moon-outline" activeIcon="moon" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  icon,
  activeIcon,
  focused,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  focused: boolean;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        width: 60,
        height: 42,
      }}
    >
      <Ionicons
        name={focused ? activeIcon : icon}
        size={24}
        color={focused ? ACCENT : INACTIVE}
      />
    </View>
  );
}
