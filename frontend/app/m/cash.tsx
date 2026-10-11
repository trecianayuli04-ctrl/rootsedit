import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { rp, useApi } from "@/src/api";
import { Badge, Btn, Card, Header, Icon, Page, sp, Stat, StateView, useStyles } from "@/src/ui";
import { useTheme } from "@/src/theme";

export default function CashOutlet() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, loading, error, reload } = useApi<any>("/cash/outlet");

  return (
    <Page>
      <Header back title="Kas Outlet" subtitle="Saldo kas fisik outlet · realtime" right={<Btn small variant="ghost" title="Segarkan" icon="refresh" testID="cash-refresh" onPress={reload} />} />
      {!data ? (
        <StateView loading={loading} error={error} onRetry={reload} />
      ) : !data.open ? (
        <View style={[s.center, { flex: 1 }]} testID="cash-closed-state">
          <Icon name="lock-closed-outline" size={40} color={colors.muted} />
          <Text style={[s.muted, { marginTop: sp.sm }]}>Kasir belum dibuka. Buka kasir untuk mulai mencatat kas outlet.</Text>
        </View>
      ) : (
        <FlatList
          data={data.history}
          keyExtractor={(h: any) => h.id}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + sp.xl }]}
          ListHeaderComponent={
            <View style={{ gap: sp.md }}>
              <Card testID="cash-balance-card" style={{ backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }}>
                <Text style={{ color: colors.onBrandPrimary, opacity: 0.85, fontWeight: "600" }}>Sisa Kas Tersedia</Text>
                <Text testID="cash-balance-value" style={{ color: colors.onBrandPrimary, fontSize: 34, fontWeight: "900", marginTop: 2 }}>{rp(data.balance)}</Text>
                <Text style={{ color: colors.onBrandPrimary, opacity: 0.85, marginTop: 4, fontSize: 12 }}>Dibuka oleh {data.opened_by || "-"}</Text>
              </Card>
              <View style={s.wrap}>
                <Stat label="Kas Awal" value={rp(data.opening_cash)} testID="cash-opening" icon="wallet-outline" />
                <Stat label="Uang Masuk (tunai)" value={rp(data.cash_in)} tone="success" testID="cash-in" icon="arrow-down-circle-outline" />
                <Stat label="Pengeluaran Kas" value={rp(data.cash_out)} tone="error" testID="cash-out" icon="arrow-up-circle-outline" />
              </View>
              <Card>
                <Text style={s.sub}>Rumus: saldo awal + uang masuk − pengeluaran kas outlet</Text>
                <Text style={[s.title, { marginTop: 4 }]}>{rp(data.opening_cash)} + {rp(data.cash_in)} − {rp(data.cash_out)} = {rp(data.balance)}</Text>
                <Text style={[s.sub, { marginTop: sp.sm }]}>Pengeluaran bersumber Finance tidak mengurangi saldo ini.</Text>
              </Card>
              <Text style={s.section}>Riwayat Perubahan Kas</Text>
            </View>
          }
          ListEmptyComponent={<StateView empty="Belum ada mutasi kas tunai" />}
          renderItem={({ item: h }: any) => (
            <Card style={[s.row, { justifyContent: "space-between" }]} testID={`cash-row-${h.id}`}>
              <View style={{ flex: 1 }}>
                <View style={[s.row, { gap: sp.sm }]}>
                  <Text style={s.title}>{h.category}</Text>
                  <Badge label={h.type === "income" ? "MASUK" : "KELUAR"} tone={h.type === "income" ? "success" : "error"} />
                </View>
                <Text style={s.sub} numberOfLines={1}>{h.date} · {h.time} · {h.user_name}{h.note ? ` · ${h.note}` : ""}</Text>
              </View>
              <Text style={[s.value, { color: h.type === "income" ? colors.success : colors.error }]}>{h.type === "income" ? "+" : "-"}{rp(h.amount)}</Text>
            </Card>
          )}
        />
      )}
    </Page>
  );
}
