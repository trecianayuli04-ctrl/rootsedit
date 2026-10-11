import { useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, num, rp, useApi } from "@/src/api";
import { Badge, Btn, Card, Chips, Field, Header, Page, Sheet, sp, StateView, useStyles, useToast } from "@/src/ui";

type FieldDef = { key: string; label: string; type: "text" | "number" | "select"; options?: { label: string; value: string }[] };

const PAY_KINDS = [
  { label: "Cash", value: "cash" }, { label: "QRIS", value: "qris" }, { label: "Debit", value: "debit" },
  { label: "Transfer", value: "transfer" }, { label: "E-Wallet", value: "ewallet" }, { label: "Lainnya", value: "other" },
];
const ALLOC = [{ label: "Tidak ada", value: "none" }, { label: "Persentase omzet", value: "percent" }, { label: "Nominal tetap", value: "fixed" }];
const COMP_TYPE = [{ label: "Bonus", value: "bonus" }, { label: "Potongan", value: "deduction" }];
const COMP_METHOD = [
  { label: "Nominal tetap", value: "fixed" }, { label: "% gaji pokok", value: "percent_base" },
  { label: "x jumlah telat", value: "per_late" }, { label: "x menit telat", value: "per_late_minute" },
  { label: "x hari hadir", value: "per_day_present" }, { label: "x jam kerja", value: "per_hour_worked" },
  { label: "Isi manual saat payroll", value: "manual" },
];
const BORNE = [{ label: "Outlet", value: "outlet" }, { label: "Platform", value: "platform" }];

const META: Record<string, { title: string; defaults: any; fields: (pockets: any[]) => FieldDef[]; summary: (x: any) => string }> = {
  payment_methods: {
    title: "Metode Pembayaran",
    defaults: { name: "", kind: "other", fee_percent: 0, fee_fixed: 0 },
    fields: () => [
      { key: "name", label: "Nama metode", type: "text" },
      { key: "kind", label: "Jenis", type: "select", options: PAY_KINDS },
      { key: "fee_percent", label: "Biaya / MDR (%)", type: "number" },
      { key: "fee_fixed", label: "Biaya tetap per transaksi (Rp)", type: "number" },
    ],
    summary: (x) => `${x.kind.toUpperCase()}${x.fee_percent ? ` · ${x.fee_percent}%` : ""}${x.fee_fixed ? ` + ${rp(x.fee_fixed)}` : ""}`,
  },
  fund_pockets: {
    title: "Kantong Dana & Alokasi",
    defaults: { name: "", description: "", alloc_method: "none", alloc_value: 0 },
    fields: () => [
      { key: "name", label: "Nama kantong", type: "text" },
      { key: "description", label: "Keterangan", type: "text" },
      { key: "alloc_method", label: "Metode alokasi", type: "select", options: ALLOC },
      { key: "alloc_value", label: "Nilai alokasi (% atau Rp)", type: "number" },
    ],
    summary: (x) => (x.alloc_method === "percent" ? `${x.alloc_value}% omzet` : x.alloc_method === "fixed" ? `${rp(x.alloc_value)}/periode` : "tanpa alokasi"),
  },
  expense_categories: {
    title: "Kategori Pengeluaran",
    defaults: { name: "", description: "", pocket_id: null },
    fields: (pockets) => [
      { key: "name", label: "Nama kategori", type: "text" },
      { key: "description", label: "Keterangan", type: "text" },
      { key: "pocket_id", label: "Kantong dana", type: "select", options: [{ label: "— Tidak ada —", value: "" }, ...pockets.map((p) => ({ label: p.name, value: p.id }))] },
    ],
    summary: (x) => x.description || "—",
  },
  payroll_components: {
    title: "Komponen Gaji",
    defaults: { name: "", type: "bonus", description: "", method: "fixed", amount: 0 },
    fields: () => [
      { key: "name", label: "Nama komponen", type: "text" },
      { key: "type", label: "Jenis", type: "select", options: COMP_TYPE },
      { key: "method", label: "Metode hitung", type: "select", options: COMP_METHOD },
      { key: "amount", label: "Nominal / tarif", type: "number" },
      { key: "description", label: "Keterangan", type: "text" },
    ],
    summary: (x) => `${x.type === "bonus" ? "Bonus" : "Potongan"} · ${(COMP_METHOD.find((m) => m.value === x.method) || {}).label} · ${rp(x.amount)}`,
  },
  platforms: {
    title: "Platform Eksternal",
    defaults: { name: "", commission_percent: 0, other_fee_percent: 0, fee_fixed: 0, discount_borne_by: "outlet", payout_schedule: "", settlement_ref: "" },
    fields: () => [
      { key: "name", label: "Nama platform", type: "text" },
      { key: "commission_percent", label: "Komisi (%)", type: "number" },
      { key: "other_fee_percent", label: "Biaya lain (%)", type: "number" },
      { key: "fee_fixed", label: "Biaya tetap (Rp)", type: "number" },
      { key: "discount_borne_by", label: "Diskon ditanggung", type: "select", options: BORNE },
      { key: "payout_schedule", label: "Jadwal pencairan", type: "text" },
      { key: "settlement_ref", label: "Referensi settlement", type: "text" },
    ],
    summary: (x) => `Komisi ${x.commission_percent}%${x.other_fee_percent ? ` + ${x.other_fee_percent}%` : ""}${x.fee_fixed ? ` + ${rp(x.fee_fixed)}` : ""}`,
  },
};

export default function ConfigEditor() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const k = String(kind || "payment_methods");
  const meta = META[k] || META.payment_methods;
  const { data, loading, error, reload } = useApi<any[]>(`/config/${k}`);
  const { data: pockets } = useApi<any[]>(k === "expense_categories" ? "/config/fund_pockets" : null);
  const fields = useMemo(() => meta.fields(pockets || []), [meta, pockets]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const openNew = () => { setForm({ ...meta.defaults, is_active: true }); setOpen(true); };
  const openEdit = (x: any) => { setForm({ ...x }); setOpen(true); };
  const setF = (key: string, v: any) => setForm((f: any) => ({ ...f, [key]: v }));

  const save = async () => {
    if (!String(form.name || "").trim()) return toast("Nama wajib diisi", "error");
    setBusy(true);
    try {
      const body: any = { ...meta.defaults, ...form };
      fields.forEach((f) => { if (f.type === "number") body[f.key] = num(String(form[f.key] ?? 0)); });
      body.is_active = form.is_active !== false;
      if (form.id) await api(`/config/${k}/${form.id}`, { method: "PUT", body });
      else await api(`/config/${k}`, { method: "POST", body });
      toast("Tersimpan");
      setOpen(false);
      reload();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Header back title={meta.title} subtitle="Tambah, ubah, aktif/nonaktifkan" right={<Btn small title="Tambah" icon="add" testID="config-add-button" onPress={openNew} />} />
      {!data ? <StateView loading={loading} error={error} onRetry={reload} /> : (
        <FlatList
          data={data}
          keyExtractor={(x) => x.id}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + sp.xl }]}
          ListEmptyComponent={<StateView empty="Belum ada data" />}
          renderItem={({ item: x }) => (
            <Card testID={`config-item-${x.id}`} onPress={() => openEdit(x)}>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={[s.title, { flex: 1 }]}>{x.name}</Text>
                <Badge label={x.is_active === false ? "NONAKTIF" : "AKTIF"} tone={x.is_active === false ? "muted" : "success"} />
              </View>
              <Text style={s.sub}>{meta.summary(x)}</Text>
            </Card>
          )}
        />
      )}
      <Sheet visible={open} onClose={() => setOpen(false)} title={form?.id ? `Edit ${meta.title}` : `Tambah ${meta.title}`} testID="config-sheet">
        {form && (
          <View>
            {fields.map((f) =>
              f.type === "select" ? (
                <View key={f.key} style={{ marginBottom: sp.md }}>
                  <Text style={s.label}>{f.label}</Text>
                  <View style={{ marginHorizontal: -sp.lg }}>
                    <Chips testPrefix={`config-${f.key}`} value={String(form[f.key] ?? (f.options?.[0]?.value || ""))} onChange={(v) => setF(f.key, v || null)} options={f.options || []} />
                  </View>
                </View>
              ) : (
                <Field key={f.key} label={f.label} testID={`config-${f.key}-input`} keyboardType={f.type === "number" ? "numeric" : "default"}
                  value={String(form[f.key] ?? "")} onChangeText={(t) => setF(f.key, t)} />
              ),
            )}
            <View style={{ marginBottom: sp.md, marginHorizontal: -sp.lg }}>
              <Text style={[s.label, { marginHorizontal: sp.lg }]}>Status</Text>
              <Chips testPrefix="config-active" value={form.is_active === false ? "0" : "1"} onChange={(v) => setF("is_active", v === "1")}
                options={[{ label: "Aktif", value: "1" }, { label: "Nonaktif", value: "0" }]} />
            </View>
            <Btn title="Simpan" testID="config-save-button" loading={busy} onPress={save} />
          </View>
        )}
      </Sheet>
    </Page>
  );
}
