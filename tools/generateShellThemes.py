"""Temas de carcasa a partir de las paletas cacheadas en `master/palettes.json`.

Una carcasa dice de quien es antes de leer el nombre. Cada forma aporta:

  * los colores de su paleta (pokemonpalette.com, cacheados por `tools/fetchPalettes.py`),
    de los que salen los seis tonos del plastico y el tinte del fondo de pagina;
  * cuantos colores lleva el estampado, segun lo lejos que este de la forma base de su
    linea: una base va monocroma y sin motivo, y cada evolucion suma un color;
  * un motivo: silueta propia si la especie tiene una dibujada a mano en `shellSkins.js`,
    y si no, la familia geometrica que le toca por su tipo primario.

No hay respaldo silencioso: si una forma no esta en la cache, el generador para. Inventar
un color seria peor que fallar, porque nadie se enteraria.
"""
from collections import Counter
import colorsys
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PALETTES = ROOT / 'master/palettes.json'
# Motivo por tipo primario cuando la especie no tiene silueta propia.
TYPE_MOTIFS = {
    'Fire': 'sparks', 'Water': 'waves', 'Electric': 'bolts', 'Grass': 'sprouts',
    'Psychic': 'orbits', 'Fairy': 'diamonds', 'Normal': 'dots', 'Fighting': 'bands',
    'Ice': 'crystals', 'Dragon': 'scales', 'Rock': 'blocks', 'Dark': 'eclipse',
    'Ghost': 'eclipse', 'Steel': 'blocks', 'Ground': 'bands', 'Flying': 'waves',
    'Bug': 'dots', 'Poison': 'diamonds',
}
# Siluetas dibujadas a mano, por especie (numero de Pokedex). Las formas alternas de una
# misma especie comparten silueta: separarlas leeria como un fallo, no como un detalle.
SPECIES_MOTIFS = {6: 'charizard', 124: 'jynx', 125: 'electabuzz',
                  143: 'snorlax', 468: 'togekiss', 849: 'toxtricity'}
# Colores del estampado segun escalones desde la forma base de la linea.
MOTIF_COLORS_BY_DEPTH = (0, 1, 2)


def hex_to_rgb(value):
    value = value.lstrip('#')
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def mix(color, target, amount):
    return '#' + ''.join(f'{round(c * (1 - amount) + target * amount):02x}' for c in color)


def readable(value, floor=.42):
    """Oscurece un color hasta que sirve de canto sobre un boton claro."""
    r, g, b = (c / 255 for c in hex_to_rgb(value))
    hue, saturation, lightness = colorsys.rgb_to_hls(r, g, b)
    lightness = min(lightness, floor)
    saturation = max(saturation, .35)
    return '#' + ''.join(f'{round(c * 255):02x}' for c in colorsys.hls_to_rgb(hue, lightness, saturation))


def luminance(rgb):
    r, g, b = (c / 255 for c in rgb)
    return .2126 * r + .7152 * g + .0722 * b


def darken_to(rgb, target):
    """Mezcla hacia negro hasta bajar de `target` de luminancia.

    Se oscurece el color tal cual en vez de reconstruirlo desde HLS: la saturacion HLS
    miente en los extremos —un #eeeeff casi blanco marca saturacion 1— y bajarle la luz
    devolvia un azul puro que no esta en ninguna parte del Pokemon. Multiplicar conserva
    el tono y la proporcion de color reales.
    """
    current = luminance(rgb)
    if current <= target:
        return rgb
    factor = max(.05, target / current) ** .85
    return tuple(c * factor for c in rgb)


def distinct_edges(highlights, count=4):
    """Cuatro cantos que se distingan de verdad entre si.

    Coger los cuatro primeros highlights no vale: dos tonos vecinos de la misma paleta dan
    cantos que a simple vista son el mismo, y entonces el color por accion no informa de
    nada. Cuando la paleta no da para cuatro colores separados, los que faltan salen a
    distinta profundidad del mismo tono, que sigue siendo un color del Pokemon.
    """
    seen = [hex_to_rgb(value) for value in highlights] or [(128, 128, 128)]
    spread = lambda a, b: max(abs(x - y) for x, y in zip(a, b))
    chosen = []
    for candidate in seen:
        if all(spread(candidate, other) > 48 for other in chosen):
            chosen.append(candidate)
        if len(chosen) == count:
            break

    # Suficientemente oscuros para leerse de canto bajo un boton claro, pero no tanto que el
    # color se pierda: por debajo de .15 los cuatro se ven negros y la senal deja de informar.
    targets = (.24, .36, .17, .45)
    edges, used = [], []
    for index in range(count):
        base = chosen[index % len(chosen)]
        # Cada repeticion del mismo tono baja o sube un escalon, asi que nunca coinciden.
        depth = targets[index % len(targets)] if index < len(chosen) else targets[index % len(targets)]
        edge = darken_to(base, depth)
        while any(spread(edge, other) <= 24 for other in used):
            depth *= .66
            edge = darken_to(base, depth)
            if depth < .03:
                break
        used.append(edge)
        edges.append('#' + ''.join(f'{round(max(0, min(255, c))):02x}' for c in edge))
    return edges


def line_depth(pokemon_id, predecessors):
    """Escalones desde la forma base de la linea. Corta ante un ciclo en el dato."""
    depth, seen = 0, {pokemon_id}
    current = predecessors.get(pokemon_id)
    while current and current not in seen:
        seen.add(current)
        depth += 1
        current = predecessors.get(current)
    return depth


def build(palette, record, depth, motif_names):
    colors = palette['normal']
    primary = hex_to_rgb(colors['primary'])
    wanted = MOTIF_COLORS_BY_DEPTH[min(depth, len(MOTIF_COLORS_BY_DEPTH) - 1)]
    # El estampado sale de los tonos que no son el plastico, para que se despegue del fondo.
    rest = [c for c in colors['highlights'] if c != colors['primary']] or [colors['accent']]
    motif_colors = [readable(c, .5) for c in rest[:wanted]]
    dex = record['DexNo']
    species = SPECIES_MOTIFS.get(dex)
    motif = (species or TYPE_MOTIFS.get(record.get('Type1'), 'dots')) if motif_colors else 'plain'
    if species and species not in motif_names:
        raise SystemExit(f'silueta declarada sin dibujar en shellSkins.js: {species}')
    edges = (colors['highlights'] or [colors['primary']])
    return {
        'name': palette['name'],
        'shellBase': mix(primary, 255, .48), 'shellDark': mix(primary, 0, .60),
        'shellLight': mix(primary, 255, .80), 'accent': mix(primary, 0, .12),
        'bezel': mix(primary, 0, .65), 'button': mix(primary, 255, .87),
        # El fondo de pagina se tine, pero muy poco: es el lienzo del estampado, no el estampado.
        'pageBase': mix(primary, 255, .82),
        'buttonEdges': distinct_edges(edges),
        'motif': motif,
        'motifColors': motif_colors,
    }


def main():
    if not PALETTES.exists():
        raise SystemExit(f'falta {PALETTES.relative_to(ROOT)}: ejecuta tools/fetchPalettes.py')
    palettes = json.loads(PALETTES.read_text())
    canonical = json.loads((ROOT / 'master/hatchmonData_v2.json').read_text())
    records = {entry['PokemonId']: entry for entry in canonical['pokemon']}
    predecessors = {entry['PokemonId']: entry['PreEvolutionId'] for entry in canonical['pokemon']}
    overrides = json.loads((ROOT / 'assets/skins/motifOverrides.json').read_text())
    motif_names = set(__import__('re').findall(r'^\s{2}([a-z]+):\{', (ROOT / 'shellSkins.js').read_text(), __import__('re').M))

    themes, missing = {}, []
    for file in sorted((ROOT / 'assets/pmd').glob('*/metadata.json')):
        data = json.loads(file.read_text())
        if not data['sprites'].get('Idle'):
            continue
        pokemon_id = data['pokemonId']
        if pokemon_id not in palettes:
            missing.append(f"{pokemon_id} {data['name']}")
            continue
        depth = line_depth(pokemon_id, predecessors)
        themes[pokemon_id] = build(palettes[pokemon_id], records[pokemon_id], depth, motif_names)

    if missing:
        raise SystemExit('sin paleta cacheada (ejecuta tools/fetchPalettes.py):\n  ' + '\n  '.join(missing))

    for pokemon_id, override in overrides.items():
        if pokemon_id in themes:
            themes[pokemon_id].update(override)

    out = ROOT / 'assets/skins'
    out.mkdir(exist_ok=True)
    (out / 'themes.js').write_text(
        '/* Generated by tools/generateShellThemes.py from master/palettes.json. */\n'
        'const SHELL_THEMES=' + json.dumps(themes, ensure_ascii=False, separators=(',', ':')) + ';\n')
    plain = sum(1 for theme in themes.values() if theme['motif'] == 'plain')
    silhouettes = Counter(t['motif'] for t in themes.values() if t['motif'] in SPECIES_MOTIFS.values())
    print(f'{len(themes)} temas; {plain} bases monocromas, {len(themes) - plain} con estampado, '
          f'{sum(silhouettes.values())} con silueta propia ({", ".join(sorted(silhouettes))})')


if __name__ == '__main__':
    main()
