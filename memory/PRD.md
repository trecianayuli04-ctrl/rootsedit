# PRD — ROOTS/RLW Outlet Management (FINALROOTS1)

## Original Problem Statement
Bug fix for "Tutup Kasir" cash reconciliation. The remaining cash at register close stayed equal to opening cash (kas awal) and ignored cash movements during the shift; there was no way to enter the physically counted cash (Kas Aktual), so shortage/overage (Selisih) was never visible. Expense flow also exposed payment-type options that don't apply to a cash-only drawer.

## Architecture
- Frontend: Expo React Native Web (expo-router), `/app/frontend`, served via `expo start --port 3000`. API base from `EXPO_PUBLIC_BACKEND_URL`.
- Backend: FastAPI, `/app/backend/server.py`, routes prefixed `/api`, bind 0.0.0.0:8001 (supervisor).
- DB: MongoDB (`MONGO_URL`, `DB_NAME=test_database`). Seeds users/menus/config on startup.
- Multi-outlet ready (single outlet `rollow-main`). JWT auth + Emergent Google session.

## Corrected Logic (locked) — Cash Drawer = CASH ONLY
- Kas Sistem = kas_awal + total_pemasukan_cash − total_pengeluaran_cash
- Only finance docs with `method == "Cash"` bound to the active `session_id` affect the drawer.
- Kas Aktual = physically counted cash (new input at Tutup Kasir).
- Selisih = Kas Aktual − Kas Sistem (negative=Kurang, positive=Lebih, zero=Seimbang).

## Implemented (2026-06, this session)
- `cash_ledger()` now returns kas_awal, total_pemasukan_cash, total_pengeluaran_cash, kas_sistem (plus legacy cash_in/cash_out/expected_cash).
- `pos_close()` accepts `CloseIn{kas_aktual}`; recomputes kas_sistem from persisted cash transactions; persists kas_awal, total_pemasukan_cash, total_pengeluaran_cash, kas_sistem, kas_aktual, selisih on the register_closes record.
- Tutup Kasir sheet (`app/(tabs)/pos.tsx`): shows Kas Awal, Pemasukan (cash), Pengeluaran (cash), Kas Sistem, Kas Aktual input, and live Selisih with Kurang/Lebih/Seimbang label + color; sends kas_aktual to /pos/close. Rupiah-formatted, handles empty/zero.
- Removed the "Sumber dana" / payment-method selector from POS Kas Keluar (`src/pos-extra.tsx`); kasir expenses default to Cash.
- Non-cash (QRIS/Debit/Transfer) transactions never affect the drawer (filter guard verified).

## Implemented (2026-06, follow-up — Void-to-Zero)
- Void = transaksi batal total → nilai kembali Rp 0, BUKAN baris minus: baris pemasukan (dan biaya) nota di finance dinolkan (`amount=0`, `voided=true`, `original_amount` disimpan untuk audit). Tidak ada baris refund bernilai negatif lagi (`pay_refund_doc` dihapus, `VoidIn.refund_now` dihapus).
- Opsi terpisah "Batalkan Pesanan" (cancelled) DIHAPUS dari UI nota — tersisa satu tombol "Void (Batalkan Pesanan)" (`void-sale-button`). Status legacy `cancelled` masih diterima backend untuk data lama.
- Kas Outlet: baris void tidak muncul di riwayat; saldo kembali ke kas awal setelah void.
- Verifikasi testing agent iteration_3: backend 8/8 PASS, frontend 100% (1 tombol void saja, badge VOID, tanpa entri -Rp).

## Verification
Testing agent iteration_2: backend 9/9 pytest PASS (cases 1-8), frontend 100%. No open bugs.
Test file: `/app/backend/tests/test_tutup_kasir.py`. Credentials in `/app/memory/test_credentials.md`.

## Deployment
- Deploy attempt failed at build_image: Expo/RN app on shadcn base image — node engine check (needs >=20.19.4 vs 20.19.2) + missing `build` script. Deployer staged a manifest override (yarn --ignore-engines; `yarn expo export --platform web`) on pending run 5077783d — auto-adopted on next redeploy.
- BLOCKER: insufficient credits (needs 50 ECU, available 46.83). User must add balance, then redeploy.

## Backlog / Next (P2, non-blocking)
- Optional: split server.py into modules (auth/pos/finance/inventory/payroll).
- Optional: compute register_closes record explicitly instead of spread-override.
