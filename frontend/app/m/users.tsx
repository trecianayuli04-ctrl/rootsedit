import { useState } from "react";
import { FlatList, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, num, rp, useApi } from "@/src/api";
import { ROLE_LABEL } from "@/src/auth";
import { Badge, Btn, Card, Chips, Field, Header, Page, Sheet, sp, StateView, useStyles, useToast } from "@/src/ui";

const EMPTY = { email: "", password: "", name: "", role: "crew", position: "", base_salary: "", allowance: "", is_active: true, pin: "", hourly_rate: "", overtime_rate: "", shift_start: "08:00" };

export default function Users() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { data, loading, error, reload } = useApi<any[]>("/users");
  const [edit, setEdit] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (v: any) => setEdit({ ...edit, [k]: v });

  const submit = async () => {
    setBusy(true);
    try {
      const body = { ...edit, base_salary: num(String(edit.base_salary)), allowance: num(String(edit.allowance)), hourly_rate: num(String(edit.hourly_rate ?? "")), overtime_rate: num(String(edit.overtime_rate ?? "")), shift_start: edit.shift_start || "", password: edit.password || null, pin: edit.pin || null };
      await api(edit.id ? `/users/${edit.id}` : "/users", { method: edit.id ? "PUT" : "POST", body });
      toast("Data karyawan disimpan");
      setEdit(null);
      reload();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Header back title="Karyawan & Akses" subtitle="Akun login, jabatan & gaji" right={<Btn small title="Tambah" icon="add" testID="user-add-button" onPress={() => setEdit({ ...EMPTY })} />} />
      {!data ? <StateView loading={loading} error={error} onRetry={reload} /> : (
        <FlatList
          data={data}
          keyExtractor={(u) => u.id}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + sp.xl }]}
          renderItem={({ item: u }) => (
            <Card testID={`user-item-${u.id}`} onPress={() => setEdit({ ...u, password: "", pin: "", base_salary: String(u.base_salary ?? 0), allowance: String(u.allowance ?? 0), hourly_rate: String(u.hourly_rate ?? 0), overtime_rate: String(u.overtime_rate ?? 0), shift_start: u.shift_start ?? "" })}>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={[s.title, { flex: 1 }]}>{u.name}</Text>
                <Badge label={ROLE_LABEL[u.role as keyof typeof ROLE_LABEL]} tone="brand" />
                {!u.is_active && <Badge label="NONAKTIF" />}
              </View>
              <Text style={s.sub}>{u.email} · {u.position}</Text>
              <Text style={s.sub}>Gaji {rp(u.base_salary)} · Tunjangan {rp(u.allowance)} · {rp(u.hourly_rate)}/jam · masuk {u.shift_start || "-"} · {u.has_pin ? "PIN ✓" : "PIN belum diatur"}</Text>
            </Card>
          )}
        />
      )}
      <Sheet visible={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit Karyawan" : "Karyawan Baru"} testID="user-sheet">
        {edit && (
          <>
            <Field label="Nama" testID="user-name-input" value={edit.name} onChangeText={set("name")} />
            <Field label="Email (bisa Gmail untuk login Google)" testID="user-email-input" autoCapitalize="none" keyboardType="email-address" value={edit.email} onChangeText={set("email")} />
            <Field label={edit.id ? "Password baru (kosongkan bila tetap)" : "Password"} testID="user-password-input" secureTextEntry value={edit.password} onChangeText={set("password")} />
            <View style={{ marginHorizontal: -sp.lg }}>
              <Text style={[s.section, { marginHorizontal: sp.lg }]}>Jabatan / Hak Akses</Text>
              <Chips testPrefix="user-role" value={edit.role} onChange={set("role")} options={Object.entries(ROLE_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
            </View>
            <Field label="Posisi" testID="user-position-input" value={edit.position} onChangeText={set("position")} />
            <View style={s.row}>
              <View style={{ flex: 1 }}><Field label="Gaji pokok" testID="user-salary-input" keyboardType="numeric" value={edit.base_salary} onChangeText={set("base_salary")} /></View>
              <View style={{ flex: 1 }}><Field label="Tunjangan" testID="user-allowance-input" keyboardType="numeric" value={edit.allowance} onChangeText={set("allowance")} /></View>
            </View>
            <View style={s.row}>
              <View style={{ flex: 1 }}><Field label="Gaji per jam" testID="user-hourly-input" keyboardType="numeric" value={edit.hourly_rate} onChangeText={set("hourly_rate")} /></View>
              <View style={{ flex: 1 }}><Field label="Lembur per jam" testID="user-overtime-input" keyboardType="numeric" value={edit.overtime_rate} onChangeText={set("overtime_rate")} /></View>
            </View>
            <View style={s.row}>
              <View style={{ flex: 1 }}><Field label="Jam masuk (HH:MM)" testID="user-shift-input" value={edit.shift_start} onChangeText={set("shift_start")} placeholder="08:00" /></View>
              <View style={{ flex: 1 }}><Field label={edit.has_pin ? "PIN baru (opsional)" : "PIN absen 4-6 angka"} testID="user-pin-input" keyboardType="number-pad" secureTextEntry maxLength={6} value={edit.pin} onChangeText={set("pin")} /></View>
            </View>
            <View style={[s.row, { justifyContent: "space-between", marginBottom: sp.md }]}>
              <Text style={s.title}>Aktif</Text>
              <Switch testID="user-active-switch" value={edit.is_active} onValueChange={set("is_active")} />
            </View>
            <Btn title="Simpan" testID="user-submit-button" loading={busy} disabled={!edit.name || !edit.email} onPress={submit} />
          </>
        )}
      </Sheet>
    </Page>
  );
}
