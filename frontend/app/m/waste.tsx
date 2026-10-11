import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, num, rp, useApi } from "@/src/api";
import { useAuth } from "@/src/auth";
import { LOCS } from "@/src/navigation";
import { Badge, Btn, Card, Chips, Field, Header, Page, Sheet, sp, StateView, STATUS_TONE, useStyles, useToast } from "@/src/ui";

export default function Waste() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { can } = useAuth();
  const { data, loading, error, reload } = useApi<any[]>("/waste");
  const { data: ings } = useApi<any[]>("/ingredients");
  const [open, setOpen] = useState(false);
  const [ing, setIng] = useState("");
  const [loc, setLoc] = useState("bar");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api("/waste", { body: { ingredient_id: ing, qty: num(qty), reason, location: loc } });
      toast("Waste dicatat, menunggu approval");
      setOpen(false);
      setQty("");
      setReason("");
      reload();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const decide = async (id: string, approve: boolean) => {
    try {
      await api(`/waste/${id}/decide`, { body: { approve } });
      toast(approve ? "Disetujui, stok dikurangi" : "Ditolak");
      reload();
    } catch (e: any) {
      toast(e.message, "error");
    }
  };

  return (
    <Page>
      <Header back title="Waste" subtitle="Bahan terbuang" right={<Btn small title="Catat" icon="add" testID="waste-add-button" onPress={() => { setIng(ings?.[0]?.id ?? ""); setOpen(true); }} />} />
      {!data ? <StateView loading={loading} error={error} onRetry={reload} /> : (
        <FlatList
          data={data}
          keyExtractor={(w) => w.id}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + sp.xl }]}
          ListEmptyComponent={<StateView empty="Belum ada catatan waste" />}
          renderItem={({ item: w }) => (
            <Card testID={`waste-item-${w.id}`}>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={[s.title, { flex: 1 }]}>{w.ingredient_name} · {w.qty} {w.unit}</Text>
                <Badge label={w.status.toUpperCase()} tone={STATUS_TONE[w.status]} />
              </View>
              <Text style={s.sub}>{w.reason} · {w.location} · {w.date} · {w.user_name}</Text>
              <Text style={s.sub}>Nilai {rp(w.value)}</Text>
              {w.status === "pending" && can("waste_approve") && (
                <View style={[s.row, { marginTop: sp.sm }]}>
                  <Btn small title="Setujui" variant="success" testID={`waste-approve-${w.id}`} onPress={() => decide(w.id, true)} />
                  <Btn small title="Tolak" variant="ghost" testID={`waste-reject-${w.id}`} onPress={() => decide(w.id, false)} />
                </View>
              )}
            </Card>
          )}
        />
      )}
      <Sheet visible={open} onClose={() => setOpen(false)} title="Catat Waste" testID="waste-sheet">
        <View style={{ marginHorizontal: -sp.lg }}>
          <Text style={[s.section, { marginHorizontal: sp.lg }]}>Bahan</Text>
          <Chips testPrefix="waste-ing" value={ing} onChange={setIng} options={(ings || []).map((i) => ({ label: i.name, value: i.id }))} />
          <Text style={[s.section, { marginHorizontal: sp.lg }]}>Lokasi</Text>
          <Chips testPrefix="waste-loc" value={loc} onChange={setLoc} options={LOCS} />
        </View>
        <Field label={`Jumlah (${ings?.find((i) => i.id === ing)?.unit ?? ""})`} testID="waste-qty-input" keyboardType="numeric" value={qty} onChangeText={setQty} />
        <Field label="Alasan" testID="waste-reason-input" placeholder="Tumpah, kadaluarsa, salah buat..." value={reason} onChangeText={setReason} />
        <Btn title="Simpan" testID="waste-submit-button" loading={busy} disabled={!ing || !num(qty) || !reason} onPress={submit} />
      </Sheet>
    </Page>
  );
}
