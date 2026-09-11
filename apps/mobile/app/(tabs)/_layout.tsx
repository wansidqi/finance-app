import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACCENT = "#663af3";
const INACTIVE = "#9da7ba";

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
          backgroundColor: "#05060f",
          borderTopWidth: 1,
          borderTopColor: "rgba(186, 215, 247, 0.12)",
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
            <TabIcon icon="stats-chart-outline" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="asset"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="wallet-outline" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="transactions"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="receipt-outline" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="liability"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="card-outline" focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="document-vault"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="lock-closed-outline" focused={focused} />
          ),
        }}
      />

      {/* Reachable via the Dashboard's Nisab Status "View Details" link and
          the Quick Actions "Zakat" button — hidden here to keep the tab bar
          lean. href: null removes it from the bar without removing the route. */}
      <Tabs.Screen name="zakat-tracker" options={{ href: null }} />

    </Tabs>
  );
}

function TabIcon({
  icon,
  focused,
}: {
  icon: keyof typeof Ionicons.glyphMap;
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
      <Ionicons name={icon} size={24} color={focused ? ACCENT : INACTIVE} />
    </View>
  );
}
