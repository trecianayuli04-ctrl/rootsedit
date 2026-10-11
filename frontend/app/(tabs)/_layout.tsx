import { Redirect, Tabs } from "expo-router";
import { Platform } from "react-native";

import { useAuth } from "@/src/auth";
import { usesNativeTabs } from "@/src/navigation";
import { Icon } from "@/src/ui";
import { useTheme } from "@/src/theme";

function NativeTabsLayout({ showPos, showStock, tint }: { showPos: boolean; showStock: boolean; tint: string }) {
  // Imported lazily so the iOS-only unstable module is never evaluated on web/android.
  const { NativeTabs } = require("expo-router/unstable-native-tabs");
  return (
    <NativeTabs tintColor={tint}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="house.fill" />
        <NativeTabs.Trigger.Label>Beranda</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pos" hidden={!showPos}>
        <NativeTabs.Trigger.Icon sf="cart.fill" />
        <NativeTabs.Trigger.Label>Kasir</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stock" hidden={!showStock}>
        <NativeTabs.Trigger.Icon sf="shippingbox.fill" />
        <NativeTabs.Trigger.Label>Stok</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Icon sf="square.grid.2x2.fill" />
        <NativeTabs.Trigger.Label>Lainnya</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

export default function TabsLayout() {
  const { can, user } = useAuth();
  const { colors } = useTheme();
  if (!user) return <Redirect href="/login" />;
  const showPos = can("pos");
  const showStock = can("inventory_view");

  if (usesNativeTabs) {
    return <NativeTabsLayout showPos={showPos} showStock={showStock} tint={colors.brandPrimary} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, ...(Platform.OS === "web" ? { height: 64 } : {}) },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Beranda", tabBarButtonTestID: "tab-home", tabBarIcon: ({ color, focused }) => <Icon name={focused ? "home" : "home-outline"} size={24} color={color} /> }} />
      <Tabs.Screen name="pos" options={{ title: "Kasir", href: showPos ? undefined : null, tabBarButtonTestID: "tab-pos", tabBarIcon: ({ color, focused }) => <Icon name={focused ? "cart" : "cart-outline"} size={24} color={color} /> }} />
      <Tabs.Screen name="stock" options={{ title: "Stok", href: showStock ? undefined : null, tabBarButtonTestID: "tab-stock", tabBarIcon: ({ color, focused }) => <Icon name={focused ? "cube" : "cube-outline"} size={24} color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: "Lainnya", tabBarButtonTestID: "tab-more", tabBarIcon: ({ color, focused }) => <Icon name={focused ? "grid" : "grid-outline"} size={24} color={color} /> }} />
    </Tabs>
  );
}
