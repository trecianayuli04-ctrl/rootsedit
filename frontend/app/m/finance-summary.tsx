import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { rp, useApi } from "@/src/api";
import { Card, Chips, Header, Page, sp, Stat, StateView, useStyles } from "@/src/ui";
import { useTheme } from "@/src/theme";

const CH_LABEL: Record<string, string> = { kasir: "Kasir", platform: "Aplikasi Eksternal" };

export default function FinanceSummary() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState("month");
  const { data, loading, error, reload } = useApi<any>(`/finance/summary?period=${period}`);

  return (
    <Page>
      <Header back title="Ringkasan Keuangan" subtitle="Omzet, alokasi dana & settlement" />
      <View style={{ marginHorizontal: 0 }}>
        <Chips testPrefix="fs-period" value={period} onChange={setPeriod} options={[{ label: "Harian", value: "day" }, { label: "Bulanan", value: "month" }]} />
      </View>
      {!data ? <StateView loading={loading} error={error} onRetry={reload} /> : (
        <ScrollView contentContainerStyle={[s.list, { paddingBottom: insets.bottom + sp.xl }]}>
          <Text style={s.section}>Omzet</Text>
          <View style={s.wrap}>
            <Stat label="Omzet Kotor" value={rp(data.omzet.gross)} tone="brand" testID="fs-gross" />
            <Stat label="Diskon" value={rp(data.omzet.discount)} testID="fs-discount" />
            <Stat label="Refund" value={rp(data.omzet.refund)} tone="error" testID="fs-refund" />
            <Stat label="Omzet Bersih" value={rp(data.omzet.net)} tone="success" testID="fs-net" />
            <Stat label="HPP" value={rp(data.omzet.hpp)} testID="fs-hpp" />
            <Stat label="Laba Kotor" value={rp(data.omzet.gross_profit)} tone="success" testID="fs-profit" />
          </View>
          <Text style={s.section}>Arus Kas</Text>
          <View style={s.wrap}>
            <Stat label="Pemasukan" value={rp(data.cashflow.income)} tone="success" />
            <Stat label="Pengeluaran" value={rp(data.cashflow.expense)} tone="error" />
            <Stat label="Cash Flow" value={rp(data.cashflow.net)} tone={data.cashflow.net >= 0 ? "success" : "error"} />
          </View>
          <Text style={s.section}>Per Metode Pembayaran</Text>
          {data.by_method.map((m: any) => (
            <Card key={m.method} style={[s.row, { justifyContent: "space-between" }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{m.method}</Text>
                <Text style={s.sub}>{m.count} transaksi · biaya {rp(m.fee)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.value}>{rp(m.total)}</Text>
                <Text style={s.sub}>bersih {rp(m.net)}</Text>
              </View>
            </Card>
          ))}
          <Text style={s.section}>Per Sumber (Channel)</Text>
          {data.by_channel.map((c: any) => (
            <Card key={c.channel} style={[s.row, { justifyContent: "space-between" }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{CH_LABEL[c.channel] || c.channel}</Text>
                <Text style={s.sub}>{c.count} transaksi · biaya/komisi {rp(c.fee)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.value}>{rp(c.gross)}</Text>
                <Text style={s.sub}>bersih {rp(c.net)}</Text>
              </View>
            </Card>
          ))}
          <Text style={s.section}>Alokasi Dana per Kantong</Text>
          <Text style={[s.sub, { marginBottom: sp.sm }]}>Alokasi = rencana dari omzet bersih (atur di Kantong Dana). Realisasi = pengeluaran aktual. Selisih = alokasi − realisasi.</Text>
          {data.pockets.map((p: any) => (
            <Card key={p.id} testID={`fs-pocket-${p.id}`}>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={[s.title, { flex: 1 }]}>{p.name}</Text>
                <Text style={[s.value, { color: p.diff >= 0 ? colors.success : colors.error }]}>{rp(p.diff)}</Text>
              </View>
              <Text style={s.sub}>Alokasi {rp(p.allocated)} · Realisasi {rp(p.actual)}{p.alloc_method === "percent" ? ` · ${p.alloc_value}% omzet` : p.alloc_method === "fixed" ? " · nominal tetap" : " · tanpa alokasi"}</Text>
            </Card>
          ))}
          <Text style={s.section}>Pengeluaran per Kategori</Text>
          {data.expenses_by_category.map((e: any) => (
            <View key={e.category} style={[s.row, { justifyContent: "space-between", paddingVertical: sp.xs }]}>
              <Text style={s.sub}>{e.category}</Text>
              <Text style={s.title}>{rp(e.amount)}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </Page>
  );
}
