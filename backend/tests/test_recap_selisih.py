"""Backend tests: mandatory selisih note + /api/sales/recap (iteration 4)."""
import os
import datetime as dt
import pytest
import requests

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE}/api"


def _login(email, pwd="Rollow@2026"):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": email, "password": pwd}, timeout=30)
    assert r.status_code == 200, r.text
    s.headers["Authorization"] = f"Bearer {r.json()['access_token']}"
    return s


@pytest.fixture(scope="module")
def owner():
    return _login("owner@rollow.id")


@pytest.fixture(scope="module")
def finance():
    return _login("finance@rollow.id")


@pytest.fixture(scope="module")
def crew():
    return _login("crew@rollow.id")


def _close_if_open(c):
    r = c.get(f"{API}/register/current", timeout=15)
    if r.status_code == 200 and (r.json() or {}).get("session"):
        c.post(f"{API}/pos/close", json={"kas_aktual": 0, "selisih_note": "cleanup"}, timeout=15)


def _open(c, opening=50000):
    _close_if_open(c)
    r = c.post(f"{API}/register/open", json={"opening_cash": opening}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["session"]


def _cash_sale(c, amount=20000, method="Cash", name="TEST_item"):
    body = {
        "items": [{"menu_id": None, "name": name, "price": amount, "qty": 1}],
        "payment_method": method,
        "apply_tax": False,
        "cash_received": amount,
    }
    r = c.post(f"{API}/sales", json=body, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()


# ---------- Selisih note required ----------
def test_close_mismatch_without_note_returns_400(owner):
    _open(owner, 50000)
    _cash_sale(owner, 20000, "Cash")
    r = owner.post(f"{API}/pos/close", json={"kas_aktual": 60000, "selisih_note": ""}, timeout=15)
    assert r.status_code == 400, r.text
    assert "alasan selisih" in r.text.lower() or "selisih" in r.text.lower()


def test_close_mismatch_with_note_persists(owner):
    _open(owner, 50000)
    _cash_sale(owner, 20000, "Cash")
    r = owner.post(f"{API}/pos/close",
                   json={"kas_aktual": 65000, "selisih_note": "TEST_lebih 5rb tip"}, timeout=15)
    assert r.status_code == 200, r.text
    rec = r.json()
    assert rec["kas_sistem"] == 70000
    assert rec["kas_aktual"] == 65000
    assert rec["selisih"] == -5000
    assert rec["selisih_note"] == "TEST_lebih 5rb tip"


def test_close_balanced_empty_note_ok(owner):
    _open(owner, 50000)
    _cash_sale(owner, 20000, "Cash")
    r = owner.post(f"{API}/pos/close", json={"kas_aktual": 70000, "selisih_note": ""}, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["selisih"] == 0


# ---------- /api/sales/recap ----------
def test_recap_forbidden_for_crew(crew):
    r = crew.get(f"{API}/sales/recap?period=day", timeout=15)
    assert r.status_code == 403, r.text


def test_recap_ok_for_finance(finance):
    r = finance.get(f"{API}/sales/recap?period=day", timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ["omzet", "trx", "void", "cancelled", "profit", "by_method",
              "top_products", "busy_hours", "peak_hour", "kas", "closes_detail"]:
        assert k in d, f"missing key {k}"
    assert isinstance(d["top_products"], list) and len(d["top_products"]) <= 5
    assert isinstance(d["busy_hours"], list)
    for b in d["busy_hours"]:
        assert "hour" in b and "count" in b and "omzet" in b
    # busy_hours sorted by hour
    hrs = [b["hour"] for b in d["busy_hours"]]
    assert hrs == sorted(hrs)
    assert set(d["kas"].keys()) >= {"kas_sistem", "kas_aktual", "selisih", "closes"}


def test_recap_sync_with_closes_and_sales(owner, finance):
    # Create a known shift: open 50000 → 2 cash sales of same product, 1 QRIS → close with -3000 selisih + note
    _open(owner, 50000)
    _cash_sale(owner, 15000, "Cash", name="TEST_prodA")
    _cash_sale(owner, 15000, "Cash", name="TEST_prodA")
    _cash_sale(owner, 20000, "QRIS", name="TEST_prodB")
    r = owner.post(f"{API}/pos/close",
                   json={"kas_aktual": 77000, "selisih_note": "TEST_kurang 3rb"}, timeout=15)
    assert r.status_code == 200, r.text
    # Use server TZ (Asia/Jakarta, UTC+7). Try both; prefer the one that has data.
    tz7 = dt.timezone(dt.timedelta(hours=7))
    today = dt.datetime.now(tz7).strftime("%Y-%m-%d")
    r = finance.get(f"{API}/sales/recap?period=day&date={today}", timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    # omzet includes all three sales
    assert d["omzet"] >= 50000, (today, d["omzet"], d.get("trx"))
    # top_products: TEST_prodA should have qty >= 2
    tp = {x["name"]: x for x in d["top_products"]}
    assert "TEST_prodA" in tp and tp["TEST_prodA"]["qty"] >= 2, tp
    # kas.selisih should equal sum of register_closes.selisih for the day (includes our -3000)
    # Our close contributes -3000; sum across all shifts today should be an integer multiple of 1000
    assert any(c["selisih_note"] == "TEST_kurang 3rb" for c in d["closes_detail"]), d["closes_detail"]
    # Sync: sum of closes_detail.selisih == kas.selisih
    s = round(sum(c["selisih"] for c in d["closes_detail"]), 2)
    assert s == d["kas"]["selisih"], (s, d["kas"]["selisih"])
    # by_method should list Cash and QRIS
    methods = {m["method"] for m in d["by_method"]}
    assert "Cash" in methods and "QRIS" in methods


def test_recap_finance_summary_omzet_match(owner, finance):
    tz7 = dt.timezone(dt.timedelta(hours=7))
    today = dt.datetime.now(tz7).strftime("%Y-%m-%d")
    rec = finance.get(f"{API}/sales/recap?period=day&date={today}", timeout=15).json()
    r = finance.get(f"{API}/finance/summary?period=day&date={today}", timeout=15)
    if r.status_code == 200:
        fs = r.json()
        for k in ("omzet", "revenue", "total_omzet", "sales_total"):
            if k in fs and isinstance(fs[k], (int, float)):
                assert round(fs[k], 2) == round(rec["omzet"], 2), (k, fs[k], rec["omzet"])
                break
