import { useMemo, useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, num, rp, useApi } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Badge, Btn, Card, Chips, Field, Header, Icon, Page, Sheet, sp, Stat, StateView, useStyles, useToast } from "@/src/ui";
import { useTheme } from "@/src/theme";

const isOutlet = (f: any) => f.source === "kasir";

export default function Finance() {
  const s = useStyles();
  const { colors } = useTheme();
  const { can } = useAuth();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { data, loading, error, reload } = useApi<any[]>("/finance");
  const { data: cats } = useApi<any[]>("/config/expense_categories?active=true");
  const { data: methods } = useApi<any[]>("/config/payment_methods?active=true");
  const { data: pending, reload: reloadPending } = useApi<any[]>(can("petty_cash_approve") ? "/expenses?pending=true" : null);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [src, setSrc] = useState<"kasir" | "finance">("finance");
  const [cat, setCat] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState("Cash");
  const [receiver, setReceiver] = useState("");
  const [photo, setPhoto] = useState("");
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"all" | "kasir" | "finance">("all");
  const [q, setQ] = useState("");

  const expenseCats = (cats || []).map((c) => c.name);
  const incomeCats = ["Penjualan", "Lainnya"];
  const list = type === "expense" ? expenseCats : incomeCats;

  const rows = data || [];
  const outletExp = rows.filter((f) => f.type === "expense" && isOutlet(f)).reduce((a, f) => a + f.amount, 0);
  const financeExp = rows.filter((f) => f.type === "expense" && !isOutlet(f)).reduce((a, f) => a + f.amount, 0);
  const inc = rows.filter((f) => f.type === "income").reduce((a, f) => a + f.amount, 0);

  const filtered = useMemo(() => {
    let r = rows;
    if (tab === "kasir") r = r.filter((f) => isOutlet(f));
    else if (tab === "finance") r = r.filter((f) => !isOutlet(f));
    if (q.trim()) {
      const k = q.toLowerCase();
      r = r.filter((f) => `${f.category} ${f.note} ${f.user_name}`.toLowerCase().includes(k));
    }
    return r;
  }, [rows, tab, q]);

  const pick = async (camera: boolean) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return toast("Izin kamera/galeri ditolak", "error");
    const res = camera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5, mediaTypes: ["images"] })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5, mediaTypes: ["images"] });
    if (!res.canceled && res.assets?.[0]?.base64) setPhoto(`data:image/jpeg;base64,${res.assets[0].base64}`);
  };

  const openSheet = () => {
    setType("expense");
    setSrc("finance");
    setCat(expenseCats[0] || "");
    setAmount("");
    setNote("");
    setMethod("Cash");
    setReceiver("");
    setPhoto("");
    setOpen(true);
  };
  const submit = async () => {
    setBusy(true);
    try {
      if (type === "expense") {
        const pocket = (cats || []).find((c) => c.name === cat)?.pocket_id || null;
        const m = src === "kasir" ? "Cash" : method;
        await api("/expenses", { body: { category: cat, amount: num(amount), note, method: m, pocket_id: pocket, receiver, photo, source: src } });
      } else {
        await api("/finance", { body: { type, category: cat, amount: num(amount), note } });
      }
      toast(src === "kasir" && type === "expense" ? "Pengeluaran Kas Outlet dicatat & saldo diperbarui" : "Tersimpan");
      setOpen(false);
      reload();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const decide = async (id: string, approve: boolean) => {
    try {
      await api(`/expenses/${id}/decide`, { body: { approve } });
      toast(approve ? "Disetujui & masuk pengeluaran" : "Ditolak");
      reloadPending();
      reload();
    } catch (e: any) {
      toast(e.message, "error");
    }
  };

  return (
    <Page>
      <Header back title="Keuangan" subtitle="Pengeluaran Kas Outlet & Finance terpisah" right={<Btn small title="Catat" icon="add" testID="finance-add-button" onPress={openSheet} />} />
      {!data ? <StateView loading={loading} error={error} onRetry={reload} /> : (
        <FlatList
          data={filtered}
          keyExtractor={(f) => f.id}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + sp.xl }]}
          ListHeaderComponent={
            <View style={{ gap: sp.md }}>
              <View style={s.wrap}>
                <Stat label="Pengeluaran Kas Outlet" value={rp(outletExp)} tone="brand" testID="finance-outlet-expense" icon="storefront-outline" />
                <Stat label="Pengeluaran Finance" value={rp(financeExp)} tone="error" testID="finance-finance-expense" icon="business-outline" />
                <Stat label="Total Pengeluaran" value={rp(outletExp + financeExp)} testID="finance-total-expense" icon="calculator-outline" />
                <Stat label="Pemasukan" value={rp(inc)} tone="success" testID="finance-income" icon="trending-up-outline" />
              </View>
              {!!(pending || []).length && (
                <>
                  <Text style={s.section}>Menunggu Persetujuan</Text>
                  {pending!.map((p) => (
                    <Card key={p.id} testID={`pending-${p.id}`}>
                      <View style={[s.row, { justifyContent: "space-between" }]}>
                        <Text style={[s.title, { flex: 1 }]}>{p.category} · {rp(p.amount)}</Text>
                        <Badge label={p.source === "kasir" ? "KAS OUTLET" : "FINANCE"} tone={p.source === "kasir" ? "brand" : "muted"} />
                      </View>
                      <Text style={s.sub}>{p.note} · {p.user_name} · {p.method}</Text>
                      {!!p.photo && <Pressable onPress={() => setViewPhoto(p.photo)}><Text style={[s.sub, { color: colors.brandPrimary }]}>Lihat bukti foto</Text></Pressable>}
                      <View style={[s.row, { marginTop: sp.sm }]}>
                        <Btn small title="Tolak" variant="ghost" style={{ flex: 1 }} testID={`reject-${p.id}`} onPress={() => decide(p.id, false)} />
                        <Btn small title="Setujui" variant="success" style={{ flex: 1 }} testID={`approve-${p.id}`} onPress={() => decide(p.id, true)} />
                      </View>
                    </Card>
                  ))}
                </>
              )}
              <View style={{ marginHorizontal: -sp.lg }}>
                <Chips testPrefix="finance-tab" value={tab} onChange={setTab} options={[{ label: "Semua", value: "all" }, { label: "Kas Outlet", value: "kasir" }, { label: "Finance", value: "finance" }]} />
              </View>
              <Field label="" testID="finance-search" placeholder="Cari kategori / keterangan / pengguna" value={q} onChangeText={setQ} />
              <Text style={s.section}>Transaksi Bulan Ini</Text>
            </View>
          }
          ListEmptyComponent={<StateView empty="Belum ada transaksi" />}
          renderItem={({ item: f }) => (
            <Card style={[s.row, { justifyContent: "space-between" }]} onPress={f.photo ? () => setViewPhoto(f.photo) : undefined} testID={`finance-row-${f.id}`}>
              <View style={{ flex: 1 }}>
                <View style={[s.row, { gap: sp.sm, flexWrap: "wrap" }]}>
                  <Text style={s.title}>{f.category}</Text>
                  {f.type === "expense" && <Badge label={isOutlet(f) ? "KAS OUTLET" : "FINANCE"} tone={isOutlet(f) ? "brand" : "muted"} />}
                </View>
                <Text style={s.sub} numberOfLines={1}>{f.note} · {f.date}{f.user_name ? ` · ${f.user_name}` : ""}{f.method ? ` · ${f.method}` : ""}</Text>
                {!!f.photo && <Text style={[s.sub, { color: colors.brandPrimary }]}>Ada bukti foto</Text>}
              </View>
              <Text style={[s.value, { color: f.type === "income" ? colors.success : colors.error }]}>{f.type === "income" ? "+" : "-"}{rp(f.amount)}</Text>
            </Card>
          )}
        />
      )}
      <Sheet visible={open} onClose={() => setOpen(false)} title="Catat Keuangan" testID="finance-sheet">
        <View style={{ marginHorizontal: -sp.lg }}>
          <Chips testPrefix="finance-type" value={type} onChange={(v) => { setType(v); setCat((v === "expense" ? expenseCats : incomeCats)[0] || ""); }} options={[{ label: "Pengeluaran", value: "expense" }, { label: "Pemasukan", value: "income" }]} />
        </View>
        {type === "expense" && (
          <>
            <Text style={s.label}>Sumber dana</Text>
            <View style={{ marginHorizontal: -sp.lg }}>
              <Chips testPrefix="finance-source" value={src} onChange={setSrc} options={[{ label: "Kas Outlet (tunai)", value: "kasir" }, { label: "Finance / perusahaan", value: "finance" }]} />
            </View>
            <Text style={[s.sub, { marginBottom: sp.sm }]}>{src === "kasir" ? "Mengurangi saldo kas fisik outlet secara langsung." : "Dibayar via finance/rekening — tidak mengurangi kas outlet."}</Text>
          </>
        )}
        <View style={{ marginHorizontal: -sp.lg }}>
          <Chips testPrefix="finance-cat" value={cat} onChange={setCat} options={list.map((c) => ({ label: c, value: c }))} />
        </View>
        <Field label="Jumlah (Rp)" testID="finance-amount-input" keyboardType="numeric" value={amount} onChangeText={setAmount} />
        <Field label="Keterangan" testID="finance-note-input" value={note} onChangeText={setNote} />
        {type === "expense" && (
          <>
            {src === "finance" && (
              <>
                <Text style={s.label}>Metode pembayaran</Text>
                <View style={{ marginHorizontal: -sp.lg }}>
                  <Chips testPrefix="finance-method" value={method} onChange={setMethod} options={(methods || []).map((m) => ({ label: m.name, value: m.name }))} />
                </View>
                <Field label="Penerima / vendor (opsional)" testID="finance-receiver-input" value={receiver} onChangeText={setReceiver} />
              </>
            )}
            <View style={[s.row, { marginBottom: sp.md }]}>
              <Btn title="Kamera" variant="secondary" icon="camera-outline" style={{ flex: 1 }} testID="finance-camera-button" onPress={() => pick(true)} />
              <Btn title="Galeri" variant="secondary" icon="image-outline" style={{ flex: 1 }} testID="finance-gallery-button" onPress={() => pick(false)} />
            </View>
            {!!photo && <Image source={{ uri: photo }} style={{ width: "100%", height: 160, borderRadius: 12, marginBottom: sp.md }} resizeMode="cover" />}
          </>
        )}
        <Btn title="Simpan" testID="finance-submit-button" loading={busy} disabled={!num(amount) || !cat} onPress={submit} />
      </Sheet>
      <Sheet visible={!!viewPhoto} onClose={() => setViewPhoto(null)} title="Bukti Foto" testID="photo-view">
        {!!viewPhoto && <Image source={{ uri: viewPhoto }} style={{ width: "100%", height: 360, borderRadius: 12 }} resizeMode="contain" />}
        <Btn title="Tutup" variant="ghost" icon="close" style={{ marginTop: sp.md }} onPress={() => setViewPhoto(null)} />
      </Sheet>
    </Page>
  );
}
