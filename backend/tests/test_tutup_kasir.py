"""Cash reconciliation (Tutup Kasir) backend tests.

Covers cases 1-8 from the review request.
Uses REACT_APP_BACKEND_URL and the seeded owner account.
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
    return s


def _close_if_open(c):
    r = c.get(f"{API}/register/current", timeout=15)
    if r.status_code == 200 and (r.json() or {}).get("session"):
        c.post(f"{API}/pos/close", json={"kas_aktual": 0, "selisih_note": "TEST cleanup"}, timeout=15)


def _open(c, opening=50000):
    _close_if_open(c)
    r = c.post(f"{API}/register/open", json={"opening_cash": opening}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["session"]


def _summary(c):
    r = c.get(f"{API}/pos/summary", timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


def _cash_sale(c, amount=20000, method="Cash"):
    body = {
        "items": [{"menu_id": None, "name": "TEST_item", "price": amount, "qty": 1}],
        "payment_method": method,
        "apply_tax": False,
        "cash_received": amount,
    }
    r = c.post(f"{API}/sales", json=body, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()


def _cash_expense(c, amount=10000):
    body = {"category": "Operasional", "amount": amount, "note": "TEST_exp", "method": "Cash", "source": "kasir"}
    r = c.post(f"{API}/expenses", json=body, timeout=15)
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    return r.json()


def test_case2_fresh_session_kas_sistem_equals_opening(client):
    _open(client, 50000)
    led = _summary(client)["cash_ledger"]
    assert led["kas_awal"] == 50000
    assert led["total_pemasukan_cash"] == 0
    assert led["total_pengeluaran_cash"] == 0
    assert led["kas_sistem"] == 50000


def test_case1_cash_sale_and_expense(client):
    _open(client, 50000)
    _cash_expense(client, 10000)
    _cash_sale(client, 20000, "Cash")
    led = _summary(client)["cash_ledger"]
    assert led["kas_awal"] == 50000
    assert led["total_pemasukan_cash"] == 20000, led
    assert led["total_pengeluaran_cash"] == 10000, led
    assert led["kas_sistem"] == 60000, led


def test_case7_qris_sale_does_not_change_kas_sistem(client):
    _open(client, 50000)
    _cash_sale(client, 25000, "QRIS")
    led = _summary(client)["cash_ledger"]
    assert led["total_pemasukan_cash"] == 0, led
    assert led["kas_sistem"] == 50000, led


def test_case6_multiple_cash_sales_and_expenses(client):
    _open(client, 50000)
    _cash_expense(client, 5000)
    _cash_expense(client, 3000)
    _cash_sale(client, 20000)
    _cash_sale(client, 15000)
    led = _summary(client)["cash_ledger"]
    assert led["total_pemasukan_cash"] == 35000, led
    assert led["total_pengeluaran_cash"] == 8000, led
    assert led["kas_sistem"] == 50000 + 35000 - 8000, led


def test_case3_close_kurang(client):
    _open(client, 50000)
    _cash_expense(client, 10000)
    _cash_sale(client, 20000, "Cash")
    r = client.post(f"{API}/pos/close", json={"kas_aktual": 55000, "selisih_note": "TEST kurang"}, timeout=15)
    assert r.status_code == 200, r.text
    rec = r.json()
    assert rec["kas_awal"] == 50000
    assert rec["total_pemasukan_cash"] == 20000
    assert rec["total_pengeluaran_cash"] == 10000
    assert rec["kas_sistem"] == 60000
    assert rec["kas_aktual"] == 55000
    assert rec["selisih"] == -5000


def test_case4_close_balanced(client):
    _open(client, 50000)
    _cash_sale(client, 20000, "Cash")
    led = _summary(client)["cash_ledger"]
    ks = led["kas_sistem"]
    r = client.post(f"{API}/pos/close", json={"kas_aktual": ks}, timeout=15)
    assert r.status_code == 200, r.text
    rec = r.json()
    assert rec["kas_sistem"] == ks
    assert rec["kas_aktual"] == ks
    assert rec["selisih"] == 0


def test_case5_close_lebih(client):
    _open(client, 50000)
    _cash_sale(client, 20000, "Cash")
    led = _summary(client)["cash_ledger"]
    ks = led["kas_sistem"]
    r = client.post(f"{API}/pos/close", json={"kas_aktual": ks + 5000, "selisih_note": "TEST lebih"}, timeout=15)
    assert r.status_code == 200, r.text
    rec = r.json()
    assert rec["selisih"] == 5000


def test_case8_pos_summary_and_cash_outlet_consistent(client):
    _open(client, 50000)
    _cash_expense(client, 4000)
    _cash_sale(client, 12000, "Cash")
    _cash_sale(client, 7000, "QRIS")  # must not affect cash
    led = _summary(client)["cash_ledger"]
    r = client.get(f"{API}/cash/outlet", timeout=15)
    assert r.status_code == 200, r.text
    co = r.json()
    assert co["opening_cash"] == led["kas_awal"]
    assert co["cash_in"] == led["total_pemasukan_cash"]
    assert co["cash_out"] == led["total_pengeluaran_cash"]
    assert co["balance"] == led["kas_sistem"]
    # cleanup
    _close_if_open(client)


def test_case8b_old_register_closes_load(client):
    """Legacy records (that may be missing new fields) still load from /pos/summary.closings."""
    _open(client, 50000)
    s = _summary(client)
    assert isinstance(s.get("closings"), list)
    _close_if_open(client)
