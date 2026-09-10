"""Generate runtime data from the canonical workbook; never modify the workbook."""
import argparse
import json
import math
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'master/pokemonTable_HatchMon_Canonical_v2.xlsx'

def table(book, name):
    rows = iter(book[name].values)
    headers = next(rows)
    if any(not h for h in headers) or len(set(headers)) != len(headers):
        raise ValueError(f'{name}: invalid headers')
    return [dict(zip(headers, row)) for row in rows if any(v is not None for v in row)]

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
    return {'schemaVersion': 2, 'contract': contract, 'pokemon': tables['Pokemon'], 'evolutionRules': rules}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data = generate()
    encoded = json.dumps(data, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
    outputs = {
        ROOT / 'hatchmonData_v2.js': '/* Generated from master/pokemonTable_HatchMon_Canonical_v2.xlsx. Do not hand-edit. */\nconst HATCHMON_DATA = ' + encoded + ';\n',
        ROOT / 'master/hatchmonData_v2.json': encoded + '\n',
    }
    for path, content in outputs.items():
        if args.check:
            if path.read_text() != content:
                raise SystemExit(f'Outdated generated artifact: {path.name}')
        else:
            path.write_text(content)
    print(json.dumps({'pokemon': len(data['pokemon']), 'rules': len(data['evolutionRules']), 'withMinBond': sum(r.get('MinBond') is not None for r in data['evolutionRules']), 'check': args.check}))
