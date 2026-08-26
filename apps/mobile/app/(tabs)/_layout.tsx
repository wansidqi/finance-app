import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Platform, Text, View } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,

        tabBarStyle: {
          position: "absolute",
          bottom: 20,
          marginHorizontal: 12,
          height: 80,
          borderRadius: 24,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
        },

        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
        },

        tabBarIconStyle: {
          width: 54,
          height: 54,
        },

        tabBarBackground: () => (
          <View
            style={{
              flex: 1,
              overflow: "hidden",
              borderRadius: 24,
            }}
          >
            {Platform.OS === "ios" ? (
              <BlurView intensity={70} tint="dark" style={{ flex: 1 }} />
            ) : (
              <View
                style={{
                  flex: 1,
                  backgroundColor: "rgba(7, 11, 23, 0.97)",
                }}
              />
            )}

            {/* Enhanced gradient border with emerald glow */}
            <View
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 24,
                borderWidth: 2,
                borderColor: "rgba(16, 185, 129, 0.3)",
                opacity: 0.8,
              }}
            />

            {/* Subtle inner glow effect */}
            <View
              style={{
                position: "absolute",
                inset: 1,
                borderRadius: 23,
                borderWidth: 1,
                borderColor: "rgba(16, 185, 129, 0.1)",
              }}
            />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="stats-chart-outline"
              focused={focused}
              label="Dashboard"
              color="turquoise"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="asset"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="wallet-outline"
              focused={focused}
              label="Assets"
              color="emerald"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="liability"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="card-outline"
              focused={focused}
              label="Liabilities"
              color="rose"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="zakat-tracker"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="notifications-sharp"
              focused={focused}
              label="Zakat"
              color="amber"
            />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  icon,
  focused,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  label: string;
  color: "emerald" | "rose" | "amber" | "turquoise";
}) {
  const colorMap = {
    emerald: { bg: "rgba(16, 185, 129", gradient: "#10b981", light: "#d1fae5" },
    turquoise: { bg: "rgba(2, 132, 199", gradient: "#0284c7", light: "#c4e3f3" },
    rose: { bg: "rgba(244, 63, 94", gradient: "#f43f5e", light: "#ffe4e6" },
    amber: { bg: "rgba(245, 158, 11", gradient: "#f59e0b", light: "#fef3c7" },
  };

  const theme = colorMap[color];

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
      }}
    >
      <View
        style={{
          height: 56,
          width: 56,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: focused ? `${theme.bg}, 0.95)` : `${theme.bg}, 0.1)`,
          borderWidth: focused ? 0 : 2,
          borderColor: focused ? "transparent" : `${theme.bg}, 0.3)`,
          elevation: focused ? 12 : 4,
          shadowColor: focused ? theme.gradient : "#000000",
          shadowOffset: { width: 0, height: focused ? 6 : 2 },
          shadowOpacity: focused ? 0.5 : 0.15,
          shadowRadius: focused ? 12 : 6,
        }}
      >
        <Ionicons
          name={icon}
          size={26}
          color={focused ? "#ffffff" : theme.gradient}
        />
      </View>
      {focused && (
        <Text
          style={{
            fontSize: 10,
            fontWeight: "700",
            color: theme.gradient,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {label}
        </Text>
      )}
      {focused && (
        <View
          style={{
            height: 2,
            width: 20,
            backgroundColor: theme.gradient,
            borderRadius: 1,
            marginTop: 2,
          }}
        />
      )}
    </View>
  );
}
