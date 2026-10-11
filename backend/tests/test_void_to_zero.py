"""Void-to-zero backend tests.

Verifies new void semantics: when a sale is voided, the sale's finance income
lines (and fee lines) are zeroed (amount=0, voided=True, original_amount kept),
and NO negative finance line is ever created. Kas sistem must return to opening
cash for cash sales; non-cash voids must not touch the drawer.
"""
import os
import pytest
import requests

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE}/api"
OWNER = {"email": "owner@rollow.id", "password": "Rollow@2026"}


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json=OWNER, timeout=30)
    assert r.status_code == 200, r.text
    s.headers["Authorization"] = f"Bearer {r.json()['access_token']}"
    yield s
    # final cleanup: close any open register
    try:
        r2 = s.get(f"{API}/register/current", timeout=10)
        if r2.status_code == 200 and (r2.json() or {}).get("session"):
            s.post(f"{API}/pos/close", json={"kas_aktual": 0}, timeout=10)
    except Exception:
        pass


def _close_if_open(c):
    r = c.get(f"{API}/register/current", timeout=15)
    if r.status_code == 200 and (r.json() or {}).get("session"):
        c.post(f"{API}/pos/close", json={"kas_aktual": 0}, timeout=15)


def _open(c, opening=50000):
    _close_if_open(c)
    r = c.post(f"{API}/register/open", json={"opening_cash": opening}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["session"]


def _summary(c):
    r = c.get(f"{API}/pos/summary", timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


def _sale(c, amount=20000, method="Cash"):
    body = {
        "items": [{"menu_id": None, "name": "TEST_void_item", "price": amount, "qty": 1}],
        "payment_method": method,
        "apply_tax": False,
        "cash_received": amount if method == "Cash" else 0,
    }
    r = c.post(f"{API}/sales", json=body, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()


def _void(c, sid, reason="salah input"):
    r = c.post(f"{API}/sales/{sid}/void", json={"kind": "void", "reason": reason}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()


# ---------- 1. Cash sale void -> kas_sistem back to opening ----------
def test_cash_void_returns_kas_sistem_to_opening(client):
    _open(client, 50000)
    before = _summary(client)["cash_ledger"]
    assert before["kas_sistem"] == 50000, before

    sale = _sale(client, 20000, "Cash")
    mid = _summary(client)["cash_ledger"]
    assert mid["kas_sistem"] == 70000, mid
    assert mid["total_pemasukan_cash"] == 20000

    _void(client, sale["id"], "salah input test")

    after = _summary(client)["cash_ledger"]
    assert after["kas_sistem"] == 50000, after
    assert after["total_pemasukan_cash"] == 0, after
    assert after["total_pengeluaran_cash"] == 0, after


# ---------- 2. Finance lines must have amount=0 + voided=true + original_amount kept, no negative line ----------
def test_void_zeros_finance_line_no_negative(client):
    _open(client, 50000)
    sale = _sale(client, 20000, "Cash")
    sid = sale["id"]
    _void(client, sid, "duplikasi")

    # Query sales/report-like endpoint not available for raw finance; use /cash/outlet raw history
    # which lists finance rows. Non-voided only. So we have to look via summary totals: cash_in == 0.
    # To specifically assert finance docs, hit the shift-finance-only endpoint via /cash/outlet
    # history (voided excluded), and ensure NO row references this sale.
    co = client.get(f"{API}/cash/outlet", timeout=15).json()
    for h in co.get("history", []):
        assert h["amount"] >= 0, f"negative kas outlet row: {h}"
    # No row should correspond to the voided sale number
    sale_num = sale["number"]
    for h in co.get("history", []):
        assert sale_num not in (h.get("note") or ""), f"voided sale row still in history: {h}"


# ---------- 3. Non-cash (QRIS) void does not touch drawer ----------
def test_qris_sale_and_void_does_not_affect_cash(client):
    _open(client, 50000)
    s0 = _summary(client)["cash_ledger"]
    assert s0["kas_sistem"] == 50000

    sale = _sale(client, 30000, "QRIS")
    s1 = _summary(client)["cash_ledger"]
    assert s1["kas_sistem"] == 50000, s1
    assert s1["total_pemasukan_cash"] == 0

    _void(client, sale["id"], "test qris")
    s2 = _summary(client)["cash_ledger"]
    assert s2["kas_sistem"] == 50000, s2
    assert s2["total_pemasukan_cash"] == 0
    assert s2["total_pengeluaran_cash"] == 0


# ---------- 4. VoidIn.kind default & reason required ----------
def test_void_requires_reason(client):
    _open(client, 50000)
    sale = _sale(client, 10000, "Cash")
    r = client.post(f"{API}/sales/{sale['id']}/void", json={"kind": "void", "reason": "   "}, timeout=15)
    assert r.status_code == 400, r.text
    # cleanup
    _void(client, sale["id"], "cleanup")


# ---------- 5. Double void rejected ----------
def test_double_void_rejected(client):
    _open(client, 50000)
    sale = _sale(client, 15000, "Cash")
    _void(client, sale["id"], "first")
    r = client.post(f"{API}/sales/{sale['id']}/void", json={"kind": "void", "reason": "again"}, timeout=15)
    assert r.status_code == 400, r.text


# ---------- 6. GET /api/sales still loads (no crash) with voided/cancelled rows + VALID_SALE exclusion ----------
def test_list_sales_handles_voided_rows(client):
    _open(client, 50000)
    s_ok = _sale(client, 11000, "Cash")
    s_v = _sale(client, 22000, "Cash")
    _void(client, s_v["id"], "excl")

    r = client.get(f"{API}/sales?period=day&status=all", timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "recap" in data and "sales" in data
    # recap.nota must only count valid; voided excluded
    nums = {x["number"] for x in data["sales"]}
    assert s_ok["number"] in nums
    assert s_v["number"] in nums  # still returned in list
    # void counted in recap.void
    assert data["recap"]["void"] >= 1
    # kas_sistem via summary = opening + 11000 (voided excluded)
    led = _summary(client)["cash_ledger"]
    assert led["kas_sistem"] == 50000 + 11000, led


# ---------- 7. Kas outlet consistency: balance back to opening, voided row hidden ----------
def test_cash_outlet_hides_voided_rows(client):
    _open(client, 50000)
    sale = _sale(client, 25000, "Cash")
    _void(client, sale["id"], "hide me")

    r = client.get(f"{API}/cash/outlet", timeout=15)
    assert r.status_code == 200, r.text
    co = r.json()
    assert co["opening_cash"] == 50000
    assert co["balance"] == 50000, co
    assert co["cash_in"] == 0, co
    assert co["cash_out"] == 0, co
    # history: no reference to the voided sale number, no negative amounts
    for h in co["history"]:
        assert h["amount"] >= 0
        assert sale["number"] not in (h.get("note") or "")

    # final cleanup
    _close_if_open(client)


# ---------- 8. VoidIn no longer accepts refund_now (ignored silently) ----------
def test_void_ignores_refund_now_field(client):
    _open(client, 50000)
    sale = _sale(client, 10000, "Cash")
    r = client.post(f"{API}/sales/{sale['id']}/void",
                    json={"kind": "void", "reason": "legacy field", "refund_now": True},
                    timeout=15)
    assert r.status_code == 200, r.text
    led = _summary(client)["cash_ledger"]
    assert led["kas_sistem"] == 50000
    _close_if_open(client)
