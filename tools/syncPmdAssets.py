#!/usr/bin/env python3
"""Selective PMDCollab sync. Python 3 + Pillow; Node reads the existing adapter.
--list, --ids 0172A0,0026L0, --offline (rebuild from local files), --refresh.
"""
import argparse, concurrent.futures, hashlib, json, os, pathlib, shutil, subprocess, urllib.request, urllib.error, xml.etree.ElementTree as ET
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE='https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/'
OUT=ROOT/'assets/pmd'
EMOTIONS=['Normal','Happy','Joyous','Angry','Sad','Pain','Surprised','Worried','Sigh']
# Verified tracker.json subgroup names, never inferred from display-name similarity.
FORMS={'0439A0':('0439','Mime_Jr_',None),'0122A0':('0122','Mr_Mime',None),'0026L0':('0026/0001','Raichu','Alola'),'0849A0':('0849','Toxtricity',None),'0849B0':('0849/0001','Toxtricity','Lowkey')}
def fetch(remote,path,args,optional=False):
 if path.exists() and not args.refresh:return True
 if args.offline:return path.exists()
 try:
  with urllib.request.urlopen(BASE+remote,timeout=30) as r:data=r.read()
 except urllib.error.HTTPError as e:
  if optional and e.code==404:return False
  raise
 path.parent.mkdir(parents=True,exist_ok=True);temp=path.with_suffix(path.suffix+'.tmp');temp.write_bytes(data);temp.replace(path);return True

def sync(row,tracker,args,states,shiny=False):
 pid=row['id'];route,baseName,form=FORMS.get(pid,(pid[:4],row['name'],None))
 if pid not in FORMS and not pid.endswith('A0'):raise ValueError('Explicit form mapping required: '+pid)
 node=tracker[route[:4]]
 if node['name']!=baseName:raise ValueError('Unverified identity: '+pid)
 for part in route.split('/')[1:]:node=node['subgroups'][part]
 if form and node['name']!=form:raise ValueError('Unverified form: '+pid)
 if shiny:
  parts=['0001'] if form else ['0000','0001']
  for part in parts:
   node=node.get('subgroups',{}).get(part)
   if node is None:return pid,0,0
   route+='/'+part
  if node['name']!='Shiny':raise ValueError('Unverified shiny: '+pid)
 folder=OUT/pid/('shiny' if shiny else '');meta={'pokemonId':pid,'source':BASE,'route':route,'name':row['name'],'sprites':{},'portraits':{},'credits':{'sprite':node['sprite_credit'],'portrait':node['portrait_credit']},'files':{}}
 xml=folder/'sprites/AnimData.xml'
 if fetch('sprite/'+route+'/AnimData.xml',xml,args,True):
  anims={a.findtext('Name'):a for a in ET.parse(xml).findall('./Anims/Anim')}
  selected=set()
  for choices in states.values():
   selected.update(n for n in choices if n in anims)
  for name in sorted(selected):
   anim=anims[name];actual=name;seen=set()
   while anim.findtext('CopyOf'):
    if actual in seen:raise ValueError('Cyclic animation alias')
    seen.add(actual);actual=anim.findtext('CopyOf');anim=anims[actual]
   file=folder/'sprites'/(actual+'-Anim.png')
   if not fetch('sprite/'+route+'/'+file.name,file,args,True):continue
   im=Image.open(file).convert('RGBA');w,h=int(anim.findtext('FrameWidth')),int(anim.findtext('FrameHeight'))
   durations=[round(int(d.text)*1000/60,3) for d in anim.findall('./Durations/Duration')]
   if not durations or im.width%w or im.height%h or len(durations)>im.width//w:continue
   boxes=[im.crop((i*w,0,(i+1)*w,h)).getchannel('A').getbbox() for i in range(len(durations))];boxes=[b for b in boxes if b]
   if not boxes:continue
   x,y=min(b[0] for b in boxes),min(b[1] for b in boxes);right,bottom=max(b[2] for b in boxes),max(b[3] for b in boxes)
   meta['sprites'][name]={'type':'sheet','src':file.relative_to(ROOT).as_posix(),'width':w,'height':h,'columns':im.width//w,'row':0,'frames':len(durations),'durations':durations,'scale':3,'frameBounds':[list(im.crop((i*w,0,(i+1)*w,h)).getchannel('A').getbbox() or (0,0,1,1)) for i in range(len(durations))],'crop':{'x':x,'y':y,'width':right-x,'height':bottom-y}}
 for name in EMOTIONS:
  if name not in node['portrait_files']:continue
  file=folder/'portraits'/(name+'.png')
  if fetch('portrait/'+route+'/'+file.name,file,args,True):
   im=Image.open(file);im.verify();meta['portraits'][name]=file.relative_to(ROOT).as_posix()
 for kind in ['sprite','portrait']:
  fetch(kind+'/'+route+'/credits.txt',folder/('credits-'+kind+'.txt'),args,True)
 for file in folder.rglob('*'):
  if file.is_file() and file.name!='metadata.json' and (shiny or 'shiny' not in file.relative_to(folder).parts):meta['files'][file.relative_to(folder).as_posix()]=hashlib.sha256(file.read_bytes()).hexdigest()
 folder.mkdir(parents=True,exist_ok=True);(folder/'metadata.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
 return pid,len(meta['sprites']),len(meta['portraits'])

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--ids');parser.add_argument('--list',action='store_true');parser.add_argument('--offline',action='store_true');parser.add_argument('--refresh',action='store_true');parser.add_argument('--node',default=shutil.which('node'));args=parser.parse_args()
 if not args.node:parser.error('Node required; pass --node /path/to/node')
 js="const fs=require('fs'),vm=require('vm');for(const f of ['evolutionTable.js','hatchmonData_v2.js','pokemonDataAdapter.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'));vm.runInThisContext(fs.readFileSync('pmdRenderer.js','utf8'));process.stdout.write(JSON.stringify({roster:Object.keys(evolutionTable).map(id=>({id:PokemonData.canonicalId(id),name:PokemonData.get(id).DisplayName})),states:PMD_STATE_FALLBACKS}));"
 data=json.loads(subprocess.check_output([args.node,'-e',js],cwd=ROOT));roster=data['roster'];wanted=set(args.ids.split(',')) if args.ids else {r['id'] for r in roster}
 if wanted-{r['id'] for r in roster}:parser.error('IDs not in playable roster: '+str(wanted-{r['id'] for r in roster}))
 if args.list:print('\n'.join(r['id']+' '+r['name'] for r in roster if r['id'] in wanted));return
 OUT.mkdir(parents=True,exist_ok=True)
 for file in ['tracker.json','credit_names.txt','LICENSE.md']:fetch(file,OUT/'source'/file,args)
 tracker=json.loads((OUT/'source/tracker.json').read_text())
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
  results=list(pool.map(lambda pair:sync(pair[0],tracker,args,data['states'],pair[1]),[(r,shiny) for r in roster if r['id'] in wanted for shiny in [False,True]]))
 manifest={};credits=['# PMDCollab assets used by Hatch.mon','', 'Source: https://github.com/PMDCollab/SpriteCollab','Policy and attribution: source/LICENSE.md; author names and contacts: source/credit_names.txt.','Per-file credit logs are preserved alongside each species when provided. No entire repository is downloaded.','']
 names={}
 for line in (OUT/'source/credit_names.txt').read_text().splitlines():
  fields=line.split('\t')
  if len(fields)>=2:names[fields[1]]=fields[0]+' '+(' '.join(fields[2:]))
 for row in roster:
  file=OUT/row['id']/'metadata.json'
  if not file.exists():continue
  m=json.loads(file.read_text());manifest[row['id']]={'sprites':m['sprites'],'portraits':m['portraits']}
  shinyFile=OUT/row['id']/'shiny/metadata.json'
  if shinyFile.exists():
   shiny=json.loads(shinyFile.read_text());manifest[row['id']]['shiny']={'sprites':shiny['sprites'],'portraits':shiny['portraits']}
   credits+=['## '+row['id']+' shiny', 'Source path: '+shiny['route'], 'Per-file attribution: '+row['id']+'/shiny/credits-sprite.txt and credits-portrait.txt', 'Sprite credits: '+json.dumps(shiny['credits']['sprite']), 'Portrait credits: '+json.dumps(shiny['credits']['portrait']), '']
  credits+=['## '+m['pokemonId']+' · '+m['name'], 'Source path: '+m['route']]
  for kind,key in [('sprite','sprites'),('portrait','portraits')]:
   if not m[key]:continue
   c=m['credits'][kind];ids=[c['primary']]+c['secondary'];log=OUT/m['pokemonId']/('credits-'+kind+'.txt')
   if log.exists():
    for line in log.read_text().splitlines():
     fields=line.split('\t')
     if len(fields)>=5 and (set(fields[4].split(','))&set(m[key])):ids.append(fields[1])
   ids=list(dict.fromkeys(ids))
   credits+=[kind+': '+', '.join(names.get(i,i) for i in ids if i), 'Files/states: '+', '.join(m[key])]
  credits+=['']
 (OUT/'manifest.js').write_text('/* Generated by tools/syncPmdAssets.py. Local visual metadata only. */\nconst PMD_ASSETS='+json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+';\n')
 (OUT/'CREDITS.md').write_text('\n'.join(line.rstrip() for line in credits)+'\n')
 print(json.dumps({'variantsSynced':len(results),'spriteStates':sum(r[1] for r in results),'portraits':sum(r[2] for r in results),'manifestSpecies':len(manifest)}))
if __name__=='__main__':main()
