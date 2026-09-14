"""Generate runtime data from the canonical workbook; never modify the workbook.

Admission rule: only evolution rules with MinAgeDays informed reach the runtime, and only
the species they connect. Everything else stays in the workbook and in the master JSON.
Legacy IDs are save keys, so they are pinned in master/legacyIds.json and never rewritten;
newly admitted species get a slug derived from DisplayName.
"""
import argparse
import json
import math
import re
import unicodedata
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'master/pokemonTable_HatchMon_Canonical_v2.xlsx'
PINS = ROOT / 'master/legacyIds.json'

def table(book, name):
    rows = iter(book[name].values)
    headers = next(rows)
    if any(not h for h in headers) or len(set(headers)) != len(headers):
        raise ValueError(f'{name}: invalid headers')
    return [dict(zip(headers, row)) for row in rows if any(v is not None for v in row)]

def writeAtomic(path, text):
    """Replace a file in one step. A reader must never catch it half-written: the tests parse
    these artifacts while a build may be rewriting them."""
    temp = path.with_name(path.name + '.tmp')
    temp.write_text(text)
    temp.replace(path)

def slug(name):
    plain = unicodedata.normalize('NFD', name)
    return re.sub(r'[^a-z0-9]', '', ''.join(c for c in plain if not unicodedata.combining(c)).lower())

def legacyIds(admitted, records):
    """Pinned canonical→legacy map, extended with slugs for newly admitted species.

    Pin order is the roster order the runtime sees, so it is preserved verbatim and new
    species are appended: reordering would shuffle the hatch pool for no reason.
    """
    pins = json.loads(PINS.read_text()) if PINS.exists() else {}
    stale = [pid for pid in pins if pid not in records]
    if stale:
        raise ValueError(f'Pinned legacy IDs point outside the workbook: {stale}')
    resolved = {pid: pins[pid] for pid in pins if pid in admitted}
    for pid in sorted(admitted - set(pins)):
        candidate = slug(records[pid]['DisplayName'])
        if not candidate:
            raise ValueError(f'{pid}: DisplayName yields an empty legacy ID')
        if candidate in set(pins.values()) | set(resolved.values()):
            raise ValueError(f'{pid}: legacy ID {candidate!r} already taken; pin it by hand in {PINS.name}')
        resolved[pid] = candidate
    # Dropping a species must not free its legacy ID for reuse, so pins are only ever added to.
    return resolved, {**pins, **resolved}

def generate():
    book = openpyxl.load_workbook(SOURCE, read_only=True, data_only=True)
    dictionary = table(book, 'DataDictionary')
    tables = {name: table(book, name) for name in ('Pokemon', 'EvolutionRules')}
    assert any(d['Sheet'] == 'EvolutionRules' and d['Field'] == 'MinBond' for d in dictionary), 'MinBond missing from dictionary'
    for name, rows in tables.items():
        fields = {d['Field']: d for d in dictionary if d['Sheet'] == name}
        for row in rows:
            for field, value in row.items():
                if field not in fields:
                    raise ValueError(f'{name}.{field}: missing dictionary entry')
                contract = fields[field]
                if value is None:
                    if contract['Required'] == 'YES':
                        raise ValueError(f'{name}.{field}: required value missing')
                    continue
                kind = contract['Type']
                if kind.startswith(('number', 'integer', 'decimal')):
                    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                        raise ValueError(f'{name}.{field}: invalid number {value!r}')
                if field == 'MinBond' and not 0 <= value <= 5:
                    raise ValueError('MinBond outside 0–5 hearts')
    ids = [r['PokemonId'] for r in tables['Pokemon']]
    rules = tables['EvolutionRules']
    if len({r['RuleId'] for r in rules}) != len(rules):
        raise ValueError('Duplicate canonical ID')
    if any(r['FromId'] not in ids or r['ToId'] not in ids for r in rules):
        raise ValueError('Unknown evolution endpoint')
    contract = {key: value for key, value in list(book['README'].values)[1:] if key}
    book.close()

    records = {r['PokemonId']: r for r in tables['Pokemon']}
    admittedRules = [r for r in rules if r['MinAgeDays'] is not None]
    admitted = {endpoint for r in admittedRules for endpoint in (r['FromId'], r['ToId'])}
    # contract['Ditto'] makes the Ditto egg group a breeding rule of its own, so its species stay
    # in the runtime even without an evolution rule; the adapter needs the record to route them.
    ditto = {pid for pid, row in records.items() if row['EggGroup'] == 'Ditto'}
    admitted |= ditto
    resolved, pins = legacyIds(admitted - ditto, records)
    # A pruned runtime must stay self-contained: every reference an admitted species makes has
    # to land inside the admitted set, or the adapter would resolve it to null at load time.
    for pid in sorted(admitted - ditto):
        for field in ('PreEvolutionId', 'BaseOffspringId'):
            target = records[pid][field]
            if target is not None and target not in admitted:
                raise ValueError(f'{pid}.{field} points to {target}, which the MinAgeDays rule does not admit')
    order = {pid: index for index, pid in enumerate(resolved)}
    runtime = {'schemaVersion': 2, 'contract': contract,
               'pokemon': sorted((p for p in tables['Pokemon'] if p['PokemonId'] in admitted),
                                 key=lambda p: order.get(p['PokemonId'], len(order))),
               'evolutionRules': admittedRules}
    archive = {'schemaVersion': 2, 'contract': contract, 'pokemon': tables['Pokemon'], 'evolutionRules': rules}
    return runtime, archive, resolved, pins

def rosterSource(resolved, runtime):
    names = {p['PokemonId']: p['DisplayName'] for p in runtime['pokemon']}
    entries = list(resolved.items())
    key = lambda legacy: legacy if re.fullmatch(r'[a-z][a-z0-9]*', legacy) else json.dumps(legacy)
    body = ',\n'.join(f'  {key(legacy)}: {{canonicalId: {json.dumps(pid)}, nombre: {json.dumps(names[pid], ensure_ascii=False)}}}'
                      for pid, legacy in entries)
    return ('/* Generated from master/pokemonTable_HatchMon_Canonical_v2.xlsx. Do not hand-edit.\n'
            ' * Playable roster: species connected by an evolution rule with MinAgeDays informed.\n'
            ' * Keys are save-visible legacy IDs pinned in master/legacyIds.json.\n'
            ' */\n'
            'const evolutionTable = {\n' + body + ',\n};\n')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    runtime, archive, resolved, pins = generate()
    encoded = json.dumps(runtime, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
    outputs = {
        ROOT / 'hatchmonData_v2.js': '/* Generated from master/pokemonTable_HatchMon_Canonical_v2.xlsx. Do not hand-edit. */\nconst HATCHMON_DATA = ' + encoded + ';\n',
        ROOT / 'evolutionTable.js': rosterSource(resolved, runtime),
        PINS: json.dumps(pins, ensure_ascii=False, indent=1) + '\n',
        ROOT / 'master/hatchmonData_v2.json': json.dumps(archive, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n',
    }
    for path, content in outputs.items():
        if args.check:
            if not path.exists() or path.read_text() != content:
                raise SystemExit(f'Outdated generated artifact: {path.name}')
        else:
            writeAtomic(path, content)
    print(json.dumps({'pokemon': len(runtime['pokemon']), 'roster': len(resolved), 'rules': len(runtime['evolutionRules']),
                      'archivedPokemon': len(archive['pokemon']), 'archivedRules': len(archive['evolutionRules']),
                      'withMinBond': sum(r.get('MinBond') is not None for r in runtime['evolutionRules']),
                      'check': args.check}))
