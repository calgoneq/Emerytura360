import json
from pathlib import Path
from typing import Dict

BASE = Path(__file__).resolve().parents[2]
A_PATH = BASE / "data" / "assumptions_from_parametry.json"

with open(A_PATH, "r", encoding="utf-8") as f:
    A: Dict = json.load(f)

def waloryzacja_roczna(rok: int) -> float:
    return float(A.get("waloryzacja_roczna", {}).get(str(rok), 1.0))

def waloryzacja_kwartalna(rok: int, kwartal: int) -> float:
    return float(A.get("waloryzacja_kwartalna", {}).get(f"{rok}Q{kwartal}", 1.0))

def kwartal_map_na_waloryzacje(rok_przejscia: int, kwartal_przyznania: int) -> tuple[int, int]:
    mapping = {1: (rok_przejscia - 1, 3), 2: (rok_przejscia - 1, 4), 3: (rok_przejscia, 1), 4: (rok_przejscia, 2)}
    return mapping[kwartal_przyznania]
