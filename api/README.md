# Eme360 — backend (FastAPI)

Szybki, „hackathon-ready” backend do symulatora emerytalnego.  
Liczy świadczenie (nominalne i realne), pokazuje wpływ L4, porównuje do średniej, generuje PDF oraz zwraca timeline i warianty „what-if”. Wykorzystuje parametry roczne dostarczone przez mentorów (`parametry_mentor.xlsx`) oraz tabelę średnich świadczeń (`avg_benefit.xlsx`).

---

## Spis treści

- [Architektura i funkcje](#architektura-i-funkcje)
- [Wymagania](#wymagania)
- [Szybki start](#szybki-start)
- [Konfiguracja (.env)](#konfiguracja-env)
- [Dane wejściowe (XLSX)](#dane-wejściowe-xlsx)
- [Modele i payload](#modele-i-payload)
- [API — przegląd endpointów](#api--przegląd-endpointów)
- [Przykłady (PowerShell/cURL)](#przykłady-powershellcurl)
- [PDF — raport](#pdf--raport)
- [Logi i eksport](#logi-i-eksport)
- [Jak to liczymy (skrót)](#jak-to-liczymy-skrót)
- [Najczęstsze problemy](#najczęstsze-problemy)
- [Licencja / uwagi](#licencja--uwagi)

---

## Architektura i funkcje

- **FastAPI** (`/docs` wbudowane Swagger UI).
- **Symulacja świadczenia**: nominalne i realne, replacement rate (dzisiejszy oraz „indeksowany” do roku przejścia).
- **L4**: wpływ absencji (porównanie z/bez L4).
- **Wykorzystanie danych mentorów**:
  - CPI, przeciętne wynagrodzenia, wskaźniki waloryzacji konta/subkonta.
  - Limit 250% przeciętnego wynagrodzenia rocznie.
  - Ścieżka płac skalowana do historii/symulacji wg `avg_wage`.
- **Średnia emerytura**: z `avg_benefit.xlsx` (z prostą ekstrapolacją, gdy braki).
- **Timeline**: roczne wartości bazy i świadczenia (nominal/real).
- **„What-if”**: warianty (np. opóźnienie przejścia).
- **„Explain”**: krok-po-kroku jak powstał wynik.
- **PDF**: gotowy raport z KPI, porównaniem do średniej i parametrami.
- **Logi użycia**: CSV + eksport do XLSX (admin).

---

## Wymagania

- Python 3.10+  
- Systemowe biblioteki do budowy kół (reportlab, openpyxl – instalują się przez `pip`)
- (Opcjonalnie) czcionki DejaVu w `api/fonts/DejaVuSans.ttf` i `DejaVuSans-Bold.ttf` (ładniejsze PL znaki)

---

## Szybki start

```bash
# 1) Klon + wirtualne środowisko
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

# 2) Zależności
pip install -r requirements.txt

# 3) Pliki danych (w katalogu api/data/)
- parametry_mentor.xlsx
- avg_benefit.xlsx

# 4) (Opcjonalnie) .env (patrz sekcja poniżej)

# 5) Uruchom
uvicorn api.main:app --reload
# -> http://localhost:8000/docs

```

Struktura katalogów (kluczowe):

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
```

---

## Konfiguracja (.env)

W pliku `.env` (obok `api/main.py`) możesz nadpisać założenia:

```env
# Tryb / bezpieczeństwo
DEMO=1                      # 1 = dosiej średnie, jeśli brak pliku avg_benefit.xlsx (na hackathon OK)
ADMIN_KEY=sekret123_!Zm1En  # rezerwowe (obecnie nieużywane)

# Ekonomia / fallbacki
WAGE_GROWTH=0.03            # fallback wzrost płac (gdy nie korzystamy z PARAMS.avg_wage)
CPI=0.03                    # fallback CPI (gdy brak CPI w PARAMS dla bieżącego roku)
AUTO_BACKCAST=1             # 1 = cofanie płac w przeszłość, jeśli brak custom timeline
AVERAGES_FALLBACK_GROWTH=0.03  # CAGR dla ekstrapolacji średnich emerytur poza zakres tabeli
```

> `DEMO=1` powoduje dosiew średnich emerytur na potrzeby demo, jeśli nie masz `avg_benefit.xlsx`.

---

## Dane wejściowe (XLSX)

### `parametry_mentor.xlsx` (arkusz aktywny)

**Wiersz 1 = nagłówki** (fragmenty nazw wystarczą — case/diakrytyki ignorowane). Wymagane kolumny:

- `rok`
- `wskaźnik cen towarów i usług` (CPI, np. `1,0360` → 3.6%)
- `realnego wzrostu przeciętn` (real wage index, jeśli chcesz – nie jest niezbędny)
- `przeciętne miesięczne wynagrodzenie`
- `waloryzacji ... na koncie` (np. `114,41%` → zapisywane jako `114.41`)
- `waloryzacji ... na subkoncie`

> Loader jest tolerancyjny: spacje, przecinki, NBSP i `%` są czyszczone.

### `avg_benefit.xlsx` (arkusz aktywny)

Kolumny:
- `rok`
- `kwota` (PLN/m-c)

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

## API — przegląd endpointów

- `GET /health` — stan serwisu (czy załadowano tabele, wersja, tryb demo).
- `GET /assumptions` — założenia modelowe (CPI fallback, absencja itp.).
- `POST /simulate` — **główny wynik** (nominal/real, stopy zastąpienia, wpływ L4, dane o źródłach).
- `POST /simulate/timeline` — **timeline** roczny:
  - JSON (domyślnie): `{ "timeline": [ { "year": ..., "base_after_indexation": ..., "benefit_if_retire_in_year": {...}}, ... ] }`
  - CSV: dodaj `?format=csv` (kolumny: `year,base_after_indexation,benefit_nominal,benefit_real`)
- `POST /simulate/what-if` — warianty (np. opóźnienia przejścia); zwraca listę scenariuszy względem baseline.
- `POST /simulate/explain` — **krok-po-kroku**: per-year, suma po indeksacji rocznej, baza po kwartalnej, itd.
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

curl -s -X POST http://localhost:8000/simulate   -H 'Content-Type: application/json'   -d '{"age":28,"sex":"K","gross_salary":8500,"start_year":2020,"retire_year":2065,"include_sick_leave":true,"quarter_award":3,"zus_balance":{"konto":0,"subkonto":0},"expected_pension":5000,"postal_code":"30-001"}'   | jq
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

## Najczęstsze problemy

- **`params_loaded=false` na /health**  
  Sprawdź, czy `api/data/parametry_mentor.xlsx` istnieje i ma nagłówki w **pierwszym wierszu**. Po zmianach restartuj serwer.

- **Błędne liczby przez przecinki/spacje**  
  Loader czyści przecinki, NBSP i `%`, ale upewnij się, że komórki to liczby/tekst z cyframi.

- **PDF polskie znaki**  
  Dodaj DejaVuSans do `api/fonts/…` — ładuje się automatycznie (fallback na Helvetica).

- **CSV timeline — 500**  
  Upewnij się, że wołasz endpoint z `?format=csv` i wysyłasz payload JSON.

---

## Licencja / uwagi

Kod przygotowany na potrzeby hackathonu/konkursu ZUS.  
Parametry i pliki XLSX pochodzą z materiałów przekazanych przez organizatora/mentorów — używamy ich „as-is”.

Jeśli chcesz, mogę dorzucić krótkie **README dla frontendu** oraz prosty **skrypt seedujący** przykładowe dane.
