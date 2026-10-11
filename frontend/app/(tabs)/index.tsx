import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, rp, useApi } from "@/src/api";
import { ROLE_LABEL, useAuth } from "@/src/auth";
import { CameraSheet } from "@/src/camera";
import { MODULES, usesNativeTabs } from "@/src/navigation";
import { LiveAttendance, useLiveAttendance } from "@/src/pos-shift";
import { Badge, Btn, Card, Header, Icon, Page, sp, Stat, StateView, useStyles, useToast } from "@/src/ui";
import { useTheme } from "@/src/theme";

export default function Dashboard() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user, can } = useAuth();
  const { data: d, loading, error, reload } = useApi<any>("/dashboard");
  const [busy, setBusy] = useState(false);
  const [camType, setCamType] = useState<string | null>(null);
  const live = useLiveAttendance(can("attendance_all"));
  const payroll = useApi<any>(can("payroll") ? "/payroll/preview" : null);
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const clock = async (type: string, photo: string) => {
    setBusy(true);
    try {
      await api("/attendance", { body: { type, photo } });
      toast(type === "clock_in" ? "Clock in berhasil" : "Clock out berhasil");
      reload();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const onPhoto = (photo: string) => {
    const t = camType;
    setCamType(null);
    if (t) clock(t, photo);
  };

  const att: string[] = d?.my_attendance || [];
  return (
    <Page>
      <Header title={`Halo, ${user?.name?.split(" ")[0] ?? ""}`} subtitle={`${ROLE_LABEL[user!.role]} · RLW · ${d?.date ?? ""}`} />
      <ScrollView contentContainerStyle={[s.list, { paddingBottom: bottomChrome + sp.xl }]} refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}>
        {!d ? (
          <StateView loading={loading} error={error} onRetry={reload} />
        ) : (
          <>
            <Card testID="attendance-card" style={[s.row, { justifyContent: "space-between", flexWrap: "wrap" }]}>
              <View style={{ flex: 1, minWidth: 160 }}>
                <Text style={s.title}>Absensi Hari Ini</Text>
                <Text style={s.sub} testID="attendance-status-text">
                  {att.includes("clock_out") ? "Shift selesai" : att.includes("clock_in") ? "Sedang bertugas" : "Belum clock in"}
                </Text>
              </View>
              {!att.includes("clock_in") ? (
                <Btn title="Clock In" icon="camera-outline" testID="dashboard-clock-in-button" loading={busy} onPress={() => setCamType("clock_in")} />
              ) : !att.includes("clock_out") ? (
                <Btn title="Clock Out" variant="secondary" icon="camera-outline" testID="dashboard-clock-out-button" loading={busy} onPress={() => setCamType("clock_out")} />
              ) : (
                <Badge label="Selesai" tone="success" />
              )}
            </Card>

            {d.sales_today !== undefined && (
              <View style={s.wrap}>
                <Stat label="Penjualan Hari Ini" icon="trending-up" value={rp(d.sales_today)} tone="brand" testID="stat-sales-today" />
                <Stat label="Transaksi" icon="receipt-outline" value={String(d.trx_today)} testID="stat-trx-today" />
                <Stat label="Laba Kotor" icon="sparkles-outline" value={rp(d.profit_today)} tone="success" testID="stat-profit-today" />
              </View>
            )}
            {d.finance_month && (
              <View style={s.wrap}>
                <Stat label="Pemasukan Bulan Ini" value={rp(d.finance_month.income)} tone="success" testID="stat-income-month" />
                <Stat label="Pengeluaran Bulan Ini" value={rp(d.finance_month.expense)} tone="error" testID="stat-expense-month" />
                <Stat label="Cash Flow Bersih" value={rp(d.finance_month.net)} tone={d.finance_month.net >= 0 ? "success" : "error"} testID="stat-net-month" />
              </View>
            )}
            {(d.pending_waste !== undefined || d.active_promos !== undefined) && (
              <View style={s.wrap}>
                {d.pending_pr !== undefined && (
                  <Card style={{ flexGrow: 1, flexBasis: 150 }} onPress={() => router.push("/m/purchasing")} testID="pending-pr-card">
                    <Text style={s.sub}>PR menunggu approval</Text>
                    <Text style={s.value}>{d.pending_pr} · siap terima {d.approved_pr}</Text>
                  </Card>
                )}
                {d.pending_waste !== undefined && (
                  <Card style={{ flexGrow: 1, flexBasis: 150 }} onPress={() => router.push("/m/waste")} testID="pending-waste-card">
                    <Text style={s.sub}>Waste menunggu approval</Text>
                    <Text style={s.value}>{d.pending_waste}</Text>
                  </Card>
                )}
                {d.active_promos !== undefined && (
                  <Card style={{ flexGrow: 1, flexBasis: 150 }} onPress={() => router.push("/m/marketing")} testID="active-promos-card">
                    <Text style={s.sub}>Promo aktif</Text>
                    <Text style={s.value}>{d.active_promos}</Text>
                  </Card>
                )}
              </View>
            )}

            {can("attendance_all") && (
              <Card testID="dashboard-live-attendance">
                <View style={[s.row, { justifyContent: "space-between", marginBottom: sp.sm }]}>
                  <Text style={s.title}>Absensi Realtime</Text>
                  <Btn small variant="ghost" title="Detail" testID="dashboard-attendance-detail" onPress={() => router.push("/m/attendance")} />
                </View>
                <LiveAttendance data={live.data} compact />
                {!!d.pending_overtime && <Text style={[s.sub, { color: colors.warning, marginTop: sp.sm }]}>{d.pending_overtime} pengajuan lembur menunggu ACC</Text>}
              </Card>
            )}
            {can("payroll") && payroll.data && (
              <Card testID="dashboard-payroll-estimate" onPress={() => router.push("/m/payroll")}>
                <Text style={s.sub}>Estimasi gaji bulan ini (realtime dari absensi)</Text>
                <Text style={s.value}>{rp(payroll.data.total)}</Text>
                <Text style={s.sub}>{payroll.data.hours} jam kerja · potongan telat {rp(payroll.data.late_penalty)}</Text>
              </Card>
            )}

            {d.low_stock && (
              <Card testID="low-stock-card">
                <View style={[s.row, { justifyContent: "space-between" }]}>
                  <View style={s.row}>
                    <Icon name="warning-outline" size={20} color={d.low_stock.length ? colors.warning : colors.success} />
                    <Text style={s.title}>Stok Rendah ({d.low_stock.length})</Text>
                  </View>
                  {d.low_stock.length > 0 && can("purchase") && <Btn small title="Ajukan PR" variant="secondary" testID="low-stock-create-pr-button" onPress={() => router.push("/m/purchasing?auto=1")} />}
                </View>
                {d.low_stock.length === 0 && <Text style={s.sub}>Semua stok aman.</Text>}
                {d.low_stock.map((i: any) => (
                  <View key={i.name} style={[s.row, { justifyContent: "space-between", marginTop: sp.sm }]}>
                    <Text style={{ color: colors.onSurface, fontWeight: "600" }}>{i.name}</Text>
                    <Text style={{ color: colors.error, fontWeight: "700" }}>
                      {i.total} / min {i.min} {i.unit}
                    </Text>
                  </View>
                ))}
              </Card>
            )}

            <Text style={s.section}>Menu Cepat</Text>
            <View style={s.wrap}>
              {MODULES.filter((m) => can(m.perm)).map((m) => (
                <Card key={m.key} testID={`quick-${m.key}`} onPress={() => router.push(m.route as any)} style={{ flexGrow: 1, flexBasis: 140, alignItems: "flex-start", gap: sp.sm }}>
                  <Icon name={m.icon as any} size={24} color={colors.brandPrimary} />
                  <Text style={s.title}>{m.title}</Text>
                </Card>
              ))}
            </View>
          </>
        )}
      </ScrollView>
      <CameraSheet visible={!!camType} onClose={() => setCamType(null)} onCapture={onPhoto} title={camType === "clock_out" ? "Foto Clock Out" : "Foto Clock In"} />
    </Page>
  );
}
