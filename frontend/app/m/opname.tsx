import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, num, rp, useApi } from "@/src/api";
import { LOCS } from "@/src/navigation";
import { Btn, Card, Chips, Header, Page, Sheet, sp, StateView, useStyles, useToast } from "@/src/ui";
import { makeStyles, useTheme } from "@/src/theme";

export default function Opname() {
  const s = useStyles();
  const o = useO();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { data: ings, loading, error, reload } = useApi<any[]>("/ingredients");
  const { data: hist, reload: reloadHist } = useApi<any[]>("/opname");
  const [loc, setLoc] = useState("bar");
  const [vals, setVals] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const items = (ings || []).filter((i) => i.stock[loc] > 0 || vals[`${loc}:${i.id}`]);

  const submit = async () => {
    const lines = items.filter((i) => vals[`${loc}:${i.id}`] !== undefined && vals[`${loc}:${i.id}`] !== "").map((i) => ({ ingredient_id: i.id, physical: num(vals[`${loc}:${i.id}`]) }));
    if (!lines.length) return toast("Isi minimal satu stok fisik", "error");
    setBusy(true);
    try {
      setResult(await api("/opname", { body: { location: loc, lines } }));
      setVals({});
      reload();
      reloadHist();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Header back title="Stock Opname" subtitle="Input stok fisik saat tutup" />
      <Chips testPrefix="opname-loc" value={loc} onChange={setLoc} options={LOCS} />
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.list, { paddingBottom: insets.bottom + sp.xl }]}>
        {!ings ? <StateView loading={loading} error={error} onRetry={reload} /> : items.length === 0 ? <StateView empty="Tidak ada stok di lokasi ini" /> : (
          items.map((i) => {
            const v = vals[`${loc}:${i.id}`];
            const diff = v ? num(v) - i.stock[loc] : null;
            return (
              <Card key={i.id} style={[s.row, { justifyContent: "space-between" }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>{i.name}</Text>
                  <Text style={s.sub}>Sistem: {i.stock[loc]} {i.unit}</Text>
                  {diff !== null && <Text style={{ color: diff < 0 ? colors.error : diff > 0 ? colors.success : colors.muted, fontWeight: "700" }}>Selisih {diff > 0 ? "+" : ""}{Math.round(diff * 100) / 100} {i.unit}</Text>}
                </View>
                <TextInput testID={`opname-input-${i.id}`} style={o.input} keyboardType="numeric" placeholder="Fisik" placeholderTextColor={colors.muted} value={v ?? ""} onChangeText={(t) => setVals({ ...vals, [`${loc}:${i.id}`]: t })} />
              </Card>
            );
          })
        )}
        <Btn title="Simpan Stock Opname" icon="save-outline" testID="opname-submit-button" loading={busy} onPress={submit} />
        <Text style={s.section}>Riwayat Opname</Text>
        {(hist || []).map((h) => (
          <Card key={h.id}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={s.title}>{h.date} · {h.location}</Text>
              <Text style={[s.value, { color: h.total_diff_value < 0 ? colors.error : colors.success }]}>{rp(h.total_diff_value)}</Text>
            </View>
            <Text style={s.sub}>{h.lines.length} bahan · oleh {h.user_name}</Text>
          </Card>
        ))}
      </KeyboardAwareScrollView>
      <Sheet visible={!!result} onClose={() => setResult(null)} title="Hasil Opname" testID="opname-result-sheet">
        <ScrollView>
          {result?.lines.map((l: any) => (
            <View key={l.ingredient_id} style={[s.row, { justifyContent: "space-between", paddingVertical: sp.sm }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{l.name}</Text>
                <Text style={s.sub}>Sistem {l.system} · Fisik {l.physical} {l.unit}</Text>
              </View>
              <Text style={{ fontWeight: "800", color: l.diff < 0 ? colors.error : l.diff > 0 ? colors.success : colors.muted }}>{l.diff > 0 ? "+" : ""}{l.diff} {l.unit}</Text>
            </View>
          ))}
          <Text style={[s.value, { marginVertical: sp.md }]} testID="opname-total-diff">Nilai selisih: {rp(result?.total_diff_value)}</Text>
        </ScrollView>
      </Sheet>
    </Page>
  );
}

const useO = makeStyles((c) => ({
  input: { width: 110, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.surface, paddingHorizontal: sp.md, fontSize: 16, color: c.onSurface, textAlign: "right" },
}));
