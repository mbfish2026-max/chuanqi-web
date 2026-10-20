#!/usr/bin/env python3
"""Convert Cocos Creator 2.4 prefabs/scene (JSON) into compact UI trees for the DOM renderer.
Output: ui/<name>.json  and copies referenced PNGs into assets/ui/<texture-uuid>.png
Run from web-replica/:  python3 tools/convert_prefabs.py ../src"""
import json, glob, os, sys, shutil
SRC = sys.argv[1] if len(sys.argv) > 1 else '../src'
OUT = 'ui'; IMG = 'assets/ui'
os.makedirs(OUT, exist_ok=True); os.makedirs(IMG, exist_ok=True)

# ---- uuid maps from .meta ----
frames = {}   # spriteFrame uuid -> info
fonts = {}
for meta in glob.glob(SRC + '/assets/**/*.meta', recursive=True):
    try: m = json.load(open(meta))
    except Exception: continue
    path = meta[:-5]
    if m.get('importer') == 'bitmap-font' or path.endswith('.ttf'):
        fonts[m['uuid']] = os.path.basename(path); continue
    if m.get('importer') == 'texture' or path.endswith('.png') or path.endswith('.jpg'):
        for k, s in (m.get('subMetas') or {}).items():
            if s.get('importer') != 'sprite-frame': continue
            frames[s['uuid']] = dict(file=path, tex=m['uuid'], name=k, rotated=s.get('rotated', False),
                trimX=s.get('trimX', 0), trimY=s.get('trimY', 0), w=s.get('width'), h=s.get('height'),
                rawW=s.get('rawWidth'), rawH=s.get('rawHeight'),
                b=[s.get('borderTop', 0), s.get('borderRight', 0), s.get('borderBottom', 0), s.get('borderLeft', 0)])
    for k, s in (m.get('subMetas') or {}).items():   # plist atlases: subMetas with rawTextureUuid of the atlas texture
        if s.get('importer') == 'sprite-frame' and s['uuid'] not in frames and path.endswith('.plist'):
            frames[s['uuid']] = dict(file=path.replace('.plist', '.png'), tex=s.get('rawTextureUuid'), name=k, rotated=s.get('rotated', False),
                trimX=s.get('trimX', 0), trimY=s.get('trimY', 0), w=s.get('width'), h=s.get('height'),
                rawW=s.get('rawWidth'), rawH=s.get('rawHeight'), b=[s.get('borderTop',0), s.get('borderRight',0), s.get('borderBottom',0), s.get('borderLeft',0)])
used = {}
from PIL import Image
def frame(ref):
    """Export the sprite frame as its own cropped PNG (handles trim, atlas sub-frames, rotation)."""
    if not ref or '__uuid__' not in ref: return None
    u = ref['__uuid__']; f = frames.get(u)
    if not f: return None
    if u not in used:
        dst = '%s/%s_%s.png' % (IMG, f['name'], u[:6])
        im = Image.open(f['file'])
        if f['rotated']:
            im = im.crop((f['trimX'], f['trimY'], f['trimX'] + f['h'], f['trimY'] + f['w'])).rotate(90, expand=True)
        elif (f['trimX'], f['trimY'], f['w'], f['h']) != (0, 0) + im.size:
            im = im.crop((f['trimX'], f['trimY'], f['trimX'] + f['w'], f['trimY'] + f['h']))
        im.save(dst); used[u] = dst
    r = dict(src=used[u], w=f['w'], h=f['h'], n=f['name'])
    if any(f['b']): r['b'] = f['b']
    return r

def col(c, default=None):
    if not c: return default
    return '#%02x%02x%02x' % (c.get('r', 255), c.get('g', 255), c.get('b', 255))

def convert(path):
    d = json.load(open(path))
    def get(ref): return d[ref['__id__']] if isinstance(ref, dict) and '__id__' in ref else ref
    rootIdx = 1
    for i, o in enumerate(d):
        if o.get('__type__') == 'cc.Prefab': rootIdx = o['data']['__id__'] if 'data' in o else o['root']['__id__']
        if o.get('__type__') == 'cc.SceneAsset': rootIdx = o['scene']['__id__']
    ids = {}
    inline = [0]
    def node(i):
        if isinstance(i, dict):
            o = i; inline[0] += 1; i = 'i%d' % inline[0]
        else: o = d[i]
        trs = (o.get('_trs') or {}).get('array') or [0, 0, 0, 0, 0, 0, 1, 1, 1, 1]
        cs = o.get('_contentSize') or {}
        ap = o.get('_anchorPoint') or {'x': .5, 'y': .5}
        n = dict(n=o.get('_name', ''), x=trs[0], y=trs[1], w=cs.get('width', 0), h=cs.get('height', 0), ax=ap.get('x', .5), ay=ap.get('y', .5))
        if trs[7] != 1 or trs[8] != 1: n['sx'], n['sy'] = trs[7], trs[8]
        ea = o.get('_eulerAngles')
        if ea and ea.get('z'): n['rot'] = ea['z']
        if o.get('_active') is False: n['hide'] = 1
        if '_opacity' in o and o['_opacity'] != 255: n['op'] = o['_opacity'] / 255
        if o.get('_color'): n['c'] = col(o['_color'])
        ids[i] = n
        for cr in o.get('_components') or []:
            c = get(cr); t = c.get('__type__')
            if c.get('_enabled') is False: continue
            if t == 'cc.Sprite':
                f = frame(c.get('_spriteFrame'))
                if f: n['sp'] = dict(f=f, t=c.get('_type', 0), sm=c.get('_sizeMode', 1), fr=c.get('_fillRange', 0), ft=c.get('_fillType', 0), fs=c.get('_fillStart', 0), trim=c.get('_isTrimmedMode', True))
            elif t == 'cc.Label':
                n['lb'] = dict(s=c.get('_N$string', c.get('_string', 'label')), fs=c.get('_fontSize', 40), lh=c.get('_lineHeight', 40),
                    ha=c.get('_N$horizontalAlign', 0), va=c.get('_N$verticalAlign', 0), ov=c.get('_N$overflow', 0),
                    wrap=c.get('_enableWrapText', True), bold=bool((c.get('_styleFlags') or 0) & 1))
                fu = (c.get('_N$file') or {}).get('__uuid__')
                if fu: n['lb']['font'] = fonts.get(fu, '')
            elif t == 'cc.RichText':
                n['rt'] = dict(s=c.get('_N$string', ''), fs=c.get('_N$fontSize', 40), lh=c.get('_N$lineHeight', 40), mw=c.get('_N$maxWidth', 0), ha=c.get('_N$horizontalAlign', 0))
            elif t == 'cc.LabelOutline':
                n['ol'] = dict(c=col(c.get('_color'), '#000000'), w=c.get('_width', 1))
            elif t == 'cc.Widget':
                n['wg'] = dict(f=c.get('_alignFlags', 0), t=c.get('_top', 0), b=c.get('_bottom', 0), l=c.get('_left', 0), r=c.get('_right', 0))
            elif t == 'cc.Layout':
                n['ly'] = dict(t=c.get('_N$layoutType', 0), rs=c.get('_resize', 0), sx=c.get('_N$spacingX', 0), sy=c.get('_N$spacingY', 0),
                    pl=c.get('_N$paddingLeft', 0), pr=c.get('_N$paddingRight', 0), pt=c.get('_N$paddingTop', 0), pb=c.get('_N$paddingBottom', 0),
                    hd=c.get('_N$horizontalDirection', 0), vd=c.get('_N$verticalDirection', 1), cell=c.get('_N$cellSize'))
            elif t == 'cc.Button':
                n['bt'] = dict(tr=c.get('_N$transition', 0))
                for k in ('normal', 'pressed', 'disabled'):
                    f = frame(c.get('_N$%sSprite' % k))
                    if f: n['bt'][k] = f
            elif t == 'cc.Mask': n['mask'] = 1
            elif t == 'cc.ScrollView':
                n['sv'] = dict(h=c.get('horizontal', False), v=c.get('vertical', True), content=c.get('content') or c.get('_N$content'))
            elif t == 'cc.ProgressBar':
                n['pb'] = dict(m=c.get('_N$mode', 0), p=c.get('_N$progress', 1), bar=c.get('_N$barSprite'), tl=c.get('_N$totalLength'))
            elif t == 'cc.Toggle':
                n['tg'] = dict(on=c.get('_N$isChecked', True), cm=c.get('checkMark'))
            elif t == 'cc.EditBox':
                n['eb'] = dict(ml=c.get('maxLength', 20))
            elif t == 'cc.BlockInputEvents': n['block'] = 1
            elif t and not t.startswith('cc.'):
                # custom script: record property -> node references (used to hook game logic by name)
                refs = {}
                for k, v in c.items():
                    if isinstance(v, dict) and '__id__' in v: refs[k] = v['__id__']
                    elif isinstance(v, list) and v and all(isinstance(x, dict) and '__id__' in x for x in v): refs[k] = [x['__id__'] for x in v]
                if refs: n.setdefault('_refs', {}).update(refs)
                if 'mapVec' in c: n['mapVec'] = [[v.get('x', 0), v.get('y', 0)] for v in c['mapVec']]
        ch = [node(c['__id__'] if '__id__' in c else c) for c in (o.get('_children') or [])]
        if ch: n['ch'] = ch
        return n
    root = node(rootIdx)
    # resolve component refs (__id__ of components -> node index); give every node an id
    comp_owner = {}
    for i, o in enumerate(d):
        if o.get('__type__') not in ('cc.Node', 'cc.Prefab', 'cc.PrefabInfo') and isinstance(o.get('node'), dict) and '__id__' in o['node']: comp_owner[i] = o['node']['__id__']
    def rid(i): return 'n%d' % comp_owner.get(i, i)
    for i, n in ids.items(): n['id'] = 'n%s' % i
    for n in ids.values():
        if '_refs' in n:
            n['refs'] = {k: ([rid(x) for x in v] if isinstance(v, list) else rid(v)) for k, v in n.pop('_refs').items()}
        for k in ('sv', 'pb', 'tg'):
            if k in n:
                for kk in ('content', 'bar', 'cm'):
                    if isinstance(n[k].get(kk), dict): n[k][kk] = rid(n[k][kk]['__id__'])
    return root

out = {}
files = glob.glob(SRC + '/assets/**/*.prefab', recursive=True) + [SRC + '/assets/Scene/Start.fire']
for f in files:
    name = os.path.splitext(os.path.basename(f))[0]
    out[name] = convert(f)
json.dump(out, open(OUT + '/prefabs.json', 'w'), ensure_ascii=False, separators=(',', ':'))
open(OUT + '/prefabs.js', 'w').write('var PREFABS=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(out), 'prefabs,', len(used), 'textures,', len(frames), 'frames known')
