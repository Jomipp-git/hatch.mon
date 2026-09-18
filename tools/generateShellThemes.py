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
SPECIES_MOTIFS = {
    1: 'bulbasaur', 2: 'ivysaur', 3: 'venusaur', 4: 'charmander', 5: 'charmeleon', 6: 'charizard',
    7: 'squirtle', 8: 'wartortle', 9: 'blastoise', 25: 'pikachu', 26: 'raichu', 35: 'clefairy',
    36: 'clefable', 39: 'jigglypuff', 40: 'wigglytuff', 58: 'growlithe', 59: 'arcanine',
    63: 'abra', 64: 'kadabra', 65: 'alakazam', 106: 'hitmonlee', 107: 'hitmonchan',
    113: 'chansey', 122: 'mrmime', 124: 'jynx', 125: 'electabuzz', 126: 'magmar', 133: 'eevee',
    134: 'vaporeon', 135: 'jolteon', 136: 'flareon', 143: 'snorlax', 147: 'dratini',
    148: 'dragonair', 149: 'dragonite', 172: 'pichu', 173: 'cleffa', 174: 'igglybuff',
    175: 'togepi', 176: 'togetic', 183: 'marill', 184: 'azumarill', 185: 'sudowoodo',
    196: 'espeon', 197: 'umbreon', 202: 'wobbuffet', 226: 'mantine', 236: 'tyrogue',
    237: 'hitmontop', 238: 'smoochum', 239: 'elekid', 240: 'magby', 242: 'blissey',
    298: 'azurill', 315: 'roselia', 358: 'chimecho', 360: 'wynaut', 406: 'budew',
    407: 'roserade', 433: 'chingling', 438: 'bonsly', 439: 'mimejr', 440: 'happiny',
    446: 'munchlax', 447: 'riolu', 448: 'lucario', 458: 'mantyke', 466: 'electivire',
    467: 'magmortar', 468: 'togekiss', 470: 'leafeon', 471: 'glaceon', 700: 'sylveon',
    848: 'toxel', 849: 'toxtricity',
}
# Sufijo de las ediciones shiny dentro de SHELL_THEMES.
SHINY_SUFFIX = ':shiny'
# --- Boutique: carcasas de pago, que no salen de ninguna paleta Pokemon ---
#
# Las de logro cuentan de quien son y por eso se derivan de la especie. Estas cuentan de que estan
# hechas, asi que sus colores se eligen a mano: derivarlos de un algoritmo es justo lo que hacia que
# el conjunto se leyera pre-generado. El prefijo `boutique:` las separa del espacio de IDs de
# especie, que son claves de desbloqueo por logro.
#
# Cada entrada: (id, nombre ES, nombre EN, plastico, [tres colores de estampado], cantos opcionales).
# Sin cantos, salen del propio estampado, que es lo que hace que la carcasa se lea de una pieza.
BOUTIQUE_PREFIX = 'boutique:'
BOUTIQUE_STYLES = {
    'denim': ('Tejana', 'Denim', (
        ('indigo', 'Indigo', 'Indigo', '#3b5a86', ('#20385c', '#d8c48a', '#8fa8c9')),
        ('black', 'Negro lavado', 'Washed black', '#4a4a52', ('#24242a', '#9a9aa4', '#6f6f7a')),
        ('sky', 'Lavado claro', 'Light wash', '#8fb2d4', ('#4d7ba6', '#e6d9b0', '#c3d7ea')),
    )),
    'camo': ('Camuflaje', 'Camo', (
        ('forest', 'Bosque', 'Forest', '#6d7a53', ('#39452a', '#8b9468', '#2b3320')),
        ('desert', 'Desierto', 'Desert', '#c2a878', ('#8a7146', '#d9c79c', '#5d4b2c')),
        ('urban', 'Urbano', 'Urban', '#8d9196', ('#4c5054', '#c2c6ca', '#2e3134')),
    )),
    'neon': ('Neon', 'Neon', (
        ('magenta', 'Magenta', 'Magenta', '#2b0f1e', ('#ff3b94', '#55ffe1', '#a6fd29')),
        ('cyan', 'Cian', 'Cyan', '#06222a', ('#55ffe1', '#a6fd29', '#ff3b94')),
        ('lime', 'Lima', 'Lime', '#16250b', ('#a6fd29', '#ff3b94', '#55ffe1')),
    )),
    'guts': ('Transparente', 'Clear', (
        ('grape', 'Uva', 'Grape', '#8d78c4', ('#3a2a6b', '#bfb0e4', '#5f5296')),
        ('atomic', 'Ambar', 'Amber', '#d19b4a', ('#7a5313', '#f0d69d', '#a3762a')),
        ('smoke', 'Ahumada', 'Smoke', '#9a9690', ('#4a4743', '#cfccc7', '#6e6b66')),
    )),
    # Cada variante manda con su gema y se acompana de dos tonos que le peguen: el brillo que la
    # aclara y una chispa que la contrasta sin sacarla de su familia.
    'sequins': ('Lentejuelas', 'Sequins', (
        ('ruby', 'Rubi', 'Ruby', '#5c1020', ('#c41e3a', '#ff8fa3', '#e8b84b')),
        ('sapphire', 'Zafiro', 'Sapphire', '#111f4d', ('#1f5fc4', '#9fd0ff', '#c9d6e8')),
        ('emerald', 'Esmeralda', 'Emerald', '#0d3a2a', ('#128a5c', '#7fe0b0', '#e8c96b')),
    )),
    'picnic': ('Mantel', 'Picnic', (
        ('red', 'Rojo', 'Red', '#f0e6d8', ('#c2352f', '#e08a84', '#8c211c')),
        ('blue', 'Azul', 'Blue', '#eef0e4', ('#2f5fa8', '#84a7d8', '#1c3c6e')),
        ('yellow', 'Amarillo', 'Yellow', '#f5efd9', ('#d9a516', '#f0cf72', '#8f6b0c')),
    )),
    'polka': ('Topos', 'Polka', (
        ('cream', 'Crema', 'Cream', '#f2e7d5', ('#d8503f', '#3a7fa8', '#e0a52c')),
        ('ink', 'Tinta', 'Ink', '#2f3038', ('#f2b8c6', '#a8d8e8', '#f5e6a8')),
        ('mint', 'Menta', 'Mint', '#cfe8dc', ('#2f6f5c', '#e8a0b8', '#f0d98c')),
    )),
}


def boutique_theme(style, variant, name_es, name_en, plastic, motif_colors):
    """Una carcasa de tienda. Mismo contrato que las de especie, mas los botones del neon."""
    primary = hex_to_rgb(plastic)
    dark = luminance(primary) < .35
    theme = {
        'name': name_es, 'nameEn': name_en, 'boutique': True,
        # El plastico oscuro no se aclara al 48% como el claro: el neon vive de ser oscuro.
        'shellBase': mix(primary, 255, .12) if dark else mix(primary, 255, .34),
        'shellDark': mix(primary, 0, .55), 'shellLight': mix(primary, 255, .72),
        'accent': mix(primary, 0, .10), 'bezel': mix(primary, 0, .68),
        'button': legible_button(mix(primary, 255, .40) if dark else mix(primary, 255, .88)),
        'pageBase': mix(primary, 255, .30) if dark else mix(primary, 255, .80),
        # distinct_edges separa los cuatro cantos de verdad: repetir el primer color en el cuarto
        # boton dejaba dos acciones con el mismo canto y el color dejaba de informar.
        'buttonEdges': distinct_edges(list(motif_colors)),
        'motif': style, 'motifColors': list(motif_colors),
    }
    if dark:
        # El plastico oscuro deja ilegible el texto de chrome, que esta fijado en un gris oscuro.
        theme['shellText'] = mix(primary, 255, .88)
    if style == 'neon':
        # El unico estilo con los botones a color completo: el resto solo tine el canto. Se baja
        # cada relleno por luminancia hasta que el texto blanco se lee, en vez de por HLS: el
        # amarillo puro salia oliva con readable() y "Apagar luz" no habia quien lo leyera.
        theme['buttonFills'] = [
            '#' + ''.join(f'{round(max(0, min(255, c))):02x}' for c in darken_to(hex_to_rgb(edge), .16))
            for edge in theme['buttonEdges']]
        theme['buttonText'] = '#ffffff'
    return theme


def boutique_themes():
    themes = {}
    for style, (_, _, variants) in BOUTIQUE_STYLES.items():
        for variant, name_es, name_en, plastic, colors in variants:
            themes[f'{BOUTIQUE_PREFIX}{style}-{variant}'] = boutique_theme(
                style, variant, name_es, name_en, plastic, colors)
    return themes
# Colores del estampado segun escalones desde la forma base de la linea: la base va monocroma
# (el motivo se dibuja, pero en un solo color) y cada evolucion suma uno. Si la paleta no da
# para tantos, se usan los que haya; nunca se inventa un color para rellenar.
MOTIF_COLORS_BY_DEPTH = (1, 2, 3, 3)


def hex_to_rgb(value):
    value = value.lstrip('#')
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def mix(color, target, amount):
    return '#' + ''.join(f'{round(c * (1 - amount) + target * amount):02x}' for c in color)


# La tinta del juego. Un boton de cuidado sin `buttonText` propio hereda este color, asi que su
# fondo tiene que contrastar con el o el boton queda ilegible: paso con polka-ink y con las tres
# gemas nuevas, que salian a 3,5-4,0 cuando el minimo legible es 4,5.
INK = '#303d35'


def contrast(a, b):
    """Razon de contraste WCAG entre dos colores."""
    def channel(value):
        value /= 255
        return value / 12.92 if value <= .03928 else ((value + .055) / 1.055) ** 2.4

    def lum(color):
        r, g, b_ = (channel(c) for c in hex_to_rgb(color))
        return .2126 * r + .7152 * g + .0722 * b_

    first, second = lum(a), lum(b)
    return (max(first, second) + .05) / (min(first, second) + .05)


def legible_button(fill, text=INK, minimum=4.5):
    """Aclara el fondo del boton hasta que el texto se lee encima.

    Se aclara en vez de oscurecer porque la tinta es oscura: llevarlo a blanco siempre acaba
    cumpliendo, mientras que oscurecer pasaria por el mismo tono que el texto.
    """
    if contrast(fill, text) >= minimum:
        return fill
    current = hex_to_rgb(fill)
    for step in range(1, 21):
        candidate = mix(current, 255, step / 20)
        if contrast(candidate, text) >= minimum:
            return candidate
    return '#ffffff'


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


def build(palette, record, depth, motif_names, variant='normal'):
    colors = palette[variant]
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
        'bezel': mix(primary, 0, .65), 'button': legible_button(mix(primary, 255, .87)),
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
        # La edicion shiny es la misma carcasa con la paleta shiny: se desbloquea aparte, al
        # tener esa forma en shiny, asi que vive en su propia clave.
        shiny = build(palettes[pokemon_id], records[pokemon_id], depth, motif_names, 'shiny')
        shiny['name'] = f"{palettes[pokemon_id]['name']} \u2727"
        shiny['shinyOf'] = pokemon_id
        themes[pokemon_id + SHINY_SUFFIX] = shiny

    if missing:
        # Fallar y decir el comando exacto, en vez de recaer en un muestreo del sprite: un
        # respaldo silencioso inventaria un color y nadie se enteraria hasta verlo en pantalla.
        ids = ','.join(entry.split()[0] for entry in missing)
        raise SystemExit(
            f'{len(missing)} formas sin paleta cacheada:\n  ' + '\n  '.join(missing)
            + f'\n\nLanza:  python3 tools/fetchPalettes.py --only {ids}')

    for pokemon_id, override in overrides.items():
        if pokemon_id in themes:
            themes[pokemon_id].update(override)

    boutique = boutique_themes()
    for theme in boutique.values():
        if theme['motif'] not in motif_names:
            raise SystemExit(f"estampado de boutique sin dibujar en shellSkins.js: {theme['motif']}")
    themes.update(boutique)

    out = ROOT / 'assets/skins'
    out.mkdir(exist_ok=True)
    (out / 'themes.js').write_text(
        '/* Generated by tools/generateShellThemes.py from master/palettes.json. */\n'
        'const SHELL_THEMES=' + json.dumps(themes, ensure_ascii=False, separators=(',', ':')) + ';\n')
    normal = [t for t in themes.values() if 'shinyOf' not in t]
    own = sum(1 for t in normal if t['motif'] in SPECIES_MOTIFS.values())
    generic = sum(1 for t in normal if t['motif'] not in SPECIES_MOTIFS.values() and t['motif'] != 'plain')
    print(f'{len(themes)} temas ({len(normal) - len(boutique)} normales + {len(themes) - len(normal)} shiny '
          f'+ {len(boutique)} de boutique); {own} con silueta propia, {generic} con familia por tipo')


if __name__ == '__main__':
    main()
