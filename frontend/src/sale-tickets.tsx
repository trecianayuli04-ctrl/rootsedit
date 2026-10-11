import { useState } from "react";
import { Text, View } from "react-native";

import { api, num, rp } from "@/src/api";
import { useAuth } from "@/src/auth";
import { escposText, printTickets, Station, STATION_LABEL, stationsFor } from "@/src/receipt";
import { TicketPreview } from "@/src/ticket-preview";
import { Badge, Btn, Chips, Field, sp, STATUS_TONE, useStyles, useToast } from "@/src/ui";

// Body bersama untuk POS "setelah bayar" dan detail Riwayat Nota:
// preview nota, cetak/cetak-ulang (dengan log), void/batal, penyesuaian pembayaran.
export function SaleTickets({ sale, settings, onVoided }: { sale: any; settings: any; onVoided?: (s: any) => void }) {
  const s = useStyles();
  const toast = useToast();
  const { can } = useAuth();
  const stations = stationsFor(sale);
  const [st, setSt] = useState<Station>("customer");
  const [voidKind, setVoidKind] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [adjKind, setAdjKind] = useState<string | null>(null);
  const [adjAmount, setAdjAmount] = useState("");
  const [adjNote, setAdjNote] = useState("");
  const [busy, setBusy] = useState(false);
  const status = sale.status || "paid";
  const voided = status === "void" || status === "cancelled";
  const total = sale.final_total ?? sale.total;

  const logPrint = async (list: Station[], ok: boolean) => {
    try {
      for (const station of list) await api(`/sales/${sale.id}/print-log`, { body: { station, status: ok ? "success" : "failed" } });
    } catch {}
  };
  const print = async (list: Station[]) => {
    try {
      await printTickets(sale, settings, list);
      await logPrint(list, true);
      onVoided?.({ ...sale, print_count: (sale.print_count || 0) + list.length });
    } catch (e: any) {
      await logPrint(list, false);
      toast(e.message || "Gagal print — tercatat, bisa cetak ulang", "error");
    }
  };
  const doVoid = async () => {
    setBusy(true);
    try {
      await api(`/sales/${sale.id}/void`, { body: { kind: voidKind, reason } });
      toast("Nota di-void — transaksi dibatalkan, nilai kembali Rp 0 (stok & keuangan dikembalikan)");
      onVoided?.({ ...sale, status: voidKind, void_reason: reason });
      setVoidKind(null);
      setReason("");
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const doAdjust = async () => {
    setBusy(true);
    try {
      const r = await api<any>(`/sales/${sale.id}/adjust`, { body: { type: adjKind, amount: num(adjAmount), note: adjNote } });
      toast(adjKind === "refund" ? "Refund dicatat, total nota diperbarui" : "Tambahan bayar dicatat");
      onVoided?.({ ...sale, final_total: r.final_total, adjustments: [...(sale.adjustments || []), r.adjustment] });
      setAdjKind(null);
      setAdjAmount("");
      setAdjNote("");
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: sp.md }}>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Text style={s.title} testID="sale-number-text">{sale.number}</Text>
        <Badge label={status === "paid" ? "LUNAS" : status === "void" ? "VOID" : "DIBATALKAN"} tone={voided ? "error" : "success"} />
      </View>
      <Text style={s.sub}>{sale.date} {sale.time} · {sale.cashier_name} · {rp(total)}{sale.channel === "platform" ? ` · ${sale.platform}` : ""}</Text>
      {!!sale.print_count && <Text style={s.sub}>Dicetak {sale.print_count}x</Text>}
      {voided && <Text style={s.sub}>Alasan: {sale.void_reason} {sale.void_by ? `· oleh ${sale.void_by}` : ""}</Text>}
      {!!(sale.adjustments || []).length && (
        <View style={{ gap: 2 }}>
          {sale.adjustments.map((a: any, i: number) => (
            <Text key={i} style={s.sub}>{a.type === "refund" ? "Refund" : "Tambahan"} {rp(a.amount)} · {a.note || "-"} · {a.by}</Text>
          ))}
        </View>
      )}
      <View style={{ marginHorizontal: -sp.lg }}>
        <Chips testPrefix="ticket-tab" value={st} onChange={setSt} options={stations.map((x) => ({ label: STATION_LABEL[x], value: x }))} />
      </View>
      <TicketPreview sale={sale} settings={settings} station={st} />
      <View style={s.row}>
        <Btn title="Cetak Semua" icon="print-outline" style={{ flex: 1 }} testID="print-all-button" onPress={() => print(stations)} />
        <Btn title="Cetak Ini" variant="secondary" style={{ flex: 1 }} testID="print-one-button" onPress={() => print([st])} />
      </View>
      {!voided && can("adjust") && !adjKind && !voidKind && (
        <View style={s.row}>
          <Btn title="Refund Sebagian" variant="ghost" icon="arrow-undo-outline" style={{ flex: 1 }} testID="adjust-refund-button" onPress={() => setAdjKind("refund")} />
          <Btn title="Tambah Bayar" variant="ghost" icon="add-circle-outline" style={{ flex: 1 }} testID="adjust-additional-button" onPress={() => setAdjKind("additional")} />
        </View>
      )}
      {adjKind && (
        <View>
          <Text style={[s.sub, { marginBottom: sp.sm }]}>{adjKind === "refund" ? "Pelanggan ganti pesanan lebih murah / batal sebagian — uang dikembalikan." : "Pelanggan tambah pesanan — tambahan bayar diterima."}</Text>
          <Field label="Nominal (Rp)" testID="adjust-amount-input" keyboardType="numeric" value={adjAmount} onChangeText={setAdjAmount} />
          <Field label="Keterangan" testID="adjust-note-input" value={adjNote} onChangeText={setAdjNote} />
          <View style={s.row}>
            <Btn title="Batal" variant="ghost" style={{ flex: 1 }} onPress={() => setAdjKind(null)} />
            <Btn title="Simpan Penyesuaian" variant="success" style={{ flex: 1 }} loading={busy} disabled={!num(adjAmount)} testID="adjust-confirm-button" onPress={doAdjust} />
          </View>
        </View>
      )}
      {!voided && can("sales_void") && !voidKind && !adjKind && (
        <Btn title="Void (Batalkan Pesanan)" variant="ghost" icon="close-circle-outline" testID="void-sale-button" onPress={() => setVoidKind("void")} />
      )}
      {voidKind && (
        <View>
          <Field label="Alasan void (salah input, dll) — nilai kembali Rp 0" testID="void-reason-input" value={reason} onChangeText={setReason} />
          <View style={s.row}>
            <Btn title="Kembali" variant="ghost" style={{ flex: 1 }} testID="void-back-button" onPress={() => setVoidKind(null)} />
            <Btn title="Konfirmasi Void" variant="danger" style={{ flex: 1 }} loading={busy} disabled={!reason.trim()} testID="void-confirm-button" onPress={doVoid} />
          </View>
        </View>
      )}
    </View>
  );
}

export { STATUS_TONE, escposText };
