import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { api, num, rp, useApi } from "@/src/api";
import { Btn, Card, Chips, Field, Sheet, sp, useStyles, useToast } from "@/src/ui";
import { useTheme } from "@/src/theme";

// ---------- Kas Keluar (petty cash dari kasir, dengan foto bukti) ----------
export function PettyCashSheet({ visible, onClose, onDone }: { visible: boolean; onClose: () => void; onDone?: () => void }) {
  const s = useStyles();
  const toast = useToast();
  const { data: cats } = useApi<any[]>(visible ? "/config/expense_categories?active=true" : null);
  const [cat, setCat] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const catList = (cats || []).map((c) => ({ label: c.name, value: c.name }));

  const pick = async (camera: boolean) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return toast("Izin kamera/galeri ditolak", "error");
    const res = camera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5, mediaTypes: ["images"] })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5, mediaTypes: ["images"] });
    if (!res.canceled && res.assets?.[0]?.base64) setPhoto(`data:image/jpeg;base64,${res.assets[0].base64}`);
  };
  const submit = async () => {
    setBusy(true);
    try {
      const pocket = (cats || []).find((c) => c.name === cat)?.pocket_id || null;
      const r = await api<any>("/expenses", { body: { category: cat || catList[0]?.value, amount: num(amount), note, method: "Cash", pocket_id: pocket, photo, source: "kasir" } });
      toast(r.pending ? "Pengeluaran diajukan, menunggu persetujuan" : "Kas keluar dicatat & saldo diperbarui");
      setAmount(""); setNote(""); setPhoto("");
      onClose();
      onDone?.();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Kas Keluar (Pengeluaran)" testID="petty-sheet">
      <Text style={[s.sub, { marginBottom: sp.sm }]}>Catat pengeluaran kas kecil (mis. beli es batu). Tercatat otomatis di keuangan, kasir & audit.</Text>
      <View style={{ marginHorizontal: -sp.lg }}>
        <Chips testPrefix="petty-cat" value={cat || catList[0]?.value || ""} onChange={setCat} options={catList} />
      </View>
      <Field label="Nominal (Rp)" testID="petty-amount-input" keyboardType="numeric" value={amount} onChangeText={setAmount} />
      <Field label="Keterangan / alasan" testID="petty-note-input" value={note} onChangeText={setNote} />
      <Text style={[s.sub, { marginBottom: sp.sm }]}>Pengeluaran kasir selalu tunai (Cash) & langsung mengurangi laci kas.</Text>
      <View style={[s.row, { marginVertical: sp.md }]}>
        <Btn title="Kamera" variant="secondary" icon="camera-outline" style={{ flex: 1 }} testID="petty-camera-button" onPress={() => pick(true)} />
        <Btn title="Galeri" variant="secondary" icon="image-outline" style={{ flex: 1 }} testID="petty-gallery-button" onPress={() => pick(false)} />
      </View>
      {!!photo && <Image source={{ uri: photo }} style={{ width: "100%", height: 160, borderRadius: 12, marginBottom: sp.md }} resizeMode="cover" />}
      <Btn title="Simpan Pengeluaran" testID="petty-submit-button" loading={busy} disabled={!num(amount) || !(cat || catList[0]?.value)} onPress={submit} />
    </Sheet>
  );
}

// ---------- Pesanan Eksternal (tanpa harga) — hanya nomor pesanan & item ----------
// Item dari menu memotong stok sesuai resep. Item manual bisa dihubungkan ke menu
// agar stok tetap berkurang; jika tidak dihubungkan, item tidak terkait stok.
export function ExternalOrderSheet({ visible, onClose, menus, onDone }: { visible: boolean; onClose: () => void; menus: any[]; onDone?: (sale: any) => void }) {
  const s = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const { data: platforms } = useApi<any[]>(visible ? "/config/platforms?active=true" : null);
  const [platform, setPlatform] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [lines, setLines] = useState<any[]>([]);
  const [manualName, setManualName] = useState("");
  const [linkId, setLinkId] = useState("");
  const [busy, setBusy] = useState(false);
  const active = (menus || []).filter((m) => m.is_active);

  const addMenu = (m: any) => setLines((l) => (l.find((x) => x.menu_id === m.id) ? l.map((x) => (x.menu_id === m.id ? { ...x, qty: x.qty + 1 } : x)) : [...l, { menu_id: m.id, name: m.name, qty: 1 }]));
  const addManual = () => {
    const linked = active.find((m) => m.id === linkId);
    const name = (manualName.trim() || linked?.name || "").trim();
    if (!name) return toast("Isi nama item atau pilih menu", "error");
    setLines((l) => [...l, { menu_id: linked?.id || null, name, qty: 1, manual: true }]);
    setManualName(""); setLinkId("");
  };
  const upd = (i: number, k: string, v: any) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
  const rm = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));
  const totalQty = lines.reduce((a, l) => a + (Number(l.qty) || 0), 0);

  const submit = async () => {
    setBusy(true);
    try {
      const sale = await api<any>("/external-sales", {
        body: {
          platform: platform || platforms?.[0]?.name,
          order_no: orderNo,
          items: lines.map((l) => ({ menu_id: l.menu_id, name: l.name, qty: Number(l.qty) || 1, price: 0 })),
          payment_status: "settled",
        },
      });
      toast("Pesanan eksternal tercatat & stok terpotong");
      setLines([]); setOrderNo("");
      onClose();
      onDone?.(sale);
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Pesanan Eksternal" testID="external-sheet">
      <Text style={[s.sub, { marginBottom: sp.sm }]}>Tanpa input harga. Cukup nomor pesanan & item. Item dari menu otomatis memotong stok.</Text>
      {(platforms || []).length > 1 && (
        <>
          <Text style={s.label}>Platform / sumber</Text>
          <View style={{ marginHorizontal: -sp.lg }}>
            <Chips testPrefix="ext-platform" value={platform || platforms?.[0]?.name || ""} onChange={setPlatform} options={(platforms || []).map((p) => ({ label: p.name, value: p.name }))} />
          </View>
        </>
      )}
      <Field label="Nomor pesanan" testID="ext-orderno-input" value={orderNo} onChangeText={setOrderNo} />
      <Text style={s.section}>Item Pesanan</Text>
      {lines.length === 0 && <Text style={s.muted}>Belum ada item. Tambah dari menu di bawah.</Text>}
      {lines.map((l, i) => (
        <Card key={i} style={{ marginBottom: sp.sm }}>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.title, { fontSize: 14 }]}>{l.name}</Text>
              <Text style={[s.sub, { color: l.menu_id ? colors.brandPrimary : colors.muted }]}>{l.menu_id ? "✓ stok otomatis berkurang" : "• tidak terhubung stok"}</Text>
            </View>
            <Pressable testID={`ext-rm-${i}`} hitSlop={8} onPress={() => rm(i)}><Text style={{ color: colors.error }}>Hapus</Text></Pressable>
          </View>
          <View style={[s.row, { marginTop: sp.sm }]}>
            <Pressable testID={`ext-minus-${i}`} onPress={() => upd(i, "qty", Math.max(1, (Number(l.qty) || 1) - 1))} style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 18 }}>−</Text></Pressable>
            <Text style={[s.value, { minWidth: 32, textAlign: "center" }]}>{l.qty}</Text>
            <Pressable testID={`ext-plus-${i}`} onPress={() => upd(i, "qty", (Number(l.qty) || 1) + 1)} style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 18 }}>+</Text></Pressable>
          </View>
        </Card>
      ))}
      <Text style={s.label}>Tambah dari menu</Text>
      <View style={{ marginHorizontal: -sp.lg }}>
        <Chips testPrefix="ext-menu" value="" onChange={(id) => { const m = active.find((x) => x.id === id); if (m) addMenu(m); }} options={active.map((m) => ({ label: m.name, value: m.id }))} />
      </View>
      <Text style={[s.label, { marginTop: sp.md }]}>Item manual (opsional)</Text>
      <Field label="Nama item" testID="ext-manual-name" value={manualName} onChangeText={setManualName} />
      <Text style={s.sub}>Hubungkan ke menu agar stok berkurang (opsional):</Text>
      <View style={{ marginHorizontal: -sp.lg }}>
        <Chips testPrefix="ext-link" value={linkId} onChange={setLinkId} options={[{ label: "Tanpa stok", value: "" }, ...active.map((m) => ({ label: m.name, value: m.id }))]} />
      </View>
      <Btn title="+ Tambah Item Manual" variant="ghost" small testID="ext-add-manual" onPress={addManual} />
      <Text style={[s.sub, { marginTop: sp.md }]}>{lines.length} item · total {totalQty} pcs</Text>
      <Btn title="Simpan Pesanan" style={{ marginTop: sp.sm }} testID="ext-submit-button" loading={busy} disabled={!lines.length} onPress={submit} />
    </Sheet>
  );
}
