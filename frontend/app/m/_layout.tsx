import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/src/auth";

export default function ModuleLayout() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/login" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
