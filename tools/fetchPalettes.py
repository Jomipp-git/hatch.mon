"""Cachea las paletas de pokemonpalette.com para el repertorio, una sola vez.

Es el unico paso del pipeline que toca la red, y por eso vive aparte de
`syncCanonical.py`: el resto del build tiene que ser reproducible y offline, y
`tests/canonical-pipeline.test.cjs` falla si un artefacto generado depende de algo que no
esta en el repositorio. El resultado se versiona en `master/palettes.json`.

  python3 tools/fetchPalettes.py              solo las formas que falten
  python3 tools/fetchPalettes.py --refresh    vuelve a bajarlas todas
  python3 tools/fetchPalettes.py --only 0025A0,0026A0

pokemonpalette.com es un proyecto comunitario (MIT, yassenshopov/pokemonpalette-nextjs)
sin relacion con Nintendo ni The Pokemon Company. Extrae los colores del arte oficial con
`colorthief`; aqui solo se copian sus HEX, no se recalculan.
"""
import argparse
import json
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'master/palettes.json'
ENDPOINT = 'https://www.pokemonpalette.com/data/pokemon/{dex}.json'
# Cortesia con un servidor ajeno: el repertorio entero son 77 peticiones de una sola vez.
DELAY_SECONDS = .35


def roster():
    """Las formas que el runtime puede mostrar, con su numero de Pokedex."""
    canonical = json.loads((ROOT / 'master/hatchmonData_v2.json').read_text())
    records = {entry['PokemonId']: entry for entry in canonical['pokemon']}
    forms = {}
    for file in sorted((ROOT / 'assets/pmd').glob('*/metadata.json')):
        data = json.loads(file.read_text())
        if not data['sprites'].get('Idle'):
            continue
        record = records.get(data['pokemonId'])
        if record is None:
            raise SystemExit(f"forma sin ficha canonica: {data['pokemonId']}")
        forms[data['pokemonId']] = {'name': data['name'], 'dex': record['DexNo']}
    return forms


def fetch(dex):
    request = urllib.request.Request(ENDPOINT.format(dex=dex), headers={'User-Agent': 'hatch.mon palette cache'})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read())


def normalise(palette):
    """Solo los campos que usa la carcasa, en minusculas y sin duplicados."""
    if not palette:
        return None
    seen, highlights = set(), []
    for value in palette.get('highlights') or []:
        key = str(value).lower()
        if key not in seen:
            seen.add(key)
            highlights.append(key)
    trio = [str(palette[k]).lower() for k in ('primary', 'secondary', 'accent') if palette.get(k)]
    if not trio:
        return None
    return {'primary': trio[0],
            'secondary': trio[1] if len(trio) > 1 else trio[0],
            'accent': trio[-1],
            'highlights': highlights or trio}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--refresh', action='store_true', help='vuelve a bajar las formas ya cacheadas')
    parser.add_argument('--only', help='lista de PokemonId separados por comas')
    args = parser.parse_args()

    cache = json.loads(OUT.read_text()) if OUT.exists() else {}
    forms = roster()
    wanted = set(args.only.split(',')) if args.only else set(forms)
    pending = [pid for pid in forms if pid in wanted and (args.refresh or pid not in cache)]

    if not pending:
        print(f'{len(cache)} paletas ya en cache; nada que bajar')
        return

    failed = []
    for index, pokemon_id in enumerate(pending, 1):
        form = forms[pokemon_id]
        try:
            data = fetch(form['dex'])
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            failed.append((pokemon_id, form['name'], error))
            continue
        normal = normalise(data.get('colorPalette'))
        if normal is None:
            failed.append((pokemon_id, form['name'], 'sin colorPalette'))
            continue
        cache[pokemon_id] = {'name': form['name'], 'dex': form['dex'], 'normal': normal,
                             'shiny': normalise(data.get('shinyColorPalette')) or normal}
        print(f"  {index}/{len(pending)}  {form['name']:<14} {normal['primary']} {normal['secondary']} {normal['accent']}")
        time.sleep(DELAY_SECONDS)

    OUT.write_text(json.dumps(dict(sorted(cache.items())), ensure_ascii=False, indent=1) + '\n')
    print(f'{len(cache)} paletas en {OUT.relative_to(ROOT)}')
    if failed:
        print(f'\n{len(failed)} sin resolver:')
        for pokemon_id, name, error in failed:
            print(f'  {pokemon_id} {name}: {error}')
        raise SystemExit(1)


if __name__ == '__main__':
    main()
