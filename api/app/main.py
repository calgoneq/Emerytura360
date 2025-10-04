from fastapi import FastAPI, Body
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
import datetime as dt
from pathlib import Path
from fastapi.responses import StreamingResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic.config import ConfigDict

# ReportLab
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors

import io
import csv
import openpyxl

from .calculations.engine import (
    efekt_absencji_factor, waloryzuj_rocznie, waloryzuj_kwartalnie_po_31_stycznia,
    annuitetyzuj, urealnij
)
from .calculations.waloryzacja import A as ASSUMPTIONS

# --- App setup & paths ---
BASE = Path(__file__).resolve().parents[1]
STORAGE = BASE / "storage"; STORAGE.mkdir(exist_ok=True)
FONTS_DIR = BASE / "fonts"; FONTS_DIR.mkdir(exist_ok=True)
LOG_CSV = STORAGE / "usage.csv"

# ZUS palette
ZUS_ORANGE = colors.Color(255/255, 179/255, 79/255)
ZUS_GREEN  = colors.Color(0/255, 153/255, 63/255)
ZUS_GRAY   = colors.Color(190/255, 195/255, 206/255)
ZUS_BLUE   = colors.Color(63/255, 132/255, 210/255)
ZUS_NAVY   = colors.Color(0/255, 65/255, 110/255)
ZUS_RED    = colors.Color(240/255, 94/255, 94/255)
ZUS_BLACK  = colors.black

# Fonts
FONT_MAIN = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

def _register_polish_fonts():
    global FONT_MAIN, FONT_BOLD
    dejavu = FONTS_DIR / "DejaVuSans.ttf"
    dejavu_bold = FONTS_DIR / "DejaVuSans-Bold.ttf"
    try:
        if dejavu.exists():
            pdfmetrics.registerFont(TTFont("DejaVuSans", str(dejavu)))
            FONT_MAIN = "DejaVuSans"
        if dejavu_bold.exists():
            pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", str(dejavu_bold)))
            FONT_BOLD = "DejaVuSans-Bold"
        else:
            FONT_BOLD = FONT_MAIN
    except Exception:
        FONT_MAIN = "Helvetica"
        FONT_BOLD = "Helvetica-Bold"

_register_polish_fonts()

app = FastAPI(title="Emerytura360 API", version="0.3.4")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

# --- MODELS ---
class Balance(BaseModel):
    konto: Optional[float] = 0.0
    subkonto: Optional[float] = 0.0

class SimInput(BaseModel):
    age: int = Field(..., ge=16, le=80)
    sex: str = Field(..., pattern="^[KkMm]$")
    gross_salary: float = Field(..., gt=0)
    start_year: int
    retire_year: Optional[int] = None
    include_sick_leave: bool = True
    quarter_award: int = Field(3, ge=1, le=4)
    zus_balance: Optional[Balance] = None
    custom_wage_timeline: Optional[Dict[int, float]] = None
    expected_pension: Optional[float] = None
    postal_code: Optional[str] = None

    model_config = ConfigDict(json_schema_extra={
        "example": {
            "age": 28, "sex": "K", "gross_salary": 8500,
            "start_year": 2020, "retire_year": 2065,
            "include_sick_leave": True, "quarter_award": 3,
            "zus_balance": {"konto": 0, "subkonto": 0},
            "custom_wage_timeline": None,
            "expected_pension": 5000, "postal_code": "30-001"
        }
    })

# --- HELPERS ---
def expected_life_months(sex: str, retire_year: int) -> int:
    return 240  # TODO: tablice GUS

def avg_benefit_for_year(year: int, *, gross_salary: Optional[float] = None, cpi: float = 0.03, start_year: Optional[int] = None) -> Optional[float]:
    table = ASSUMPTIONS.get("srednia_emerytura_roczna", {})
    val = table.get(str(year))
    if val is not None:
        return val
    # Fallback 1: ekstrapolacja ostatniego znanego roku (2% rocznie)
    if table:
        years = sorted(int(k) for k in table.keys())
        prior = max(y for y in years if y <= year)
        base = table[str(prior)]
        gap = max(0, year - prior)
        return round(base * ((1.02) ** gap), 2)
    # Fallback 2: 35% z indeksowanego wynagrodzenia
    if gross_salary and start_year:
        gap = max(0, year - start_year)
        indexed = gross_salary * ((1 + cpi) ** gap)
        return round(0.35 * indexed, 2)
    return None

def absencja_days(sex: str) -> Optional[float]:
    key = "K" if sex.upper() == "K" else "M"
    return ASSUMPTIONS.get("absencja_chorobowa", {}).get(key, {}).get("dni_rocznie")

def ensure_log_header():
    if not LOG_CSV.exists():
        with LOG_CSV.open("w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow([
                "date","time","expected_pension","age","sex","salary",
                "included_sick_leave","konto","subkonto",
                "benefit_actual","benefit_real","postal_code"
            ])

def log_usage(payload: SimInput, result: dict):
    ensure_log_header()
    with LOG_CSV.open("a", newline="", encoding="utf-8") as f:
        w = csv.writer(f); now = dt.datetime.now()
        w.writerow([
            now.date().isoformat(), now.strftime("%H:%M:%S"),
            payload.expected_pension or "", payload.age, payload.sex.upper(),
            payload.gross_salary, "tak" if payload.include_sick_leave else "nie",
            (payload.zus_balance.konto if payload.zus_balance else 0.0) or 0.0,
            (payload.zus_balance.subkonto if payload.zus_balance else 0.0) or 0.0,
            result["benefit"]["actual"], result["benefit"]["real"],
            payload.postal_code or ""
        ])

def compute_replacement_rate(benefit_real: float, current_gross: float) -> Optional[float]:
    if current_gross > 0:
        return round(100.0 * benefit_real / current_gross, 2)
    return None

def fmt_money(v: Optional[float]) -> str:
    if v is None: return "—"
    return f"{v:,.2f} zł".replace(",", " ").replace("\xa0", " ")

def fmt_pct(v: Optional[float]) -> str:
    if v is None: return "—"
    return f"{v:.2f}%"

# --- PDF UI helpers ---
MARGIN_X = 40
MARGIN_TOP = 76
GAP = 18

def draw_header(c: canvas.Canvas, w, h, title: str, subtitle: str):
    c.setFillColor(ZUS_NAVY); c.rect(0, h-68, w, 68, fill=1, stroke=0)
    c.setFillColor(colors.white); c.setFont(FONT_BOLD, 22); c.drawString(MARGIN_X, h-40, title)
    c.setFont(FONT_MAIN, 10);    c.drawString(MARGIN_X, h-62, subtitle)

def draw_footer(c: canvas.Canvas, w):
    c.setFillColor(ZUS_GRAY); c.rect(0, 0, w, 26, fill=1, stroke=0)
    c.setFillColor(ZUS_NAVY); c.setFont(FONT_MAIN, 9)
    c.drawRightString(w-MARGIN_X, 9, f"Emerytura360 • {dt.date.today().isoformat()}")

def wrap_text(c: canvas.Canvas, text: str, font: str, size: int, max_width: float) -> List[str]:
    c.setFont(font, size)
    words = text.split(" ")
    lines: List[str] = []
    cur = ""
    for w in words:
        test = (cur + " " + w).strip()
        if c.stringWidth(test, font, size) <= max_width:
            cur = test
        else:
            if cur:
                lines.append(cur); cur = w
            else:
                while c.stringWidth(w, font, size) > max_width and len(w) > 1:
                    w = w[:-1]
                lines.append(w); cur = ""
    if cur: lines.append(cur)
    if len(lines) > 2:
        lines = [lines[0], lines[1] + "…"]
    return lines

def kpi_card(c: canvas.Canvas, x, y, w, h, label: str, value: str, accent=ZUS_GREEN):
    # karta (bez paska)
    corner = 12
    c.setFillColor(colors.white)
    c.setStrokeColor(ZUS_GRAY)
    c.setLineWidth(0.8)
    c.roundRect(x, y, w, h, corner, fill=1, stroke=1)

    # LABEL – jedna linia z auto-skalowaniem
    label_box_w = w - 16
    size = 9.0
    while c.stringWidth(label, FONT_MAIN, size) > label_box_w and size > 7.0:
        size -= 0.5
    c.setFillColor(ZUS_NAVY)
    c.setFont(FONT_MAIN, size)
    c.drawCentredString(x + w/2, y + h - 14, label)  # wyżej

    # VALUE – wyżej, bardziej centralnie
    c.setFillColor(ZUS_BLACK)
    c.setFont(FONT_BOLD, 16)
    c.drawCentredString(x + w/2, y + 18, value)  # ← tu brakowało 'value'



def comparison_numbers(c: canvas.Canvas, x, y, w, my_value: Optional[float], avg_value: Optional[float], year_label: str):
    """Sekcja z liczbami i procentem różnicy, z większą wysokością i lepszym układem."""
    box_h = 72  # było 58
    # kontener
    c.setFillColor(colors.white)
    c.setStrokeColor(ZUS_GRAY)
    c.roundRect(x, y, w, box_h, 10, fill=1, stroke=1)

    # nagłówki i podpisy
    c.setFillColor(ZUS_NAVY); c.setFont(FONT_BOLD, 12)
    c.drawString(x+12, y+box_h-18, "Porównanie ze średnią")
    c.setFont(FONT_MAIN, 9)
    c.drawString(x+12, y+box_h-30, "Twoja (realna, m-c)")
    c.setFont(FONT_MAIN, 10)
    c.drawRightString(x+w-12, y+box_h-18, year_label)
    c.setFont(FONT_MAIN, 9)
    c.drawRightString(x+w-12, y+box_h-30, "Średnia")

    # wartości skrajne (trochę wyżej)
    c.setFillColor(ZUS_BLACK); c.setFont(FONT_BOLD, 14)
    c.drawString(x+12, y+18, fmt_money(my_value))          # było y+14
    c.drawRightString(x+w-12, y+18, fmt_money(avg_value))  # było y+14

    # środek: etykieta „Różnica” nad pigułką
    c.setFillColor(ZUS_NAVY); c.setFont(FONT_MAIN, 9)
    c.drawCentredString(x + w/2, y + box_h - 26, "Różnica")

    # wyliczenie różnicy
    diff_pct = None
    if (avg_value or 0) > 0 and my_value is not None:
        diff_pct = (my_value - avg_value) / avg_value * 100.0

    badge_text = "—"
    badge_color = ZUS_ORANGE
    if diff_pct is not None:
        badge_text = f"{diff_pct:+.2f}%"
        if diff_pct >= 5:       badge_color = ZUS_GREEN
        elif diff_pct <= -5:    badge_color = ZUS_RED
        else:                   badge_color = ZUS_ORANGE

    # pigułka – szerokość wg tekstu, idealnie wyśrodkowana
    pill_h = 18
    c.setFont(FONT_BOLD, 10)
    text_w = c.stringWidth(badge_text, FONT_BOLD, 10)
    pill_w = max(56, text_w + 14)  # ~7px padding z każdej strony
    pill_x = x + w/2 - pill_w/2
    pill_y = y + 12  # trochę niżej od etykiety, więcej „powietrza”

    c.setFillColor(badge_color)
    c.roundRect(pill_x, pill_y, pill_w, pill_h, 6, fill=1, stroke=0)

    # tekst w pigułce (baseline skorygowany na -3, jak chciałeś)
    c.setFillColor(colors.white)
    text_y = pill_y + (pill_h / 2) - 3
    c.drawCentredString(x + w/2, text_y, badge_text)

def bullet_line(c: canvas.Canvas, x, y, text, color=ZUS_GREEN):
    c.setFillColor(color); c.circle(x, y+3, 2.8, fill=1, stroke=0)
    c.setFillColor(ZUS_NAVY); c.setFont(FONT_MAIN, 10)
    c.drawString(x+10, y, text)

# --- ENDPOINTS ---
@app.post("/simulate")
def simulate(payload: SimInput):
    today = dt.date.today()
    retire_year = payload.retire_year or (today.year + max(0, 60 - payload.age))

    wages = payload.custom_wage_timeline or {y: payload.gross_salary for y in range(payload.start_year, retire_year)}
    l4_factor = efekt_absencji_factor(absencja_days(payload.sex)) if payload.include_sick_leave else 1.0
    skladki_po_latach = {rok: val * 0.1952 * l4_factor for rok, val in wages.items()}
    rocznie = waloryzuj_rocznie(skladki_po_latach)
    po_kwartale = waloryzuj_kwartalnie_po_31_stycznia(retire_year, payload.quarter_award, rocznie)

    konto = (payload.zus_balance.konto if payload.zus_balance else 0.0) or 0.0
    subkonto = (payload.zus_balance.subkonto if payload.zus_balance else 0.0) or 0.0
    podstawa = po_kwartale + konto + subkonto

    months = expected_life_months(payload.sex, retire_year)
    benefit_nominal = annuitetyzuj(podstawa, months)

    cpi = 0.03
    years_to_retire = max(0, retire_year - today.year)
    benefit_real = urealnij(benefit_nominal, cpi, years_to_retire)

    avg_benefit = avg_benefit_for_year(retire_year, gross_salary=payload.gross_salary, cpi=cpi, start_year=payload.start_year)
    replacement = compute_replacement_rate(benefit_real, payload.gross_salary)

    result = {
        "benefit": {"actual": round(benefit_nominal, 2), "real": round(benefit_real, 2)},
        "retire_year": retire_year,
        "avg_benefit_year": avg_benefit,
        "replacement_rate_percent": replacement,
        "effect_sick_leave": {"factor": round(l4_factor, 4)},
        "scenarios": ASSUMPTIONS.get("opoznienie_dodatkowy_wzrost_proc", {}),
        "assumptions_used": {"cpi": cpi, "life_months": months}
    }
    log_usage(payload, result)
    return result

@app.post(
    "/report/pdf",
    responses={200: {"content": {"application/pdf": {"schema": {"type":"string","format":"binary"}}},
                     "description":"Pobierz wygenerowany raport PDF"}}
)
def report_pdf(payload: SimInput = Body(...)):
    result = simulate(payload)

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    w, h = A4

    # HEADER
    draw_header(
        c, w, h,
        "Raport prognozowanej emerytury",
        f"Data: {dt.date.today().isoformat()}"
    )

    # Start Y – niżej, żeby karty nie nachodziły na header
    y = h - MARGIN_TOP - 90

    # KPI row (3 karty)
    card_h = 60
    total_w = w - 2*MARGIN_X
    gap = 18
    card_w = (total_w - 2*gap) / 3.0
    x = MARGIN_X
    kpi_card(c, x + 0*(card_w+gap), y, card_w, card_h, "Świadczenie nominalne (m-c)", fmt_money(result['benefit']['actual']), ZUS_GREEN)
    kpi_card(c, x + 1*(card_w+gap), y, card_w, card_h, "Świadczenie realne (dzisiaj, m-c)", fmt_money(result['benefit']['real']), ZUS_BLUE)
    rr = result.get("replacement_rate_percent")
    kpi_card(c, x + 2*(card_w+gap), y, card_w, card_h, "Stopa zastąpienia", fmt_pct(rr), ZUS_ORANGE)
    y -= (card_h + 24)

    # Porównanie liczbowe
    avg = result.get("avg_benefit_year") or 0
    comparison_numbers(
        c, MARGIN_X, y, total_w,
        result["benefit"]["real"], avg,
        f"Rok: {result['retire_year']}"
    )
    y -= 64  # ciaśniej pod porównaniem

    # Parametry wejściowe (mniejszy odstęp pod nagłówkiem i mniejsza czcionka listy)
    c.setFillColor(ZUS_NAVY); c.setFont(FONT_BOLD, 12)
    c.drawString(MARGIN_X, y, "Parametry wejściowe")
    y -= 10
    c.setFillColor(ZUS_BLACK); c.setFont(FONT_MAIN, 9)

    inputs = [
        f"Wiek: {payload.age}",
        f"Płeć: {payload.sex.upper()}",
        f"Pensja brutto: {fmt_money(payload.gross_salary)}",
        f"Lata pracy: {payload.start_year}–{result['retire_year']}",
        f"Kwartał przyznania: {payload.quarter_award}",
        f"Uwzględniono L4: {'tak' if payload.include_sick_leave else 'nie'}",
        f"Środki konto/subkonto: {fmt_money((payload.zus_balance.konto if payload.zus_balance else 0.0))} / {fmt_money((payload.zus_balance.subkonto if payload.zus_balance else 0.0))}",
        f"Oczekiwana emerytura: {fmt_money(payload.expected_pension) if payload.expected_pension is not None else '—'}",
        f"Kod pocztowy: {payload.postal_code or '—'}"
    ]
    for line in inputs:
        y -= 12; c.drawString(MARGIN_X, y, "• " + line)

    # Scenariusze
    SECTION_GAP = 24  # zwiększ/zmniejsz wedle gustu (np. 20–28)
    y -= SECTION_GAP
    c.setFillColor(ZUS_NAVY); c.setFont(FONT_BOLD, 12)
    c.drawString(MARGIN_X, y, "Scenariusze opóźnienia przejścia na emeryturę")
    y -= 20; sc = result.get("scenarios", {})
    for key in ["+1", "+2", "+5"]:
        if key in sc:
            bullet_line(c, MARGIN_X, y, f"{key} rok/lata: +{sc[key]}% do świadczenia nominalnego", ZUS_ORANGE)
            y -= 12

    # FOOTER
    draw_footer(c, w)

    c.showPage(); c.save(); buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf",
        headers={"Content-Disposition":"attachment; filename=raport_emerytura.pdf"})

@app.get(
    "/report/pdf/example",
    responses={200: {"content": {"application/pdf": {"schema": {"type":"string","format":"binary"}}},
                     "description":"Przykładowy raport PDF bez podawania payloadu"}}
)
def report_pdf_example():
    sample = SimInput(
        age=28, sex="K", gross_salary=8500,
        start_year=2020, retire_year=2065,
        include_sick_leave=True, quarter_award=3,
        zus_balance=Balance(konto=0, subkonto=0),
        custom_wage_timeline=None,
        expected_pension=5000, postal_code="30-001"
    )
    return report_pdf(sample)

@app.get(
    "/admin/export-xls",
    responses={200: {"content": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                                 {"schema": {"type":"string","format":"binary"}}},
                     "description":"Eksport użyć symulatora (XLSX) – z logów"}}
)
def export_xls():
    ensure_log_header()
    wb = openpyxl.Workbook(); ws = wb.active; ws.title = "Użycia"
    headers = ["Data użycia","Godzina użycia","Emerytura oczekiwana","Wiek","Płeć","Wynagrodzenie",
               "Czy uwzględniał okresy choroby","Środki konto","Środki subkonto",
               "Emerytura rzeczywista","Emerytura urealniona","Kod pocztowy"]
    ws.append(headers)
    with LOG_CSV.open("r", newline="", encoding="utf-8") as f:
        r = csv.DictReader(f)
        for row in r:
            ws.append([row["date"],row["time"],row["expected_pension"],row["age"],row["sex"],row["salary"],
                       row["included_sick_leave"],row["konto"],row["subkonto"],
                       row["benefit_actual"],row["benefit_real"],row["postal_code"]])
    tmp = io.BytesIO(); wb.save(tmp); tmp.seek(0)
    return StreamingResponse(tmp,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition":"attachment; filename=uzycia_symulatora.xlsx"})
