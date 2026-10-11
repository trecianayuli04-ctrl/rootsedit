import { useState } from "react";
import { FlatList, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, num, rp, useApi } from "@/src/api";
import { PayrollLive } from "@/src/payroll-live";
import { Badge, Btn, Card, Chips, Field, Header, Page, Sheet, sp, StateView, STATUS_TONE, useStyles, useToast } from "@/src/ui";

const month = () => new Date().toISOString().slice(0, 7);

export default function Payroll() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { data, loading, error, reload } = useApi<any[]>("/payroll");
  const { data: users } = useApi<any[]>("/users");
  const { data: comps } = useApi<any[]>("/config/payroll_components?active=true");
  const [open, setOpen] = useState(false);
  const [uid, setUid] = useState("");
  const [sel, setSel] = useState<Record<string, { on: boolean; val: string }>>({});
  const [busy, setBusy] = useState(false);
  const staff = (users || []).filter((u) => u.role !== "owner" && u.is_active);

  const openSheet = (id: string) => {
    setUid(id || staff[0]?.id || "");
    setSel({});
    setOpen(true);
  };
  const toggle = (id: string, on: boolean) => setSel((p) => ({ ...p, [id]: { on, val: p[id]?.val ?? "" } }));
  const setVal = (id: string, val: string) => setSel((p) => ({ ...p, [id]: { on: p[id]?.on ?? true, val } }));

  const submit = async () => {
    setBusy(true);
    try {
      const components = (comps || [])
        .filter((c) => sel[c.id]?.on)
        .map((c) => (c.method === "manual" ? { component_id: c.id, qty: 1, amount: num(sel[c.id]?.val || "0") } : { component_id: c.id, qty: num(sel[c.id]?.val || "1") || 1 }));
      await api("/payroll", { body: { user_id: uid, month: month(), components } });
      toast("Payroll dibuat dari absensi + komponen");
      setOpen(false);
      reload();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const pay = async (id: string) => {
    try {
      await api(`/payroll/${id}/pay`, { body: {} });
      toast("Gaji dibayar & tercatat di pengeluaran");
      reload();
    } catch (e: any) {
      toast(e.message, "error");
    }
  };

  return (
    <Page>
      <Header back title="Payroll" subtitle={`Periode ${month()}`} right={<Btn small title="Buat" icon="add" testID="payroll-add-button" onPress={() => openSheet("")} />} />
      {!data ? <StateView loading={loading} error={error} onRetry={reload} /> : (
        <FlatList
          data={data}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + sp.xl }]}
          ListHeaderComponent={
            <View style={{ gap: sp.md }}>
              <PayrollLive onCreate={(id) => openSheet(id)} />
              <Text style={s.section}>Slip Gaji Bulan Ini</Text>
            </View>
          }
          ListEmptyComponent={<StateView empty="Belum ada payroll bulan ini" />}
          renderItem={({ item: p }) => (
            <Card testID={`payroll-item-${p.id}`}>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={[s.title, { flex: 1 }]}>{p.name}</Text>
                <Badge label={p.status.toUpperCase()} tone={STATUS_TONE[p.status]} />
              </View>
              <Text style={s.sub}>Gaji pokok {rp(p.base_salary)} · Tunjangan {rp(p.allowance)}</Text>
              <Text style={s.sub}>{p.hours ?? 0} jam × {rp(p.hourly_rate)} = {rp(p.hourly_pay)} · Lembur {rp(p.overtime)} ({p.attendance.lembur_hours} jam)</Text>
              {(p.bonuses || []).map((b: any, i: number) => (
                <Text key={`b${i}`} style={[s.sub, { color: undefined }]}>+ {b.name} {rp(b.amount)}{b.note ? ` · ${b.note}` : ""}</Text>
              ))}
              {(p.deductions || []).map((d: any, i: number) => (
                <Text key={`d${i}`} style={s.sub}>− {d.name} {rp(d.amount)}{d.note ? ` · ${d.note}` : ""}</Text>
              ))}
              <Text style={s.sub}>Total bonus {rp(p.total_bonus ?? p.bonus)} · Total potongan {rp(p.total_deduction ?? p.deduction)} · Telat −{rp(p.late_penalty)}</Text>
              <Text style={s.sub}>Hadir {p.attendance.clock_in} · Izin {p.attendance.izin} · Sakit {p.attendance.sakit} · Libur {p.attendance.libur}</Text>
              <View style={[s.row, { justifyContent: "space-between", marginTop: sp.sm }]}>
                <Text style={s.value}>Gaji bersih {rp(p.total)}</Text>
                {p.status !== "paid" && <Btn small title="Bayar" variant="success" testID={`payroll-pay-${p.id}`} onPress={() => pay(p.id)} />}
              </View>
            </Card>
          )}
        />
      )}
      <Sheet visible={open} onClose={() => setOpen(false)} title="Buat Payroll" testID="payroll-sheet">
        <View style={{ marginHorizontal: -sp.lg }}>
          <Chips testPrefix="payroll-user" value={uid} onChange={setUid} options={staff.map((u) => ({ label: u.name, value: u.id }))} />
        </View>
        {(() => {
          const u = staff.find((x) => x.id === uid);
          return u ? <Text style={[s.sub, { marginBottom: sp.md }]}>{u.position} · Gaji {rp(u.base_salary)} · Tunjangan {rp(u.allowance)}</Text> : null;
        })()}
        <Text style={s.section}>Komponen Bonus & Potongan</Text>
        {(comps || []).length === 0 && <Text style={s.sub}>Belum ada komponen. Tambah di Pengaturan → Komponen Gaji.</Text>}
        {(comps || []).map((c) => (
          <View key={c.id} style={{ marginBottom: sp.sm }}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.title, { fontSize: 14 }]}>{c.type === "bonus" ? "+ " : "− "}{c.name}</Text>
                <Text style={s.sub}>{c.method === "manual" ? "Isi nominal manual" : c.method === "fixed" ? `Tetap ${rp(c.amount)}` : `Tarif ${rp(c.amount)} · x faktor`}</Text>
              </View>
              <Switch testID={`payroll-comp-${c.id}`} value={!!sel[c.id]?.on} onValueChange={(v) => toggle(c.id, v)} />
            </View>
            {sel[c.id]?.on && c.method !== "fixed" && (
              <Field label={c.method === "manual" ? "Nominal (Rp)" : "Faktor / qty (default 1)"} testID={`payroll-compval-${c.id}`} keyboardType="numeric" value={sel[c.id]?.val || ""} onChangeText={(t) => setVal(c.id, t)} />
            )}
          </View>
        ))}
        <Text style={[s.sub, { marginVertical: sp.md }]}>Jam kerja, lembur ter-ACC, dan potongan telat dihitung otomatis dari absensi. Slip disimpan sebagai snapshot (perubahan komponen berikutnya tidak mengubah slip lama).</Text>
        <Btn title="Hitung & Simpan" testID="payroll-submit-button" loading={busy} disabled={!uid} onPress={submit} />
      </Sheet>
    </Page>
  );
}
