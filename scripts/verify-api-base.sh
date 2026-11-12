#!/bin/sh
# Trap 2 gate: NEXT_PUBLIC_* is inlined at BUILD time, so prove the value actually landed in the
# browser chunks. The literal must come only from the inlined env var — nothing else in client code
# may spell it out, or this check could pass when the bake silently failed.
set -eu
dir="${1:-.next/static}"
needle="/api/iris"
if hits=$(grep -rl -- "$needle" "$dir" 2>/dev/null) && [ -n "$hits" ]; then
  echo "OK: '$needle' is baked into the browser bundle:"
  echo "$hits"
else
  echo "FAIL: '$needle' not found in $dir." >&2
  echo "NEXT_PUBLIC_IRIS_API_BASE was not set when 'next build' ran, so the browser bundle cannot reach the BFF." >&2
  exit 1
fi
