import { useState } from "react";
import { ScrollView, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { rp, useApi } from "@/src/api";
import { Card, Chips, Header, Icon, Page, sp, Stat, StateView, useStyles } from "@/src/ui";
import { useTheme } from "@/src/theme";

const shift = (date: string, period: string, n: number) => {
  const d = new Date(date + "T00:00:00");
  if (period === "day") d.setDate(d.getDate() + n);
  else d.setMonth(d.getMonth() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function SalesRecap() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState("day");
  const [date, setDate] = useState(() => shift(new Date().toISOString().slice(0, 10), "day", 0));
  const { data, loading, error, reload } = useApi<any>(`/sales/recap?period=${period}&date=${date}`);

  const sel = data?.kas?.selisih ?? 0;
  const selColor = sel === 0 ? colors.success : sel < 0 ? colors.error : colors.brandPrimary;
  const maxHour = Math.max(1, ...((data?.busy_hours || []).map((h: any) => h.count)));

  return (
    <Page>
      <Header back title="Rekap Penjualan" subtitle="Ringkas · omzet, selisih kas, terlaris & jam ramai" />
      <View style={[s.row, { paddingHorizontal: sp.lg, justifyContent: "space-between" }]}>
        <View style={{ flex: 1, marginLeft: -sp.lg }}>
          <Chips testPrefix="recap-period" value={period} onChange={setPeriod} options={[{ label: "Harian", value: "day" }, { label: "Bulanan", value: "month" }]} />
        </View>
        <Pressable testID="recap-prev-button" hitSlop={8} onPress={() => setDate(shift(date, period, -1))} style={{ padding: sp.sm }}><Icon name="chevron-back" size={22} color={colors.onSurface} /></Pressable>
        <Text style={s.title} testID="recap-range-text">{period === "day" ? date : date.slice(0, 7)}</Text>
        <Pressable testID="recap-next-button" hitSlop={8} onPress={() => setDate(shift(date, period, 1))} style={{ padding: sp.sm }}><Icon name="chevron-forward" size={22} color={colors.onSurface} /></Pressable>
      </View>
      {!data ? <StateView loading={loading} error={error} onRetry={reload} /> : (
        <ScrollView contentContainerStyle={[s.list, { paddingBottom: insets.bottom + sp.xl }]}>
          <Text style={s.section}>Ringkasan</Text>
          <View style={s.wrap}>
            <Stat label="Omzet" value={rp(data.omzet)} tone="brand" testID="recap-omzet" />
            <Stat label="Transaksi" value={String(data.trx)} testID="recap-trx" />
            <Stat label="Laba Kotor" value={rp(data.profit)} tone="success" testID="recap-profit" />
            <Stat label="Void / Batal" value={`${data.void} / ${data.cancelled}`} tone={data.void + data.cancelled ? "error" : undefined} testID="recap-void" />
          </View>

          <Text style={s.section}>Selisih Kas</Text>
          <Card testID="recap-kas-card" style={{ borderColor: selColor, borderWidth: 1, gap: sp.xs }}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={s.title}>{sel === 0 ? "Kas Balance" : sel < 0 ? "Kas Kurang (minus)" : "Kas Lebih"}</Text>
              <Text style={[s.value, { fontSize: 22, color: selColor }]} testID="recap-selisih">{sel > 0 ? "+" : ""}{rp(sel)}</Text>
            </View>
            <Text style={s.sub}>Kas Sistem {rp(data.kas.kas_sistem)} · Kas Aktual {rp(data.kas.kas_aktual)} · {data.kas.closes}x tutup kasir</Text>
          </Card>
          {(data.closes_detail || []).map((c: any, i: number) => (
            <View key={i} style={[s.row, { justifyContent: "space-between", paddingVertical: sp.xs }]} testID={`recap-close-${i}`}>
              <View style={{ flex: 1 }}>
                <Text style={s.sub}>{c.time} · {c.user_name}</Text>
                {!!c.selisih_note && <Text style={[s.sub, { fontSize: 11 }]}>{c.selisih_note}</Text>}
              </View>
              <Text style={[s.title, { color: c.selisih === 0 ? colors.success : c.selisih < 0 ? colors.error : colors.brandPrimary }]}>{c.selisih > 0 ? "+" : ""}{rp(c.selisih)}</Text>
            </View>
          ))}

          <Text style={s.section}>Top 5 Terlaris</Text>
          {(data.top_products || []).length === 0 && <Text style={s.muted}>Belum ada penjualan</Text>}
          {(data.top_products || []).map((p: any, i: number) => (
            <Card key={p.name} style={[s.row, { justifyContent: "space-between" }]} testID={`recap-top-${i}`}>
              <View style={[s.row, { flex: 1, gap: sp.sm }]}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: i === 0 ? colors.brandPrimary : colors.surfaceTertiary, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontWeight: "800", color: i === 0 ? colors.onBrandPrimary : colors.onSurface }}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.title} numberOfLines={1}>{p.name}</Text>
                  <Text style={s.sub}>{p.qty} terjual</Text>
                </View>
              </View>
              <Text style={s.value}>{rp(p.omzet)}</Text>
            </Card>
          ))}

          <Text style={s.section}>Jam Ramai{data.peak_hour ? ` · puncak ${String(data.peak_hour.hour).padStart(2, "0")}:00` : ""}</Text>
          {(data.busy_hours || []).length === 0 && <Text style={s.muted}>Belum ada orderan</Text>}
          {(data.busy_hours || []).map((h: any) => (
            <View key={h.hour} style={[s.row, { gap: sp.sm, paddingVertical: 3 }]} testID={`recap-hour-${h.hour}`}>
              <Text style={[s.sub, { width: 44 }]}>{String(h.hour).padStart(2, "0")}:00</Text>
              <View style={{ flex: 1, height: 14, backgroundColor: colors.surfaceTertiary, borderRadius: 7, overflow: "hidden" }}>
                <View style={{ width: `${Math.round((h.count / maxHour) * 100)}%`, height: 14, backgroundColor: data.peak_hour && h.hour === data.peak_hour.hour ? colors.brandPrimary : colors.brandSecondary || colors.brandPrimary, borderRadius: 7 }} />
              </View>
              <Text style={[s.sub, { width: 64, textAlign: "right" }]}>{h.count} order</Text>
            </View>
          ))}

          <Text style={s.section}>Per Metode Bayar</Text>
          {(data.by_method || []).map((m: any) => (
            <View key={m.method} style={[s.row, { justifyContent: "space-between", paddingVertical: sp.xs }]}>
              <Text style={s.sub}>{m.method}</Text>
              <Text style={s.title}>{rp(m.total)}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </Page>
  );
}
