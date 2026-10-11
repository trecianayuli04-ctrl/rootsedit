import { useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApi } from "@/src/api";
import { Badge, Card, Chips, Header, Page, Sheet, sp, StateView, useStyles } from "@/src/ui";

const ACTION_TONE: Record<string, any> = { create: "info", update: "warning", void: "error", cancelled: "error", adjust: "warning", pay: "success", decide: "info", request: "muted" };

export default function Audit() {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const [entity, setEntity] = useState("all");
  const { data, loading, error, reload } = useApi<any>(`/audit?entity=${entity}`);
  const [sel, setSel] = useState<any>(null);
  const entities = useMemo(() => [{ label: "Semua", value: "all" }, ...((data?.entities || []).map((e: string) => ({ label: e, value: e })))], [data]);

  return (
    <Page>
      <Header back title="Audit Keuangan" subtitle="Jejak semua perubahan penting" />
      <Chips testPrefix="audit-entity" value={entity} onChange={setEntity} options={entities} />
      {!data ? <StateView loading={loading} error={error} onRetry={reload} /> : (
        <FlatList
          data={data.logs}
          keyExtractor={(x) => x.id}
          onRefresh={reload}
          refreshing={false}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + sp.xl }]}
          ListEmptyComponent={<StateView empty="Belum ada catatan audit" />}
          renderItem={({ item: x }) => (
            <Card testID={`audit-${x.id}`} onPress={() => setSel(x)}>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={[s.title, { flex: 1 }]}>{x.entity} · {x.action}</Text>
                <Badge label={String(x.action).toUpperCase()} tone={ACTION_TONE[x.action] || "muted"} />
              </View>
              <Text style={s.sub}>{x.user_name} ({x.role}) · {new Date(x.created_at).toLocaleString("id-ID")}</Text>
              {!!x.reason && <Text style={s.sub} numberOfLines={1}>Alasan: {x.reason}</Text>}
            </Card>
          )}
        />
      )}
      <Sheet visible={!!sel} onClose={() => setSel(null)} title="Detail Audit" testID="audit-detail">
        {sel && (
          <View style={{ gap: sp.sm }}>
            <Text style={s.title}>{sel.entity} · {sel.action}</Text>
            <Text style={s.sub}>Oleh {sel.user_name} ({sel.role})</Text>
            <Text style={s.sub}>{new Date(sel.created_at).toLocaleString("id-ID")}</Text>
            {!!sel.reason && <Text style={s.sub}>Alasan: {sel.reason}</Text>}
            <Text style={[s.section, { marginTop: sp.md }]}>Sebelum</Text>
            <Text style={s.sub}>{sel.before ? JSON.stringify(sel.before, null, 2) : "—"}</Text>
            <Text style={s.section}>Sesudah</Text>
            <Text style={s.sub}>{sel.after ? JSON.stringify(sel.after, null, 2) : "—"}</Text>
          </View>
        )}
      </Sheet>
    </Page>
  );
}
