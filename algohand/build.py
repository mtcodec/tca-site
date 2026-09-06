"""Copy the API artifacts the AlgoHand site links to into site/algohand/docs/ (run before deploying)."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[2]
DOCS = Path(__file__).resolve().parent / "docs"
DOCS.mkdir(exist_ok=True)
shutil.copy(ROOT / "api" / "openapi.yaml", DOCS / "openapi.yaml")
shutil.copy(ROOT / "api" / "tools" / "claude_tools.json", DOCS / "claude_tools.json")
print("docs ready:", sorted(p.name for p in DOCS.iterdir()))
