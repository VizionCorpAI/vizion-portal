#!/usr/bin/env bash
# repo_checks.sh : syntax checks for every git-tracked script/config in a repo (owner: vizion-maintenance).
# Source: vizion-maintenance/config/ci/repo_checks.sh, copied to every repo as .github/ci/repo_checks.sh by
# vizion-maintenance/scripts/install_ci_checks.sh, run by .github/workflows/checks.yml on every push and PR.
# Read-only: parses files, runs nothing, writes no caches. Same script runs locally: bash .github/ci/repo_checks.sh
#   .py  Python parse          .mjs/.js/.cjs  node --check     .sh  bash -n
#   .json  JSON parse          .yml/.yaml     YAML parse        .ps1 PowerShell parser (if pwsh/powershell exists)
# Skip a file: list its path (or a glob) in .github/ci/skip.txt.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
PY=""; for c in python3 python; do command -v $c >/dev/null && $c -c pass 2>/dev/null && { PY=$c; break; }; done; [ -n "$PY" ] || { echo "no python"; exit 1; }; NODE=$(command -v node || true)
PS=$(command -v pwsh || command -v powershell || true)
skip=(); [ -f .github/ci/skip.txt ] && mapfile -t skip < <(grep -v '^\s*#' .github/ci/skip.txt | sed 's/\r$//' | grep .)
skipped() { local f=$1 p; for p in "${skip[@]}"; do [[ $f == $p ]] && return 0; done; return 1; }
fail=0; declare -A count
bad() { echo "FAIL $1: $2"; fail=$((fail + 1)); }
files() { git ls-files -z -- "$@" | tr '\0' '\n' | while read -r f; do [ -f "$f" ] && ! skipped "$f" && echo "$f"; done; }

mapfile -t py < <(files '*.py')
if [ ${#py[@]} -gt 0 ]; then
  out=$("$PY" - "${py[@]}" <<'P'
import sys
for f in sys.argv[1:]:
    try: compile(open(f, encoding="utf-8-sig").read(), f, "exec", dont_inherit=True)
    except SyntaxError as e: print(f"{f}: line {e.lineno}: {e.msg}")
    except Exception as e: print(f"{f}: {e}")
P
); [ -n "$out" ] && while read -r l; do bad py "$l"; done <<< "$out"; count[py]=${#py[@]}; fi

mapfile -t js < <(files '*.mjs' '*.cjs' '*.js')
if [ ${#js[@]} -gt 0 ] && [ -n "$NODE" ]; then
  for f in "${js[@]}"; do e=$("$NODE" --check "$f" 2>&1) || bad js "$f: $(echo "$e" | grep -m1 -E 'Error|error' )"; done; count[js]=${#js[@]}; fi

mapfile -t sh < <(files '*.sh')
for f in "${sh[@]}"; do e=$(bash -n "$f" 2>&1) || bad sh "$f: $(echo "$e" | head -1)"; done; count[sh]=${#sh[@]}

mapfile -t data < <(files '*.json' '*.yml' '*.yaml')
if [ ${#data[@]} -gt 0 ]; then
  out=$("$PY" - "${data[@]}" <<'P'
import sys, json
try: import yaml
except ImportError: yaml = None
for f in sys.argv[1:]:
    try:
        s = open(f, encoding="utf-8-sig").read()
        if f.endswith(".json"): json.loads(s)
        elif yaml: list(yaml.safe_load_all(s))
    except Exception as e: print(f"{f}: {str(e).splitlines()[0][:160]}")
P
); [ -n "$out" ] && while read -r l; do bad data "$l"; done <<< "$out"; count[json/yaml]=${#data[@]}; fi

mapfile -t ps < <(files '*.ps1')
if [ ${#ps[@]} -gt 0 ] && [ -n "$PS" ]; then
  for f in "${ps[@]}"; do
    e=$("$PS" -NoProfile -Command "\$t=\$null;\$er=\$null;[void][System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path '$f'),[ref]\$t,[ref]\$er);if(\$er){\$er|%{'line '+\$_.Extent.StartLineNumber+': '+\$_.Message}|select -first 1;exit 1}" 2>&1) || bad ps1 "$f: $e"
  done; count[ps1]=${#ps[@]}; fi

summary=""; for k in "${!count[@]}"; do summary+="$k=${count[$k]} "; done
echo "checked: ${summary:-nothing}"
[ $fail -eq 0 ] && echo "all checks passed" || { echo "$fail problem(s)"; exit 1; }
