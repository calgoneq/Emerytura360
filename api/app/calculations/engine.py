from typing import Dict
from .waloryzacja import waloryzacja_roczna, waloryzacja_kwartalna, kwartal_map_na_waloryzacje

SKLADKA_RATE = 0.1952 

def efekt_absencji_factor(dni_rocznie: float | None) -> float:
    if not dni_rocznie:
        return 1.0
    udzial = max(0.0, min(0.25, float(dni_rocznie) / 365.0))
    return 1.0 - udzial

def waloryzuj_rocznie(skladki_po_latach: Dict[int, float]) -> float:
    if not skladki_po_latach:
        return 0.0
    end_year = max(skladki_po_latach.keys())
    total = 0.0
    for rok, kwota in skladki_po_latach.items():
        val = float(kwota)
        for r in range(rok + 1, end_year + 1):
            val *= waloryzacja_roczna(r)
        total += val
    return total

def waloryzuj_kwartalnie_po_31_stycznia(rok_przejscia: int, kwartal_przyznania: int, kwota_bazowa: float) -> float:
    y, q = kwartal_map_na_waloryzacje(rok_przejscia, kwartal_przyznania)
    return kwota_bazowa * waloryzacja_kwartalna(y, q)

def annuitetyzuj(podstawa: float, miesiace: int) -> float:
    mies = max(1, int(miesiace))
    return float(podstawa) / mies

def urealnij(nominal: float, cpi_pa: float, years: int) -> float:
    factor = (1.0 + cpi_pa) ** max(0, years)
    return nominal / factor
