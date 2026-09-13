"""Optimize runtime PNGs and stage an allowlisted static site. Originals stay in master.

Optimisation is lossless twice over: a PNG with at most 256 distinct RGBA colours is rewritten
with an exact palette plus tRNS (PMD sprites use 7-15 colours but ship as 32-bit RGBA), and the
result is only kept when it decodes back to the very same RGBA bytes and is actually smaller.
"""
import argparse, hashlib, io, json, re, shutil
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
BACKUP=ROOT/'master/asset-originals'
STATE=ROOT/'master/asset-optimization.json'
# Bumped when the optimiser learns a new trick, so files recorded by an older pass are revisited.
CODEC=2
def digest(data):return hashlib.sha256(data).hexdigest()
def palettize(image):
    """Exact-palette copy of an RGBA image, or None when it needs more than 256 entries."""
    colors=image.getcolors(1<<24)
    if not colors or len(colors)>256:return None
    order=[color for _,color in sorted(colors,key=lambda pair:-pair[0])]
    index={color:slot for slot,color in enumerate(order)}
    out=Image.new('P',image.size)
    out.putdata([index[pixel] for pixel in image.getdata()])
    flat=[channel for r,g,b,_ in order for channel in (r,g,b)]
    out.putpalette(flat+[0]*(768-len(flat)))
    out.info['transparency']=bytes(alpha for *_,alpha in order)
    return out
def encode(image,**extra):
    buffer=io.BytesIO();image.save(buffer,format='PNG',optimize=True,compress_level=9,**extra);return buffer.getvalue()
def runtime_files():
    files={'index.html'}; todo=['index.html','appBootstrap.mjs']
    while todo:
        name=todo.pop();files.add(name);text=(ROOT/name).read_text()
        refs=re.findall(r'(?:src|data-game-src)="([^"#]+)"',text)+re.findall(r"(?:from\s*|import\()['\"](\.[^'\"]+)['\"]",text)
        for ref in refs:
            path=(Path(name).parent/ref).as_posix();path=str(Path(path))
            if (ROOT/path).is_file() and path not in files:
                files.add(path)
                if path.endswith(('.js','.mjs','.html')):todo.append(path)
    files.update(str(p.relative_to(ROOT)) for p in (ROOT/'assets/ui').glob('*') if p.is_file())
    files.update(str(p.relative_to(ROOT)) for p in (ROOT/'assets/eggs').glob('*.png'))
    files.add('assets/skins/themes.js')
    manifest=(ROOT/'assets/pmd/manifest.js').read_text()
    files.update(re.findall(r'"(assets/[^"\n]+\.png)"',manifest))
    for name in ['assets/pmd/source/LICENSE.md','assets/pmd/source/credit_names.txt']:
        if (ROOT/name).exists():files.add(name)
    files.update(str(p.relative_to(ROOT)) for p in (ROOT/'vendor').iterdir() if p.is_file())
    # The service worker is reached through navigator.serviceWorker.register, not a src attribute.
    files.add('sw.js')
    return sorted(files)

def stampServiceWorker(files):
    """Give sw.js a build ID derived from everything else it may cache, so a deploy rotates it."""
    fingerprint=hashlib.sha256()
    for name in files:
        if name!='sw.js':fingerprint.update(name.encode());fingerprint.update(digest((ROOT/name).read_bytes()).encode())
    build=fingerprint.hexdigest()[:12]
    worker=ROOT/'sw.js';text=worker.read_text()
    stamped=re.sub(r"const BUILD = '[^']*';",f"const BUILD = '{build}';",text,count=1)
    if stamped!=text:worker.write_text(stamped)
    return build
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--optimize',action='store_true');parser.add_argument('--output',default='dist');args=parser.parse_args()
    records=json.loads(STATE.read_text()) if STATE.exists() else {}
    files=runtime_files();rows=[]
    for name in files:
        path=ROOT/name
        if path.suffix!='.png':continue
        raw=path.read_bytes();previous=records.get(name)
        if args.optimize and (not previous or previous['outputHash']!=digest(raw) or previous.get('codec',1)<CODEC):
            image=Image.open(io.BytesIO(raw));original=image.convert('RGBA');size=image.size
            # Egg grid remains 4×4; 208 px per cell covers the fixed 104 CSS px at DPR 2.
            target=(832,832) if name.startswith('assets/eggs/') and size[0]>832 else (264,104) if name=='assets/pokemon_logo.png' and size[0]>264 else size
            optimized=original.resize(target,Image.Resampling.NEAREST) if target!=size else original
            data=encode(optimized)
            palette=palettize(optimized)
            if palette is not None:
                indexed=encode(palette,transparency=palette.info['transparency'])
                if len(indexed)<len(data) and Image.open(io.BytesIO(indexed)).convert('RGBA').tobytes()==optimized.tobytes():data=indexed
            if target==size:assert Image.open(io.BytesIO(data)).convert('RGBA').tobytes()==original.tobytes()
            if len(data)<len(raw):
                # The backup is the untouched download; a second pass must not overwrite it.
                source=BACKUP/name
                if not source.exists():source.parent.mkdir(parents=True,exist_ok=True);source.write_bytes(raw)
                path.write_bytes(data)
                records[name]={'before':(previous or {}).get('before',len(raw)),'after':len(data),'originalSize':(previous or {}).get('originalSize',list(size)),'size':list(target),'outputHash':digest(data),'losslessPixels':target==size and (previous or {}).get('losslessPixels',True),'codec':CODEC}
        im=Image.open(path);record=records.get(name)
        rows.append({'path':name,'before':record['before'] if record else path.stat().st_size,'after':path.stat().st_size,'size':list(im.size),'resized':bool(record and record['originalSize']!=record['size'])})
    if args.optimize:STATE.parent.mkdir(exist_ok=True);STATE.write_text(json.dumps(records,indent=2)+'\n')
    build=stampServiceWorker(files)
    output=Path(args.output).resolve()
    if output==ROOT or ROOT not in output.parents:raise ValueError('Output must be a child of project root')
    if output.exists():
        if not (output/'.hatchmon-build').exists():raise ValueError('Refusing to replace a directory not created by this builder')
        shutil.rmtree(output)
    output.mkdir(parents=True);(output/'.hatchmon-build').write_text('Generated static runtime\n')
    for name in files:
        dest=output/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/name,dest)
    summary={'build':build,'pngCount':len(rows),'pngBefore':sum(r['before'] for r in rows),'pngAfter':sum(r['after'] for r in rows),'runtimeBytes':sum((ROOT/f).stat().st_size for f in files),'files':len(files),'resized':[r['path'] for r in rows if r['resized']]}
    report=ROOT/'master/mobile-asset-audit.json';report.write_text(json.dumps({'summary':summary,'assets':rows},indent=2)+'\n');print(json.dumps(summary))
if __name__=='__main__':main()
