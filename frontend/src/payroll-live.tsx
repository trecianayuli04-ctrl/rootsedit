import { useState } from "react";
import { Text, View } from "react-native";

import { api, num, rp, useApi } from "@/src/api";
import { Badge, Btn, Card, Field, Sheet, sp, Stat, StateView, useStyles, useToast } from "@/src/ui";

// Realtime payroll estimate from attendance + per-employee pay rate editor (Owner/Finance)
export function PayrollLive({ onCreate }: { onCreate: (userId: string) => void }) {
  const s = useStyles();
  const toast = useToast();
  const { data, loading, error, reload } = useApi<any>("/payroll/preview");
  const [edit, setEdit] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api(`/users/${edit.user_id}/pay`, {
        method: "PUT",
        body: { base_salary: num(edit.base_salary), allowance: num(edit.allowance), hourly_rate: num(edit.hourly_rate), overtime_rate: num(edit.overtime_rate), shift_start: edit.shift_start },
      });
      toast("Tarif gaji disimpan");
      setEdit(null);
      reload();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <StateView loading={loading} error={error} onRetry={reload} />;
  return (
    <View style={{ gap: sp.md }}>
      <Text style={s.section}>Estimasi Gaji Realtime (dari absensi)</Text>
      <View style={s.wrap}>
        <Stat label="Total estimasi" value={rp(data.total)} tone="brand" testID="payroll-estimate-total" />
        <Stat label="Total jam kerja" value={`${data.hours} jam`} testID="payroll-estimate-hours" />
        <Stat label="Potongan telat" value={rp(data.late_penalty)} tone="error" testID="payroll-estimate-late" />
      </View>
      {data.rows.map((r: any) => (
        <Card key={r.user_id} testID={`payroll-live-${r.user_id}`}>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={[s.title, { flex: 1 }]}>{r.name}</Text>
            {r.running && <Badge label="SEDANG KERJA" tone="success" />}
          </View>
          <Text style={s.sub}>
            {r.hours} jam × {rp(r.hourly_rate)} = {rp(r.hourly_pay)} · Gaji pokok {rp(r.base_salary)} · Tunjangan {rp(r.allowance)}
          </Text>
          <Text style={s.sub}>
            Lembur ACC {r.overtime_hours}j × {rp(r.overtime_rate)} = {rp(r.overtime)}
            {r.overtime_pending ? ` · ${r.overtime_pending}j menunggu ACC` : ""}
          </Text>
          <Text style={s.sub}>
            Hadir {r.attendance.clock_in} hari · Telat {r.late_count}x ({r.late_minutes} mnt) −{rp(r.late_penalty)} · Jadwal masuk {r.shift_start || "-"}
          </Text>
          <View style={[s.row, { justifyContent: "space-between", marginTop: sp.sm }]}>
            <Text style={s.value}>{rp(r.estimate)}</Text>
            <View style={s.row}>
              <Btn small variant="ghost" title="Atur Gaji" testID={`payroll-rate-${r.user_id}`} onPress={() => setEdit({ ...r, base_salary: String(r.base_salary), allowance: String(r.allowance), hourly_rate: String(r.hourly_rate), overtime_rate: String(r.overtime_rate) })} />
              <Btn small title="Buat Slip" testID={`payroll-create-${r.user_id}`} onPress={() => onCreate(r.user_id)} />
            </View>
          </View>
        </Card>
      ))}
      <Sheet visible={!!edit} onClose={() => setEdit(null)} title={`Atur Gaji · ${edit?.name ?? ""}`} testID="pay-rate-sheet">
        {edit && (
          <>
            <View style={s.row}>
              <View style={{ flex: 1 }}><Field label="Gaji per jam (Rp)" testID="rate-hourly-input" keyboardType="numeric" value={edit.hourly_rate} onChangeText={(v) => setEdit({ ...edit, hourly_rate: v })} /></View>
              <View style={{ flex: 1 }}><Field label="Lembur per jam (Rp)" testID="rate-overtime-input" keyboardType="numeric" value={edit.overtime_rate} onChangeText={(v) => setEdit({ ...edit, overtime_rate: v })} /></View>
            </View>
            <View style={s.row}>
              <View style={{ flex: 1 }}><Field label="Gaji pokok bulanan" testID="rate-base-input" keyboardType="numeric" value={edit.base_salary} onChangeText={(v) => setEdit({ ...edit, base_salary: v })} /></View>
              <View style={{ flex: 1 }}><Field label="Tunjangan" testID="rate-allowance-input" keyboardType="numeric" value={edit.allowance} onChangeText={(v) => setEdit({ ...edit, allowance: v })} /></View>
            </View>
            <Field label="Jadwal jam masuk (HH:MM) untuk hitung telat" testID="rate-shift-input" value={edit.shift_start} onChangeText={(v) => setEdit({ ...edit, shift_start: v })} placeholder="08:00" />
            <Text style={[s.sub, { marginBottom: sp.md }]}>Kosongkan gaji pokok bila karyawan dibayar per jam. Lembur kosong = pakai tarif per jam.</Text>
            <Btn title="Simpan" testID="rate-save-button" loading={busy} onPress={save} />
          </>
        )}
      </Sheet>
    </View>
  );
}
