import { useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, rp, useApi } from "@/src/api";
import { Btn, Card, Field, Header, Page, Sheet, sp, StateView, useStyles, useToast } from "@/src/ui";
import { useTheme } from "@/src/theme";

export default function Customers() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [q, setQ] = useState("");
  const { data, loading, error, reload } = useApi<any[]>(`/customers?q=${encodeURIComponent(q)}`);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setBusy(true);
    try {
      await api("/customers", { body: { name, phone } });
      toast("Pelanggan ditambahkan");
      setOpen(false);
      setName("");
      setPhone("");
      reload();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <Header back title="Pelanggan & Poin" subtitle="Member loyalti RLW" right={<Btn small title="Tambah" icon="add" testID="customer-add-button" onPress={() => setOpen(true)} />} />
      <View style={{ paddingHorizontal: sp.lg, paddingTop: sp.md }}>
        <TextInput testID="customer-search-input" placeholder="Cari nama / no. HP" placeholderTextColor={colors.muted} value={q} onChangeText={setQ} onSubmitEditing={reload} style={{ minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: sp.md, color: colors.onSurface, backgroundColor: colors.surfaceSecondary }} />
      </View>
      {!data ? <StateView loading={loading} error={error} onRetry={reload} /> : (
        <FlatList
          data={data}
          keyExtractor={(c) => c.id}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + sp.xl }]}
          ListEmptyComponent={<StateView empty="Belum ada pelanggan" />}
          renderItem={({ item: c }) => (
            <Card testID={`customer-row-${c.id}`} style={[s.row, { justifyContent: "space-between" }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{c.name}</Text>
                <Text style={s.sub}>{c.phone || "-"} · {c.visits} kunjungan · {rp(c.total_spent)}</Text>
              </View>
              <Text style={[s.value, { color: colors.brandPrimary }]}>{c.points} poin</Text>
            </Card>
          )}
        />
      )}
      <Sheet visible={open} onClose={() => setOpen(false)} title="Pelanggan Baru" testID="customer-sheet">
        <Field label="Nama" testID="customer-name-input" value={name} onChangeText={setName} />
        <Field label="No. HP" testID="customer-phone-input" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <Btn title="Simpan" testID="customer-submit-button" loading={busy} disabled={!name} onPress={add} />
      </Sheet>
    </Page>
  );
}
