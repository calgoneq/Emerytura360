# Eme360 — symulator emerytalny (FastAPI + Next.js)

**Edukacyjny** symulator emerytury.  
Liczy świadczenie (nominalne i realne), pokazuje wpływ L4, porównuje do średniej, generuje PDF, zwraca timeline i warianty „what‑if”. Frontend zapewnia responsywny UI z wykresami.

- Backend: **FastAPI** (Python) — obliczenia, PDF, eksporty.
- Frontend: **Next.js** + **React** + **Tailwind** + **Recharts** — formularz, wykresy, i18n (PL/EN).

---

## Spis treści

- [Architektura](#architektura)
- [Wymagania](#wymagania)
- [Szybki start (full‑stack)](#szybki-start-full-stack)
- [Konfiguracja backend (.env)](#konfiguracja-backend-env)
- [Konfiguracja frontend (.env.local)](#konfiguracja-frontend-envlocal)
- [Dane wejściowe (XLSX)](#dane-wejściowe-xlsx)
- [Struktura repo](#struktura-repo)
- [Modele i payload](#modele-i-payload)
- [API — skrót](#api--skrót)
- [Przykłady (cURL/PowerShell)](#przykłady-curlpowershell)
- [PDF — raport](#pdf--raport)
- [Logi i eksport](#logi-i-eksport)
- [Jak to liczymy (skrót)](#jak-to-liczymy-skrót)
- [Frontend — funkcje](#frontend--funkcje)
- [Troubleshooting](#troubleshooting)
- [Licencja / uwagi](#licencja--uwagi)

---

## Architektura

### Backend (FastAPI)
- `/simulate` — wynik główny: nominal/real, stopa zastąpienia, wpływ L4, źródła.
- `/simulate/timeline` — roczny timeline kapitału/świadczenia (JSON/CSV).
- `/simulate/what-if` — scenariusze opóźnienia (np. +1/+2/+5 lat).
- `/simulate/explain` — „krok po kroku”.
- `/report/pdf` — raport PDF (na podstawie pełnego payloadu).
- Admin: `GET /admin/export-xls`, `POST /admin/clear-logs`.

### Frontend (Next.js / React / Tailwind)
- Formularz (React Hook Form + Zod), walidacje, i18n (PL/EN).
- Widok wyników: KPI, wykresy (Area/Line/Bar), scenariusze opóźnienia, porównanie do średniej, przycisk **Pobierz PDF**.
- Obsługa błędów API i stanu ładowania; responsywne, dostępne UI.

---

## Wymagania

**Backend**
- Python **3.10+**
- `pip install -r requirements.txt`
- (Opcjonalnie) czcionki DejaVu w `api/fonts/` (ładne PL znaki w PDF)

**Frontend**
- Node.js **18+** (rekomendowane 20)
- npm / pnpm / yarn (przykłady z npm)

---

## Szybki start (full‑stack)

```bash
# 1) Wirtualne środowisko
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# 2) Zależności backendu
pip install -r requirements.txt

# 3) Pliki danych (umieść w api/data/)
#    - parametry_mentor.xlsx
#    - avg_benefit.xlsx

# 4) (Opcjonalnie) .env dla backendu (patrz niżej)

# 5) Uruchom backend
uvicorn api.main:app --reload      # -> http://localhost:8000/docs

# 6) Zależności frontendu
npm install

# 7) (Opcjonalnie) .env.local dla frontu (patrz niżej)

# 8) Uruchom frontend
npm run dev                        # -> http://localhost:3000
```

Domyślnie frontend woła backend pod `http://localhost:8000`.  
Jeśli zmienisz port/host, ustaw `NEXT_PUBLIC_API_BASE` w `.env.local`.

---

## Konfiguracja backend (.env)

Plik `.env` (w katalogu `api/`), przykładowo:

```env
# Tryb / bezpieczeństwo
DEMO=1                         # 1 = dosiej średnie, jeśli brak avg_benefit.xlsx (OK na demo)
ADMIN_KEY=sekret123_!Zm1En     # rezerwowe (obecnie nieużywane)

# Ekonomia / fallbacki
WAGE_GROWTH=0.03               # fallback CAGR płac (gdy nie używamy tabel avg_wage)
CPI=0.03                       # fallback CPI (gdy brak CPI w PARAMS dla bieżącego roku)
AUTO_BACKCAST=1                # 1 = cofanie płac w przeszłość, jeśli brak custom timeline
AVERAGES_FALLBACK_GROWTH=0.03  # CAGR dla ekstrapolacji średnich emerytur poza zakresem tabeli
```

> `DEMO=1` powoduje dosiew średnich emerytur na potrzeby demo, jeśli nie masz `avg_benefit.xlsx`.

---

## Konfiguracja frontend (.env.local)

Plik `.env.local` w katalogu frontu:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
# Opcjonalnie:
NEXT_PUBLIC_APP_NAME=Eme360
NEXT_PUBLIC_DEFAULT_LANG=pl
```

---

## Dane wejściowe (XLSX)

### `parametry_mentor.xlsx` (arkusz aktywny)

**Wiersz 1 = nagłówki** (fragmenty nazw wystarczą — case/diakrytyki ignorowane). Wymagane kolumny:
- `rok`
- `wskaźnik cen towarów i usług` (CPI, np. `1,0360` → 3.6%)
- `realnego wzrostu przeciętn` (real wage index, opcjonalnie)
- `przeciętne miesięczne wynagrodzenie`
- `waloryzacji ... na koncie` (np. `114,41%` → zapis jako `114.41`)
- `waloryzacji ... na subkoncie`

> Loader jest tolerancyjny: spacje, przecinki, NBSP i `%` są czyszczone.

### `avg_benefit.xlsx` (arkusz aktywny)

Kolumny:
- `rok`
- `kwota` (PLN/m-c)

---

## Struktura repo

```
api/
 ├─ calculations/
 │   ├─ engine.py            # waloryzacje/annuitetyzacja itp.
 │   └─ waloryzacja.py       # ASSUMPTIONS (np. absencja)
 ├─ data/
 │   ├─ parametry_mentor.xlsx
 │   └─ avg_benefit.xlsx
 ├─ fonts/
 │   ├─ DejaVuSans.ttf           (opcjonalnie)
 │   └─ DejaVuSans-Bold.ttf      (opcjonalnie)
 ├─ storage/
 │   └─ usage.csv            # logi (tworzy się automatycznie)
 └─ main.py                  # FastAPI app

frontend/
 ├─ app/                     # Next.js App Router
 ├─ components/              # UI (formularz, wykresy)
 ├─ lib/                     # klient API, utils
 └─ public/                  # assets
```

---

## Modele i payload

**Model wejściowy (`SimInput`)**:

```json
{
  "age": 28,
  "sex": "K",
  "gross_salary": 8500,
  "start_year": 2020,
  "retire_year": 2065,
  "include_sick_leave": true,
  "quarter_award": 3,
  "zus_balance": {"konto": 0, "subkonto": 0},
  "custom_wage_timeline": null,
  "custom_sick_days": null,
  "expected_pension": 5000,
  "postal_code": "30-001"
}
```

---

## API — skrót

- `GET /health` — stan serwisu (czy załadowano tabele, wersja, tryb demo).
- `GET /assumptions` — założenia modelowe (CPI fallback, absencja itp.).
- `POST /simulate` — **główny wynik** (nominal/real, stopy zastąpienia, wpływ L4, źródła).
- `POST /simulate/timeline` — **timeline** roczny:
  - JSON (domyślnie): `{ "timeline": [ { "year": ..., "base_after_indexation": ..., "benefit_if_retire_in_year": {...}}, ... ] }`
  - CSV: dodaj `?format=csv` (kolumny: `year,base_after_indexation,benefit_nominal,benefit_real`)
- `POST /simulate/what-if` — warianty (np. opóźnienia przejścia); zwraca listę scenariuszy względem baseline.
- `POST /simulate/explain` — **krok‑po‑kroku**: per‑year, suma po indeksacji rocznej, baza po kwartalnej, itd.
- `GET /buckets[?year=YYYY]` — buckety względem średniej w wybranym roku.
- `POST /report/pdf` — **PDF** (wymaga pełnego payloadu jak do `/simulate`).
- `GET /report/pdf/example` — PDF na danych przykładowych.
- `GET /admin/export-xls` — eksport logów użycia do XLSX.
- `POST /admin/clear-logs` — wyczyszczenie logów.

---

## Przykłady (PowerShell/cURL)

**PowerShell (Windows):**
```powershell
# Health
irm http://localhost:8000/health | ConvertTo-Json -Depth 6

# Payload
$payload = @{
  age=28; sex="K"; gross_salary=8500
  start_year=2020; retire_year=2065
  include_sick_leave=$true; quarter_award=3
  zus_balance=@{konto=0; subkonto=0}
  expected_pension=5000; postal_code="30-001"
} | ConvertTo-Json -Depth 6

# Symulacja
irm http://localhost:8000/simulate -Method Post -ContentType 'application/json' -Body $payload

# Timeline jako CSV
irm "http://localhost:8000/simulate/timeline?format=csv" -Method Post -ContentType 'application/json' -Body $payload

# PDF (zapis do pliku)
iwr http://localhost:8000/report/pdf/example -OutFile raport.pdf
start .\raport.pdf
```

**cURL:**
```bash
curl -s http://localhost:8000/health | jq

curl -s -X POST http://localhost:8000/simulate \  -H 'Content-Type: application/json' \  -d '{"age":28,"sex":"K","gross_salary":8500,"start_year":2020,"retire_year":2065,"include_sick_leave":true,"quarter_award":3,"zus_balance":{"konto":0,"subkonto":0},"expected_pension":5000,"postal_code":"30-001"}' \  | jq
```

---

## PDF — raport

Generowany w `reportlab`. W raporcie: 3 KPI, porównanie ze średnią, prosty wykres słupkowy, parametry wejściowe, scenariusze.

**Zmiana szerokości wykresu**: w `report_pdf()` znajdź:

```python
total_w = w - 2*MARGIN_X
chart_h = 110
draw_simple_bar_chart(c, MARGIN_X, y - chart_h, total_w, chart_h, labels=[...], values=[...])
```

- **Szerokość** = `total_w` → np. `chart_w = total_w * 0.85`
- **Pozycja X** = `MARGIN_X` → np. `chart_x = MARGIN_X + (total_w - chart_w)/2` (wyśrodkuj)
- **Wysokość** = `chart_h` → np. `120`

Przykład:

```python
chart_h = 120
chart_w = total_w * 0.85
chart_x = MARGIN_X + (total_w - chart_w)/2  # wyśrodkuj
draw_simple_bar_chart(c, chart_x, y - chart_h, chart_w, chart_h, labels=[...], values=[...])
```

---

## Logi i eksport

Każde wywołanie `/simulate` zapisuje w `api/storage/usage.csv` podstawowe parametry i wynik.  
Eksport do Excela: `GET /admin/export-xls` → `uzycia_symulatora.xlsx`.  
Czyszczenie: `POST /admin/clear-logs`.

---

## Jak to liczymy (skrót)

1. **Ścieżka płac**:
   - Jeśli dostępne `PARAMS.avg_wage` dla całego zakresu lat: skalujemy pensję użytkownika do średnich w każdym roku.
   - W przeciwnym razie fallback: backcast wg `WAGE_GROWTH`.
   - Nakładamy **limit 250%** przeciętnego wynagrodzenia (jeśli znamy `avg_wage` dla roku).
2. **Składka roczna**: `wage * 19.52%` × **czynnik L4** (globalny lub `custom_sick_days[rok]`).
3. **Waloryzacja roczna** (konto/subkonto zgodnie z silnikiem w `calculations.engine`).
4. **Waloryzacja kwartalna** (do wybranego kwartału roku przejścia).
5. **Podstawa** = (po kwartalnej) + `konto` + `subkonto`.
6. **Annuitetyzacja**: dzielimy przez liczbę miesięcy dalszego trwania życia (na razie stałe 240).
7. **Urealnienie**: CPI z `PARAMS` dla bieżącego roku (gdy brak, `CPI` z `.env`).
8. **Porównania**: replacement rate (dzisiejszy), replacement „indexed”, wpływ L4.

---

## Frontend — funkcje

- **Formularz**: wiek, płeć, pensja brutto, start/retire year, L4, kwartal, saldo ZUS, oczekiwana emerytura, kod pocztowy.  
- **Wyniki**: KPI, wykresy, przecięcia ze średnią, warianty „what‑if”, eksport PDF.  
- **Stan**: zapamiętanie ostatniego payloadu (sessionStorage), link „Skopiuj wynik”.
- **Dostępność**: focus management, aria‑label, kolory o wystarczającym kontraście.

---

## Troubleshooting

- **`params_loaded=false` na `/health`** — sprawdź `api/data/parametry_mentor.xlsx` (nagłówki w pierwszym wierszu). Restart serwera po zmianach.
- **Błędne liczby przez przecinki/spacje** — loader czyści przecinki, NBSP i `%`, ale upewnij się, że komórki są liczbami/ciągami cyfr.
- **PDF bez polskich znaków** — dodaj `DejaVuSans` do `api/fonts/…` (fallback to Helvetica).
- **CSV timeline — 500** — wołaj `POST /simulate/timeline?format=csv` z poprawnym JSON payloadem.
- **CORS** — jeśli frontend na innym porcie/host, ustaw `NEXT_PUBLIC_API_BASE` i odpowiednie CORS w backendzie (jeśli wymagane).

---

## Licencja / uwagi

Kod przygotowany na potrzeby hackathonu/konkursu ZUS.  
Parametry i pliki XLSX pochodzą z materiałów przekazanych przez organizatora/mentorów — używane „as‑is”.

Jeśli chcesz, mogę dorzucić krótki **skrypt seedujący** przykładowe dane do testów.
