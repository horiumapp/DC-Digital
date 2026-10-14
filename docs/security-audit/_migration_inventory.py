import re
from pathlib import Path

root = Path("supabase/migrations")
files = sorted(root.glob("*.sql"))
stmt = re.compile(
    r"^\s*(CREATE|ALTER|DROP|REVOKE|GRANT|INSERT|UPDATE|DELETE|COMMENT|DO)\b",
    re.I | re.M,
)
for path in files:
    text = path.read_text(encoding="utf-8")
    lines = [ln.strip() for ln in text.splitlines() if ln.strip() and not ln.strip().startswith("--")]
    kinds = []
    for match in stmt.finditer(text):
        kind = match.group(1).upper()
        if kind not in kinds:
            kinds.append(kind)
    comment = ""
    for ln in text.splitlines():
        if ln.strip().startswith("--") and len(ln.strip()) > 4:
            comment = ln.strip()[:110]
            break
    print(f"{path.name}\t{path.stat().st_size}\t{','.join(kinds) or 'NONE'}\t{comment}")
