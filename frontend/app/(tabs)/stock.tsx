import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, num, rp, useApi } from "@/src/api";
import { useAuth } from "@/src/auth";
import { LOCS, usesNativeTabs } from "@/src/navigation";
import { Badge, Btn, Card, Chips, Field, Header, Page, Sheet, sp, StateView, useStyles, useToast } from "@/src/ui";


export default function Stock() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { can } = useAuth();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const { data, loading, error, reload } = useApi<any[]>("/ingredients");
  const [filter, setFilter] = useState("all");
  const [sel, setSel] = useState<any>(null);
  const [type, setType] = useState("in");
  const [loc, setLoc] = useState("gudang");
  const [to, setTo] = useState("bar");
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const list = (data || []).filter((i) => (filter === "all" ? true : filter === "low" ? i.low : i.stock[filter] > 0));

  const submit = async () => {
    setBusy(true);
    try {
      await api("/inventory/move", { body: { ingredient_id: sel.id, type, qty: num(qty), location: loc, to_location: type === "transfer" ? to : null, note, total_cost: num(cost) } });
      toast("Stok diperbarui");
      setSel(null);
      setQty("");
      setCost("");
      setNote("");
      reload();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Header title="Inventory" subtitle="Stok per lokasi · ketuk bahan untuk mutasi" />
      <Chips testPrefix="stock-filter" value={filter} onChange={setFilter} options={[{ label: "Semua", value: "all" }, ...LOCS, { label: "Stok Rendah", value: "low" }]} />
      {!data ? (
        <StateView loading={loading} error={error} onRetry={reload} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(i) => i.id}
          onRefresh={reload}
          refreshing={false}
          contentContainerStyle={[s.list, { paddingBottom: bottomChrome + sp.xl }]}
          ListEmptyComponent={<StateView empty="Stok kosong" />}
          renderItem={({ item: i }) => (
            <Card testID={`stock-item-${i.id}`} onPress={can("inventory_move") ? () => setSel(i) : undefined}>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={[s.title, { flex: 1 }]}>{i.name}</Text>
                {i.low ? <Badge label="STOK RENDAH" tone="error" /> : <Badge label="Aman" tone="success" />}
              </View>
              <Text style={s.sub}>
                Gudang {i.stock.gudang} · Bar {i.stock.bar} · Kitchen {i.stock.kitchen} {i.unit}
              </Text>
              <Text style={s.sub}>
                Total {i.total} {i.unit} · Min {i.min_stock} · {rp(i.cost_per_unit)}/{i.unit}
              </Text>
            </Card>
          )}
        />
      )}
      <Sheet visible={!!sel} onClose={() => setSel(null)} title={`Mutasi: ${sel?.name ?? ""}`} testID="stock-move-sheet">
        <View style={{ marginHorizontal: -sp.lg }}>
          <Chips testPrefix="move-type" value={type} onChange={setType} options={[{ label: "Stok Masuk", value: "in" }, { label: "Stok Keluar", value: "out" }, { label: "Transfer", value: "transfer" }]} />
          <Text style={[s.section, { marginHorizontal: sp.lg }]}>{type === "transfer" ? "Dari lokasi" : "Lokasi"}</Text>
          <Chips testPrefix="move-loc" value={loc} onChange={setLoc} options={LOCS} />
          {type === "transfer" && (
            <>
              <Text style={[s.section, { marginHorizontal: sp.lg }]}>Ke lokasi</Text>
              <Chips testPrefix="move-to" value={to} onChange={setTo} options={LOCS} />
            </>
          )}
        </View>
        <Field label={`Jumlah (${sel?.unit ?? ""})`} testID="move-qty-input" keyboardType="numeric" value={qty} onChangeText={setQty} />
        {type === "in" && <Field label="Total biaya (opsional, masuk ke pengeluaran)" testID="move-cost-input" keyboardType="numeric" value={cost} onChangeText={setCost} />}
        <Field label="Catatan" testID="move-note-input" value={note} onChangeText={setNote} />
        <Btn title="Simpan" testID="move-submit-button" loading={busy} disabled={!num(qty)} onPress={submit} />
      </Sheet>
    </Page>
  );
}
