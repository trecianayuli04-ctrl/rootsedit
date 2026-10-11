import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ROLE_LABEL, useAuth } from "@/src/auth";
import { MODULES, usesNativeTabs } from "@/src/navigation";
import { Btn, Card, Header, Icon, Page, sp, useStyles } from "@/src/ui";
import { useTheme } from "@/src/theme";

export default function More() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, can, logout } = useAuth();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  return (
    <Page>
      <Header title="Lainnya" subtitle="Semua modul sesuai jabatan Anda" />
      <ScrollView contentContainerStyle={[s.list, { paddingBottom: bottomChrome + sp.xl }]}>
        <Card testID="profile-card">
          <Text style={s.title}>{user?.name}</Text>
          <Text style={s.sub}>
            {user?.email} · {ROLE_LABEL[user!.role]}
          </Text>
        </Card>
        <View style={{ gap: sp.sm }}>
          {MODULES.filter((m) => can(m.perm)).map((m) => (
            <Card key={m.key} testID={`module-${m.key}`} onPress={() => router.push(m.route as any)} style={[s.row, { paddingVertical: sp.md }]}>
              <Icon name={m.icon as any} size={22} color={colors.brandPrimary} />
              <Text style={[s.title, { flex: 1 }]}>{m.title}</Text>
              <Icon name="chevron-forward" size={20} color={colors.muted} />
            </Card>
          ))}
        </View>
        <Btn title="Keluar" variant="ghost" icon="log-out-outline" testID="logout-button" onPress={logout} />
      </ScrollView>
    </Page>
  );
}
