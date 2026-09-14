#!/usr/bin/env python3
"""Propagate master/pokemonTable_HatchMon_Canonical_v2.xlsx to every generated artifact.

Runs the chain in dependency order: canonical data and roster, PMD assets for newly admitted
species (normal and shiny), shell themes, list metrics and the dist/ build. Nothing here is a
second source of truth; each step is the existing generator.

  python3 tools/syncCanonical.py            regenerate everything that changed
  python3 tools/syncCanonical.py --check    report drift without writing (what the suite runs)
  python3 tools/syncCanonical.py --optimize recompress new PNGs while building dist/
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def step(title, command, capture=False):
    print(f'· {title}', flush=True)
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=capture)
    if result.returncode:
        if capture:
            sys.stderr.write(result.stdout or '')
            sys.stderr.write(result.stderr or '')
        raise SystemExit(f'{title}: failed')
    return result.stdout

def roster():
    """Canonical IDs the regenerated roster admits, read through the adapter itself."""
    js = ("const fs=require('fs'),vm=require('vm');"
          "for(const f of ['evolutionTable.js','hatchmonData_v2.js','pokemonDataAdapter.js'])"
          "vm.runInThisContext(fs.readFileSync(f,'utf8'));"
          "process.stdout.write(JSON.stringify(Object.values(evolutionTable).map(e=>e.canonicalId)))")
    return json.loads(subprocess.check_output([NODE, '-e', js], cwd=ROOT, text=True))

def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--check', action='store_true', help='report drift instead of regenerating')
    parser.add_argument('--optimize', action='store_true', help='recompress PNGs during the dist build')
    parser.add_argument('--refresh-assets', action='store_true', help='re-download PMD assets already on disk')
    args = parser.parse_args()

    global NODE
    NODE = shutil.which('node')
    if not NODE:
        raise SystemExit('Node is required on PATH')

    if args.check:
        step('canonical data and roster', [sys.executable, 'tools/generateCanonicalData.py', '--check'], capture=True)
        missing = [pid for pid in roster() if not (ROOT / 'assets/pmd' / pid / 'shiny/metadata.json').exists()]
        if missing:
            raise SystemExit(f'PMD assets missing for: {", ".join(missing)}')
        print('Up to date. Asset optimisation and dist/ staleness are covered by the suite.')
        return

    before = set(roster()) if (ROOT / 'evolutionTable.js').exists() else set()
    step('canonical data and roster', [sys.executable, 'tools/generateCanonicalData.py'])
    ids = roster()
    # Existing files are reused by the sync tool, so a full pass is cheap; --refresh forces re-download.
    wanted = ids if args.refresh_assets else [pid for pid in ids
                                              if pid not in before or not (ROOT / 'assets/pmd' / pid / 'shiny/metadata.json').exists()]
    added = [pid for pid in ids if pid not in before]
    if wanted:
        command = [sys.executable, 'tools/syncPmdAssets.py', '--ids', ','.join(wanted), '--node', NODE]
        if args.refresh_assets:
            command.append('--refresh')
        step(f'PMD assets (normal + shiny) for {len(wanted)} form(s)', command)
    # Las paletas son cache de red y viven fuera de este pipeline: si falta alguna, el generador
    # para con el comando exacto que hay que lanzar.
    step('shell themes', [sys.executable, 'tools/generateShellThemes.py'])
    step('list metrics', [sys.executable, 'tools/generateListMetrics.py'])
    step('dist build', [sys.executable, 'tools/buildMobileRuntime.py'] + (['--optimize'] if args.optimize else []))
    print(json.dumps({'roster': len(ids), 'added': added, 'assetsSynced': len(wanted), 'optimized': args.optimize}))
    if added:
        print('New forms admitted. Run the suite: node --test tests/*.test.cjs')

if __name__ == '__main__':
    main()
