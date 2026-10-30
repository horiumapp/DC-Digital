import re
import pathlib

root = pathlib.Path(__file__).resolve().parents[2] / "supabase" / "migrations"
files = sorted(root.glob("*.sql"))
policies = {}
rls = {}
grants_anon = []

drop_re = re.compile(
    r'DROP POLICY IF EXISTS\s+"([^"]+)"\s+ON\s+public\.(\w+)\s*;',
    re.I,
)
drop_re2 = re.compile(
    r"DROP POLICY IF EXISTS\s+([A-Za-z0-9_]+)\s+ON\s+public\.(\w+)\s*;",
    re.I,
)
create_re = re.compile(
    r'CREATE POLICY\s+(?:"([^"]+)"|([A-Za-z0-9_]+))\s+ON\s+public\.(\w+)\s+(.*?);',
    re.I | re.S,
)
rls_re = re.compile(
    r"ALTER TABLE(?: ONLY)?\s+public\.(\w+)\s+(ENABLE|DISABLE|FORCE)\s+ROW LEVEL SECURITY",
    re.I,
)

for f in files:
    text = f.read_text(encoding="utf-8", errors="replace")
    for m in rls_re.finditer(text):
        rls[m.group(1)] = (m.group(2).upper(), f.name)
    for m in drop_re.finditer(text):
        policies.pop((m.group(2), m.group(1)), None)
    for m in drop_re2.finditer(text):
        policies.pop((m.group(2), m.group(1)), None)
    for m in create_re.finditer(text):
        name = m.group(1) or m.group(2)
        body = " ".join(m.group(4).split())
        policies[(m.group(3), name)] = (f.name, body)
    for line in text.splitlines():
        if re.search(r"\b(TO|FROM)\s+anon\b", line, re.I) and re.search(r"\b(GRANT|REVOKE)\b", line, re.I):
            grants_anon.append(f"{f.name}: {line.strip()}")

print("=== RLS ===")
for t, v in sorted(rls.items()):
    print(f"{t}: {v[0]} ({v[1]})")

print("\n=== POLICIES ===")
by = {}
for (t, n), v in policies.items():
    by.setdefault(t, []).append((n, v))
for t in sorted(by):
    print(f"\n## {t} rls={rls.get(t)}")
    for n, v in sorted(by[t]):
        print(f"  [{n}] {v[1][:700]}")
        print(f"    << {v[0]}")

print("\n=== ANON GRANT/REVOKE ===")
for g in grants_anon:
    print(g)
