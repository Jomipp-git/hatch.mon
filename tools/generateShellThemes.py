"""Deterministic shell themes sampled from local PMD Idle sprites.

Una carcasa dice de quien es antes de leer el nombre. Cada especie aporta:

  * su color dominante, del que salen los seis tonos del plastico;
  * cuantos colores lleva, segun lo lejos que este de la forma base de su linea:
    una forma base va monocroma y cada evolucion suma un color del propio sprite;
  * un motivo geometrico derivado de su tipo, tenue y repetido sobre el plastico.

El tipo decide el motivo para cubrir el repertorio entero sin trabajo manual;
`assets/skins/motifOverrides.json` pisa lo que haga falta mimar a mano.
"""
from pathlib import Path
from collections import Counter
import colorsys
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
# Motivo por tipo primario. Nombres implementados en shellSkins.js.
TYPE_MOTIFS = {
    'Fire': 'sparks', 'Water': 'waves', 'Electric': 'bolts', 'Grass': 'sprouts',
    'Psychic': 'orbits', 'Fairy': 'diamonds', 'Normal': 'dots', 'Fighting': 'bands',
    'Ice': 'crystals', 'Dragon': 'scales', 'Rock': 'blocks', 'Dark': 'eclipse',
    'Ghost': 'eclipse', 'Steel': 'blocks', 'Ground': 'bands', 'Flying': 'waves',
    'Bug': 'dots', 'Poison': 'diamonds',
}
# Una forma base no lleva motivo: el escalon se nota al evolucionar.
MOTIF_COLORS_BY_DEPTH = (0, 1, 2)


def mix(color, target, amount):
    return '#' + ''.join(f'{round(c * (1 - amount) + target * amount):02x}' for c in color)


def colorful(color):
    r, g, b = (c / 255 for c in color)
    _, saturation, value = colorsys.rgb_to_hsv(r, g, b)
    return saturation > .18 and .12 < value < .96


def distinct(color, chosen):
    """Un tono nuevo, no otra sombra del mismo."""
    hue, _, value = colorsys.rgb_to_hsv(*(c / 255 for c in color))
    for other in chosen:
        other_hue, _, other_value = colorsys.rgb_to_hsv(*(c / 255 for c in other))
        gap = abs(hue - other_hue)
        gap = min(gap, 1 - gap)
        if gap < .07 and abs(value - other_value) < .28:
            return False
    return True


def palette(image, want):
    """Los `want` colores mas frecuentes del sprite que no se pisen entre si."""
    pixels = [(r, g, b) for r, g, b, a in image.getdata() if a > 200]
    counts = Counter(pixels)
    chosen = []
    for color, _ in counts.most_common():
        if not colorful(color) or not distinct(color, chosen):
            continue
        chosen.append(color)
        if len(chosen) == want:
            return chosen
    # Un sprite casi monocromo no da mas tonos. Se completa relajando la saturacion, pero nunca con
    # el contorno negro ni con el blanco del brillo: como motivo leerian a mancha, no a textura.
    for color, _ in counts.most_common():
        _, _, value = colorsys.rgb_to_hsv(*(c / 255 for c in color))
        if color in chosen or not .18 < value < .94:
            continue
        # Aqui vale una sombra del mismo tono, con tal de que se separe en claridad: un sprite de
        # un solo color no tiene un segundo tono que ofrecer, pero si un claro y un oscuro.
        if any(abs(value - colorsys.rgb_to_hsv(*(c / 255 for c in other))[2]) < .2 for other in chosen):
            continue
        chosen.append(color)
        if len(chosen) == want:
            break
    # Antes que inventar un tono, se devuelven menos: el motivo se dibuja igual con uno solo.
    return chosen or [(150, 150, 150)]


def line_depth(pokemon_id, predecessors):
    """Escalones desde la forma base de la linea. Corta ante un ciclo en el dato."""
    depth, seen = 0, {pokemon_id}
    current = predecessors.get(pokemon_id)
    while current and current not in seen:
        seen.add(current)
        depth += 1
        current = predecessors.get(current)
    return depth


canonical = json.loads((ROOT / 'master/hatchmonData_v2.json').read_text())
records = {entry['PokemonId']: entry for entry in canonical['pokemon']}
predecessors = {entry['PokemonId']: entry['PreEvolutionId'] for entry in canonical['pokemon']}
overrides = json.loads((ROOT / 'assets/skins/motifOverrides.json').read_text())

themes = {}
for file in sorted((ROOT / 'assets/pmd').glob('*/metadata.json')):
    data = json.loads(file.read_text())
    idle = data['sprites'].get('Idle')
    if not idle:
        continue
    pokemon_id = data['pokemonId']
    record = records.get(pokemon_id, {})
    depth = min(line_depth(pokemon_id, predecessors), len(MOTIF_COLORS_BY_DEPTH) - 1)
    image = Image.open(ROOT / idle['src']).convert('RGBA').crop((0, 0, idle['width'], idle['height']))
    colors = palette(image, 1 + MOTIF_COLORS_BY_DEPTH[depth])
    color = colors[0]
    motif_colors = colors[1:1 + MOTIF_COLORS_BY_DEPTH[depth]]
    themes[pokemon_id] = {
        'name': data['name'],
        'shellBase': mix(color, 255, .48), 'shellDark': mix(color, 0, .60),
        'shellLight': mix(color, 255, .80), 'accent': mix(color, 0, .12),
        'bezel': mix(color, 0, .65), 'button': mix(color, 255, .87),
        # El motivo se acerca al plastico para que sea textura y no dibujo encima.
        'motif': TYPE_MOTIFS.get(record.get('Type1'), 'dots') if motif_colors else 'plain',
        'motifColors': [mix(c, 0, .18) for c in motif_colors],
    }

for pokemon_id, override in overrides.items():
    if pokemon_id in themes:
        themes[pokemon_id].update(override)

out = ROOT / 'assets/skins'
out.mkdir(exist_ok=True)
(out / 'themes.js').write_text(
    '/* Generated by tools/generateShellThemes.py from PMD Idle pixels. */\n'
    'const SHELL_THEMES=' + json.dumps(themes, ensure_ascii=False, separators=(',', ':')) + ';\n')
plain = sum(1 for theme in themes.values() if theme['motif'] == 'plain')
print(len(themes), 'shell themes generated;', plain, 'monochrome base forms,', len(themes) - plain, 'patterned')
