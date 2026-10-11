import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, num, rp, useApi } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Badge, Btn, Card, Chips, Field, Header, Icon, Page, Sheet, sp, StateView, STATUS_TONE, useStyles, useToast } from "@/src/ui";
import { useTheme } from "@/src/theme";

export default function Purchasing() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { can } = useAuth();
  const { auto } = useLocalSearchParams<{ auto?: string }>();
  const { data, loading, error, reload } = useApi<any[]>("/purchasing");
  const { data: ings } = useApi<any[]>("/ingredients");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ ingredient_id: string; qty: number; name: string; unit: string }[]>([]);
  const [ing, setIng] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const fillLow = () => {
    const low = (ings || []).filter((i) => i.low);
    setItems(low.map((i) => ({ ingredient_id: i.id, qty: Math.max(i.min_stock * 2 - i.total, 0), name: i.name, unit: i.unit })));
    setNote("Restock stok rendah");
    setOpen(true);
  };
  useEffect(() => {
    if (auto && ings) fillLow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, ings]);

  const addItem = () => {
    const i = ings?.find((x) => x.id === ing);
    if (!i || !num(qty)) return;
    setItems([...items.filter((x) => x.ingredient_id !== ing), { ingredient_id: ing, qty: num(qty), name: i.name, unit: i.unit }]);
    setQty("");
  };
  const submit = async () => {
    setBusy(true);
    try {
      await api("/purchasing", { body: { items: items.map(({ ingredient_id, qty }) => ({ ingredient_id, qty })), note } });
      toast("Purchasing request diajukan");
      setOpen(false);
      setItems([]);
      setNote("");
      reload();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const act = async (path: string, body: any, msg: string) => {
    try {
      await api(path, { body });
      toast(msg);
      reload();
    } catch (e: any) {
      toast(e.message, "error");
    }
  };

  return (
    <Page>
      <Header back title="Purchasing" subtitle="Pengajuan & approval pembelian" right={<Btn small title="Ajukan" icon="add" testID="pr-add-button" onPress={() => { setIng(ings?.[0]?.id ?? ""); setOpen(true); }} />} />
      {!data ? <StateView loading={loading} error={error} onRetry={reload} /> : (
        <FlatList
          data={data}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + sp.xl }]}
          ListHeaderComponent={(ings || []).some((i) => i.low) ? <Btn title="Buat PR dari Stok Rendah" variant="secondary" icon="flash-outline" testID="pr-from-low-button" onPress={fillLow} /> : null}
          ListEmptyComponent={<StateView empty="Belum ada purchasing request" />}
          renderItem={({ item: p }) => (
            <Card testID={`pr-item-${p.id}`}>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={s.title}>{p.number}</Text>
                <Badge label={p.status.toUpperCase()} tone={STATUS_TONE[p.status]} />
              </View>
              {p.items.map((i: any) => <Text key={i.ingredient_id} style={s.sub}>• {i.name}: {i.qty} {i.unit} (~{rp(i.est_price)})</Text>)}
              <Text style={s.sub}>Oleh {p.requested_by} · {p.date}{p.approved_by ? ` · diputuskan ${p.approved_by}` : ""}</Text>
              <Text style={s.value}>{rp(p.total_paid ?? p.est_total)}</Text>
              <View style={[s.row, { marginTop: sp.sm, flexWrap: "wrap" }]}>
                {p.status === "pending" && can("purchase_approve") && (
                  <>
                    <Btn small title="Setujui" variant="success" testID={`pr-approve-${p.id}`} onPress={() => act(`/purchasing/${p.id}/decide`, { approve: true }, "PR disetujui")} />
                    <Btn small title="Tolak" variant="ghost" testID={`pr-reject-${p.id}`} onPress={() => act(`/purchasing/${p.id}/decide`, { approve: false }, "PR ditolak")} />
                  </>
                )}
                {p.status === "approved" && can("purchase_receive") && (
                  <Btn small title="Terima Barang (masuk Gudang)" icon="download-outline" testID={`pr-receive-${p.id}`} onPress={() => act(`/purchasing/${p.id}/receive`, {}, "Barang diterima, stok & keuangan diperbarui")} />
                )}
              </View>
            </Card>
          )}
        />
      )}
      <Sheet visible={open} onClose={() => setOpen(false)} title="Purchasing Request" testID="pr-sheet">
        {items.map((i) => (
          <View key={i.ingredient_id} style={[s.row, { justifyContent: "space-between", paddingVertical: sp.xs }]}>
            <Text style={[s.title, { flex: 1 }]}>{i.name}: {i.qty} {i.unit}</Text>
            <Pressable hitSlop={10} testID={`pr-remove-${i.ingredient_id}`} onPress={() => setItems(items.filter((x) => x !== i))}><Icon name="close-circle" size={22} color={colors.error} /></Pressable>
          </View>
        ))}
        <View style={{ marginHorizontal: -sp.lg }}>
          <Text style={[s.section, { marginHorizontal: sp.lg }]}>Tambah bahan</Text>
          <Chips testPrefix="pr-ing" value={ing} onChange={setIng} options={(ings || []).map((i) => ({ label: `${i.low ? "⚠ " : ""}${i.name}`, value: i.id }))} />
        </View>
        <View style={[s.row, { alignItems: "flex-end" }]}>
          <View style={{ flex: 1 }}><Field label={`Jumlah (${ings?.find((i) => i.id === ing)?.unit ?? ""})`} testID="pr-qty-input" keyboardType="numeric" value={qty} onChangeText={setQty} /></View>
          <Btn title="Tambah" variant="secondary" testID="pr-add-item-button" onPress={addItem} style={{ marginBottom: sp.md }} />
        </View>
        <Field label="Catatan" testID="pr-note-input" value={note} onChangeText={setNote} />
        <Btn title="Ajukan Request" testID="pr-submit-button" loading={busy} disabled={!items.length} onPress={submit} />
      </Sheet>
    </Page>
  );
}
