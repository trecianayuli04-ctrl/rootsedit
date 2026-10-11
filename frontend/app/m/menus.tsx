import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, num, rp, useApi } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Btn, Card, Chips, Field, Header, Icon, Page, Sheet, sp, StateView, useStyles, useToast } from "@/src/ui";
import { useTheme } from "@/src/theme";

export default function Menus() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { can } = useAuth();
  const editable = can("menu_edit");
  const [tab, setTab] = useState("menu");
  const menus = useApi<any[]>("/menus");
  const ings = useApi<any[]>("/ingredients");
  const [m, setM] = useState<any>(null);
  const [ing, setIng] = useState<any>(null);
  const [rIng, setRIng] = useState("");
  const [rQty, setRQty] = useState("");
  const [busy, setBusy] = useState(false);
  const imap = Object.fromEntries((ings.data || []).map((i) => [i.id, i]));
  const hpp = m ? m.recipe.reduce((a: number, r: any) => a + r.qty * (imap[r.ingredient_id]?.cost_per_unit || 0), 0) : 0;

  const save = async (path: string, id: string | undefined, body: any, done: () => void) => {
    setBusy(true);
    try {
      await api(id ? `${path}/${id}` : path, { method: id ? "PUT" : "POST", body });
      toast("Tersimpan");
      done();
      menus.reload();
      ings.reload();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const addRecipe = () => {
    if (!rIng || !num(rQty)) return;
    setM({ ...m, recipe: [...m.recipe.filter((r: any) => r.ingredient_id !== rIng), { ingredient_id: rIng, qty: num(rQty) }] });
    setRQty("");
  };

  return (
    <Page>
      <Header back title="Menu & Resep" subtitle="HPP dihitung otomatis dari harga bahan" right={editable ? <Btn small title="Tambah" icon="add" testID="menu-add-button" onPress={() => (tab === "menu" ? setM({ name: "", category: "Minuman", price: "", location: "bar", recipe: [], is_active: true }) : setIng({ name: "", unit: "gram", cost_per_unit: "", min_stock: "", category: "Bahan" }))} /> : undefined} />
      <Chips testPrefix="menus-tab" value={tab} onChange={setTab} options={[{ label: "Menu", value: "menu" }, { label: "Bahan Baku", value: "ing" }]} />
      {tab === "menu" ? (
        !menus.data ? <StateView loading={menus.loading} error={menus.error} onRetry={menus.reload} /> : (
          <FlatList
            data={menus.data}
            keyExtractor={(x) => x.id}
            contentContainerStyle={[s.list, { paddingBottom: insets.bottom + sp.xl }]}
            renderItem={({ item: x }) => (
              <Card testID={`menu-card-${x.id}`} onPress={editable ? () => setM({ ...x, price: String(x.price), recipe: x.recipe }) : undefined}>
                <View style={[s.row, { justifyContent: "space-between" }]}>
                  <Text style={[s.title, { flex: 1 }]}>{x.name}</Text>
                  <Text style={[s.value, { color: colors.brandPrimary }]}>{rp(x.price)}</Text>
                </View>
                <Text style={s.sub}>{x.category} · stok {x.location} · nota {(x.station || x.location) === "kitchen" ? "Dapur" : "Bar"} · HPP {rp(x.hpp)} · Margin {rp(x.margin)} ({x.price ? Math.round((x.margin / x.price) * 100) : 0}%)</Text>
                <Text style={s.sub}>Resep: {x.recipe_detail.map((r: any) => `${r.name} ${r.qty}${r.unit}`).join(", ") || "-"}</Text>
              </Card>
            )}
          />
        )
      ) : !ings.data ? <StateView loading={ings.loading} error={ings.error} onRetry={ings.reload} /> : (
        <FlatList
          data={ings.data}
          keyExtractor={(x) => x.id}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + sp.xl }]}
          renderItem={({ item: x }) => (
            <Card testID={`ing-card-${x.id}`} onPress={editable ? () => setIng({ ...x, cost_per_unit: String(x.cost_per_unit), min_stock: String(x.min_stock) }) : undefined}>
              <Text style={s.title}>{x.name}</Text>
              <Text style={s.sub}>{rp(x.cost_per_unit)} / {x.unit} · Min stok {x.min_stock} {x.unit}</Text>
            </Card>
          )}
        />
      )}
      <Sheet visible={!!m} onClose={() => setM(null)} title={m?.id ? "Edit Menu" : "Menu Baru"} testID="menu-sheet">
        {m && (
          <>
            <Field label="Nama menu" testID="menu-name-input" value={m.name} onChangeText={(v) => setM({ ...m, name: v })} />
            <Field label="Harga jual (Rp)" testID="menu-price-input" keyboardType="numeric" value={m.price} onChangeText={(v) => setM({ ...m, price: v })} />
            <View style={{ marginHorizontal: -sp.lg }}>
              <Chips testPrefix="menu-cat" value={m.category} onChange={(v) => setM({ ...m, category: v })} options={["Minuman", "Makanan", "Snack"].map((c) => ({ label: c, value: c }))} />
              <Chips testPrefix="menu-loc" value={m.location} onChange={(v) => setM({ ...m, location: v })} options={[{ label: "Potong stok Bar", value: "bar" }, { label: "Potong stok Kitchen", value: "kitchen" }]} />
              <Chips testPrefix="menu-station" value={m.station || m.location} onChange={(v) => setM({ ...m, station: v })} options={[{ label: "Print ke Nota Bar", value: "bar" }, { label: "Print ke Nota Dapur", value: "kitchen" }]} />
            </View>
            <Text style={s.section}>Resep · HPP {rp(hpp)}</Text>
            {m.recipe.map((r: any) => (
              <View key={r.ingredient_id} style={[s.row, { justifyContent: "space-between", paddingVertical: sp.xs }]}>
                <Text style={{ color: colors.onSurface, flex: 1 }}>{imap[r.ingredient_id]?.name} · {r.qty} {imap[r.ingredient_id]?.unit}</Text>
                <Pressable hitSlop={10} testID={`recipe-remove-${r.ingredient_id}`} onPress={() => setM({ ...m, recipe: m.recipe.filter((x: any) => x !== r) })}><Icon name="close-circle" size={22} color={colors.error} /></Pressable>
              </View>
            ))}
            <View style={{ marginHorizontal: -sp.lg }}>
              <Chips testPrefix="recipe-ing" value={rIng} onChange={setRIng} options={(ings.data || []).map((i) => ({ label: i.name, value: i.id }))} />
            </View>
            <View style={[s.row, { alignItems: "flex-end" }]}>
              <View style={{ flex: 1 }}><Field label={`Takaran (${imap[rIng]?.unit ?? "pilih bahan"})`} testID="recipe-qty-input" keyboardType="numeric" value={rQty} onChangeText={setRQty} /></View>
              <Btn title="Tambah" variant="secondary" testID="recipe-add-button" style={{ marginBottom: sp.md }} onPress={addRecipe} />
            </View>
            <Btn title="Simpan Menu" testID="menu-submit-button" loading={busy} disabled={!m.name || !num(m.price)} onPress={() => save("/menus", m.id, { name: m.name, category: m.category, price: num(m.price), location: m.location, station: m.station || m.location, recipe: m.recipe, is_active: m.is_active }, () => setM(null))} />
          </>
        )}
      </Sheet>
      <Sheet visible={!!ing} onClose={() => setIng(null)} title={ing?.id ? "Edit Bahan" : "Bahan Baru"} testID="ing-sheet">
        {ing && (
          <>
            <Field label="Nama bahan" testID="ing-name-input" value={ing.name} onChangeText={(v) => setIng({ ...ing, name: v })} />
            <View style={{ marginHorizontal: -sp.lg }}>
              <Chips testPrefix="ing-unit" value={ing.unit} onChange={(v) => setIng({ ...ing, unit: v })} options={["gram", "ml", "pcs"].map((u) => ({ label: u, value: u }))} />
            </View>
            <Field label={`Harga per ${ing.unit} (Rp)`} testID="ing-cost-input" keyboardType="numeric" value={ing.cost_per_unit} onChangeText={(v) => setIng({ ...ing, cost_per_unit: v })} />
            <Field label={`Minimum stok (${ing.unit})`} testID="ing-min-input" keyboardType="numeric" value={ing.min_stock} onChangeText={(v) => setIng({ ...ing, min_stock: v })} />
            <Btn title="Simpan Bahan" testID="ing-submit-button" loading={busy} disabled={!ing.name} onPress={() => save("/ingredients", ing.id, { name: ing.name, unit: ing.unit, cost_per_unit: num(ing.cost_per_unit), min_stock: num(ing.min_stock), category: "Bahan" }, () => setIng(null))} />
          </>
        )}
      </Sheet>
    </Page>
  );
}
