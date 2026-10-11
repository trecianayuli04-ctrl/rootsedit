import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { rp, useApi } from "@/src/api";
import { SaleTickets } from "@/src/sale-tickets";
import { Badge, Card, Chips, Header, Icon, Page, Sheet, sp, Stat, StateView, useStyles } from "@/src/ui";
import { useTheme } from "@/src/theme";

const shift = (date: string, period: string, n: number) => {
  const d = new Date(date + "T00:00:00");
  if (period === "day") d.setDate(d.getDate() + n);
  else d.setMonth(d.getMonth() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function SalesHistory() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState("day");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState(() => shift(new Date().toISOString().slice(0, 10), "day", 0));
  const { data, loading, error, reload } = useApi<any>(`/sales?date=${date}&period=${period}&status=${status}`);
  const { data: settings } = useApi<any>("/settings");
  const [sel, setSel] = useState<any>(null);
  const r = data?.recap;

  return (
    <Page>
      <Header back title="Riwayat Nota" subtitle="Rekap per nota & keseluruhan" />
      <View style={[s.row, { paddingHorizontal: sp.lg, justifyContent: "space-between" }]}>
        <View style={{ flex: 1, marginLeft: -sp.lg }}>
          <Chips testPrefix="sales-period" value={period} onChange={setPeriod} options={[{ label: "Harian", value: "day" }, { label: "Bulanan", value: "month" }]} />
        </View>
        <Pressable testID="sales-prev-button" hitSlop={8} onPress={() => setDate(shift(date, period, -1))} style={{ padding: sp.sm }}><Icon name="chevron-back" size={22} color={colors.onSurface} /></Pressable>
        <Text style={s.title} testID="sales-range-text">{period === "day" ? date : date.slice(0, 7)}</Text>
        <Pressable testID="sales-next-button" hitSlop={8} onPress={() => setDate(shift(date, period, 1))} style={{ padding: sp.sm }}><Icon name="chevron-forward" size={22} color={colors.onSurface} /></Pressable>
      </View>
      <Chips testPrefix="sales-status" value={status} onChange={setStatus} options={[{ label: "Semua", value: "all" }, { label: "Lunas", value: "paid" }, { label: "Void", value: "void" }, { label: "Dibatalkan", value: "cancelled" }]} />
      <FlatList
        data={data?.sales || []}
        keyExtractor={(x) => x.id}
        onRefresh={reload}
        refreshing={false}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + sp.xl }]}
        ListHeaderComponent={
          !data ? <StateView loading={loading} error={error} onRetry={reload} /> : (
            <View style={{ gap: sp.md }}>
              <Text style={s.section}>Rekap Keseluruhan</Text>
              <View style={s.wrap}>
                <Stat label="Nota Lunas" value={String(r.nota)} testID="recap-nota" />
                <Stat label="Void / Batal" value={`${r.void} / ${r.cancelled}`} tone={r.void + r.cancelled ? "error" : undefined} testID="recap-void" />
                <Stat label="Omzet" value={rp(r.total)} tone="brand" testID="recap-total" />
                <Stat label="Pajak" value={rp(r.tax)} testID="recap-tax" />
                <Stat label="Diskon" value={rp(r.discount)} testID="recap-discount" />
                <Stat label="Laba Kotor" value={rp(r.profit)} tone="success" testID="recap-profit" />
              </View>
              {Object.entries(r.by_method).map(([k, v]: any) => (
                <View key={k} style={[s.row, { justifyContent: "space-between" }]}><Text style={s.sub}>{k}</Text><Text style={s.title}>{rp(v)}</Text></View>
              ))}
              <Text style={s.section}>Per Nota</Text>
            </View>
          )
        }
        ListEmptyComponent={data ? <StateView empty="Belum ada nota" /> : null}
        renderItem={({ item: x }) => {
          const st = x.status || "paid";
          return (
            <Card testID={`sale-row-${x.id}`} onPress={() => setSel(x)}>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={[s.title, { flex: 1 }]}>{x.number}</Text>
                <Badge label={st === "paid" ? "LUNAS" : st === "void" ? "VOID" : "BATAL"} tone={st === "paid" ? "success" : "error"} />
              </View>
              <Text style={s.sub} numberOfLines={1}>{x.date} {x.time} · {x.payment_method} · {x.customer || "-"} · {x.cashier_name}</Text>
              <Text style={s.sub} numberOfLines={1}>{x.items.map((i: any) => `${i.qty}x ${i.name}`).join(", ")}</Text>
              <Text style={[s.value, st !== "paid" && { textDecorationLine: "line-through", color: colors.muted }]}>{rp(x.total)}</Text>
            </Card>
          );
        }}
      />
      <Sheet visible={!!sel} onClose={() => setSel(null)} title="Detail Nota" testID="sale-detail-sheet">
        {sel && <SaleTickets sale={sel} settings={settings} onVoided={(v) => { setSel(v); reload(); }} />}
      </Sheet>
    </Page>
  );
}
