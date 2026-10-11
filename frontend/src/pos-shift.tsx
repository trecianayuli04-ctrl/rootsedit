import { useCallback, useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { api, num, rp, useApi } from "@/src/api";
import { Badge, Btn, Card, Chips, Field, sp, StateView, useStyles, useToast } from "@/src/ui";
import { makeStyles, useTheme } from "@/src/theme";

// ---------- realtime attendance (polls every 30s) ----------
export function useLiveAttendance(enabled = true) {
  const [data, setData] = useState<any>(null);
  const load = useCallback(async () => {
    try {
      setData(await api("/attendance/live"));
    } catch {}
  }, []);
  useEffect(() => {
    if (!enabled) return;
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [enabled, load]);
  return { data, reload: load };
}

const TONE: Record<string, any> = { bertugas: "success", selesai: "info", "belum hadir": "muted", izin: "warning", sakit: "warning", libur: "warning" };

export function LiveAttendance({ data, compact }: { data: any; compact?: boolean }) {
  const s = useStyles();
  const { colors } = useTheme();
  if (!data) return <StateView loading />;
  const sm = data.summary;
  return (
    <View style={{ gap: sp.sm }} testID="live-attendance">
      <Text style={s.sub}>
        Bertugas {sm.bertugas} · Selesai {sm.selesai} · Terlambat {sm.terlambat} · Belum hadir {sm.belum_hadir} · update {sm.time}
      </Text>
      {(compact ? data.rows.filter((r: any) => r.status !== "belum hadir") : data.rows).map((r: any) => (
        <View key={r.user_id} style={[s.row, { justifyContent: "space-between", paddingVertical: 4 }]} testID={`live-row-${r.user_id}`}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.onSurface, fontWeight: "700" }}>{r.name}</Text>
            <Text style={s.sub}>
              {r.clock_in ? `Masuk ${r.clock_in}` : "-"}
              {r.clock_out ? ` · Pulang ${r.clock_out}` : ""} · {r.hours} jam
              {r.is_late ? ` · telat ${r.late_minutes} mnt` : ""}
              {r.overtime_pending ? ` · lembur ${r.overtime_pending}j menunggu` : ""}
            </Text>
          </View>
          <Badge label={r.is_late && r.status === "bertugas" ? "TELAT" : r.status.toUpperCase()} tone={r.is_late ? "error" : TONE[r.status]} />
        </View>
      ))}
      {compact && sm.bertugas + sm.selesai === 0 && <Text style={s.muted}>Belum ada yang clock in</Text>}
    </View>
  );
}

// ---------- staff picker + PIN (shared tablet) ----------
export function StaffPin({ staff, userId, setUserId, pin, setPin, testPrefix }: any) {
  const p = useP();
  const { colors } = useTheme();
  return (
    <View>
      <View style={{ marginHorizontal: -sp.lg }}>
        <Chips testPrefix={`${testPrefix}-staff`} value={userId} onChange={setUserId} options={(staff || []).map((x: any) => ({ label: x.name, value: x.id }))} />
      </View>
      <TextInput testID={`${testPrefix}-pin-input`} value={pin} onChangeText={(t) => setPin(t.replace(/\D/g, ""))} placeholder="PIN" placeholderTextColor={colors.muted} keyboardType="number-pad" secureTextEntry maxLength={6} style={p.pin} />
    </View>
  );
}

export function KioskAttendance({ onDone }: { onDone: () => void }) {
  const s = useStyles();
  const toast = useToast();
  const { data: staff } = useApi<any[]>("/attendance/staff");
  const [uid, setUid] = useState("");
  const [pin, setPin] = useState("");
  const [type, setType] = useState("clock_in");
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      const r: any = await api("/attendance/kiosk", { body: { user_id: uid, pin, type, hours: num(hours), note } });
      toast(`${r.user_name}: ${type.replace("_", " ")} ${r.time}${r.is_late ? ` (telat ${r.late_minutes} mnt)` : ""}${type === "lembur" ? " — menunggu ACC" : ""}`);
      setPin("");
      setHours("");
      setNote("");
      onDone();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View>
      <Text style={s.sub}>Pilih nama, masukkan PIN, lalu pilih jenis absen.</Text>
      <StaffPin staff={staff} userId={uid} setUserId={setUid} pin={pin} setPin={setPin} testPrefix="kiosk" />
      <View style={{ marginHorizontal: -sp.lg }}>
        <Chips testPrefix="kiosk-type" value={type} onChange={setType} options={[
          { label: "Clock In", value: "clock_in" }, { label: "Clock Out", value: "clock_out" }, { label: "Lembur", value: "lembur" },
          { label: "Izin", value: "izin" }, { label: "Sakit", value: "sakit" }, { label: "Libur", value: "libur" },
        ]} />
      </View>
      {type === "lembur" && <Field label="Jam lembur (perlu ACC leader)" testID="kiosk-hours-input" keyboardType="numeric" value={hours} onChangeText={setHours} />}
      {!["clock_in", "clock_out"].includes(type) && <Field label="Keterangan" testID="kiosk-note-input" value={note} onChangeText={setNote} />}
      <Btn title="Kirim Absen" icon="finger-print-outline" testID="kiosk-submit-button" loading={busy} disabled={!uid || pin.length < 4} onPress={send} />
    </View>
  );
}

export function Handover({ session, onDone }: { session: any; onDone: (s: any) => void }) {
  const s = useStyles();
  const toast = useToast();
  const { data: staff } = useApi<any[]>("/attendance/staff");
  const [uid, setUid] = useState("");
  const [pin, setPin] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const cur = session.current;
  const go = async () => {
    setBusy(true);
    try {
      const r: any = await api("/register/handover", { body: { user_id: uid, pin, note } });
      toast(`Shift ${r.session.current.no} dipegang ${r.session.current.user_name}`);
      setPin("");
      onDone(r.session);
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: sp.sm }}>
      <Card>
        <Text style={s.title}>Shift {cur.no} · {cur.user_name}</Text>
        <Text style={s.sub}>Mulai {cur.start} · {cur.count} nota · {rp(cur.total)}</Text>
      </Card>
      <Text style={s.section}>Serahkan ke</Text>
      <StaffPin staff={(staff || []).filter((x: any) => x.id !== cur.user_id)} userId={uid} setUserId={setUid} pin={pin} setPin={setPin} testPrefix="handover" />
      <Field label="Catatan serah terima (opsional)" testID="handover-note-input" value={note} onChangeText={setNote} />
      <Btn title="Pindah Shift" icon="swap-horizontal" testID="handover-submit-button" loading={busy} disabled={!uid || pin.length < 4} onPress={go} />
    </View>
  );
}

export function OpenRegister({ onOpened, userName }: { onOpened: (s: any) => void; userName: string }) {
  const s = useStyles();
  const toast = useToast();
  const [cash, setCash] = useState("");
  const [busy, setBusy] = useState(false);
  const open = async () => {
    setBusy(true);
    try {
      const r: any = await api("/register/open", { body: { opening_cash: num(cash) } });
      toast("Kasir dibuka — Shift 1");
      onOpened(r.session);
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={[s.list, { maxWidth: 480 }]} testID="open-register-panel">
      <Card style={{ gap: sp.sm }}>
        <Text style={[s.title, { fontSize: 20 }]}>Kasir belum dibuka</Text>
        <Text style={s.sub}>Shift 1 akan tercatat atas nama {userName} sebagai penanggung jawab.</Text>
        <Field label="Modal awal kas (Rp)" testID="opening-cash-input" keyboardType="numeric" value={cash} onChangeText={setCash} />
        <Btn title="Buka Kasir" icon="lock-open-outline" testID="open-register-button" loading={busy} onPress={open} />
      </Card>
    </View>
  );
}

const useP = makeStyles((c) => ({
  pin: { minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.surfaceSecondary, paddingHorizontal: sp.md, fontSize: 22, letterSpacing: 8, color: c.onSurface, marginBottom: sp.md, textAlign: "center" },
}));
