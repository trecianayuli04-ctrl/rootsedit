import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, num, rp, useApi } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Badge, Btn, Card, Chips, Field, Header, Page, Sheet, sp, StateView, useStyles, useToast } from "@/src/ui";

const d = (offset = 0) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

export default function Marketing() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user } = useAuth();
  const editable = user?.role === "owner" || user?.role === "marketing" || user?.role === "manager";
  const { data, loading, error, reload } = useApi<any[]>("/promos");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", kind: "promo", discount_type: "percent", value: "", start_date: d(), end_date: d(30), description: "", budget: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (v: string) => setF({ ...f, [k]: v });

  const submit = async () => {
    setBusy(true);
    try {
      await api("/promos", { body: { ...f, value: num(f.value), budget: num(f.budget), is_active: true } });
      toast("Promo/campaign dibuat");
      setOpen(false);
      setF({ ...f, name: "", value: "", description: "", budget: "" });
      reload();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const toggle = async (p: any) => {
    try {
      await api(`/promos/${p.id}`, { method: "PUT", body: { ...p, is_active: !p.is_active } });
      reload();
    } catch (e: any) {
      toast(e.message, "error");
    }
  };

  return (
    <Page>
      <Header back title="Marketing" subtitle="Promo, diskon & campaign" right={editable ? <Btn small title="Buat" icon="add" testID="promo-add-button" onPress={() => setOpen(true)} /> : undefined} />
      {!data ? <StateView loading={loading} error={error} onRetry={reload} /> : (
        <FlatList
          data={data}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + sp.xl }]}
          ListEmptyComponent={<StateView empty="Belum ada promo" />}
          renderItem={({ item: p }) => (
            <Card testID={`promo-item-${p.id}`}>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={[s.title, { flex: 1 }]}>{p.name}</Text>
                <Badge label={p.kind.toUpperCase()} tone="brand" />
                <Badge label={p.is_active ? "AKTIF" : "NONAKTIF"} tone={p.is_active ? "success" : "muted"} />
              </View>
              <Text style={s.sub}>
                {p.kind === "promo" ? (p.discount_type === "percent" ? `Diskon ${p.value}%` : `Potongan ${rp(p.value)}`) : p.description} · {p.start_date} s/d {p.end_date}
              </Text>
              <Text style={s.sub}>Dipakai {p.usage}x · Omzet {rp(p.revenue)} · Diskon {rp(p.discount_given)}</Text>
              {editable && <Btn small variant="ghost" title={p.is_active ? "Nonaktifkan" : "Aktifkan"} style={{ marginTop: sp.sm, alignSelf: "flex-start" }} testID={`promo-toggle-${p.id}`} onPress={() => toggle(p)} />}
            </Card>
          )}
        />
      )}
      <Sheet visible={open} onClose={() => setOpen(false)} title="Promo / Campaign Baru" testID="promo-sheet">
        <View style={{ marginHorizontal: -sp.lg }}>
          <Chips testPrefix="promo-kind" value={f.kind} onChange={set("kind")} options={[{ label: "Promo Kasir", value: "promo" }, { label: "Campaign", value: "campaign" }]} />
          {f.kind === "promo" && <Chips testPrefix="promo-dtype" value={f.discount_type} onChange={set("discount_type")} options={[{ label: "Persen %", value: "percent" }, { label: "Nominal Rp", value: "nominal" }]} />}
        </View>
        <Field label="Nama" testID="promo-name-input" value={f.name} onChangeText={set("name")} />
        {f.kind === "promo" && <Field label={f.discount_type === "percent" ? "Diskon (%)" : "Potongan (Rp)"} testID="promo-value-input" keyboardType="numeric" value={f.value} onChangeText={set("value")} />}
        <View style={s.row}>
          <View style={{ flex: 1 }}><Field label="Mulai (YYYY-MM-DD)" testID="promo-start-input" value={f.start_date} onChangeText={set("start_date")} /></View>
          <View style={{ flex: 1 }}><Field label="Selesai" testID="promo-end-input" value={f.end_date} onChangeText={set("end_date")} /></View>
        </View>
        <Field label="Budget (Rp, masuk pengeluaran Marketing)" testID="promo-budget-input" keyboardType="numeric" value={f.budget} onChangeText={set("budget")} />
        <Field label="Deskripsi" testID="promo-desc-input" value={f.description} onChangeText={set("description")} />
        <Btn title="Simpan" testID="promo-submit-button" loading={busy} disabled={!f.name} onPress={submit} />
      </Sheet>
    </Page>
  );
}
