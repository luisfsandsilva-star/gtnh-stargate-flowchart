"""Build the offline, focused recipe explorer; no full-graph DOM is created."""
import base64
import collections
import gzip
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def layout(data):
    resources, recipes = data['resources'], data['recipes']
    keys = ['i' + key for key in resources] + ['r' + key for key in recipes]
    upstream = collections.defaultdict(list)
    neighbors = collections.defaultdict(set)
    for key, recipe in recipes.items():
        process = 'r' + key
        for slot in recipe['inputs']:
            item = 'i' + slot['id']
            upstream[process].append(item)
            neighbors[process].add(item)
            neighbors[item].add(process)
        for slot in recipe['outputs']:
            item = 'i' + slot['id']
            upstream[item].append(process)
            neighbors[item].add(process)
            neighbors[process].add(item)
    depth = {}
    queue = collections.deque([('i' + data['root'], 0)])
    while queue:
        key, level = queue.popleft()
        if key in depth:
            continue
        depth[key] = level
        queue.extend((parent, level + 1) for parent in upstream[key])
    last = max(depth.values()) + 1
    layers = collections.defaultdict(list)
    for key in keys:
        layers[depth.get(key, last)].append(key)
    rank = {key: i for layer in layers.values() for i, key in enumerate(layer)}
    for iteration in range(4):
        for level in sorted(layers, reverse=bool(iteration % 2)):
            layers[level].sort(key=lambda key: sum(rank[n] for n in neighbors[key]) / max(1, len(neighbors[key])))
            rank.update({key: i for i, key in enumerate(layers[level])})
    # Pack each depth into a short grid instead of a 238,660-pixel-tall column.
    rows = 70
    band_x = {}
    x = 60
    for level in sorted(layers, reverse=True):
        band_x[level] = x
        x += max(1, (len(layers[level]) + rows - 1) // rows) * 290 + 100
    positions = {}
    for level, layer in layers.items():
        for index, key in enumerate(layer):
            positions[key] = [band_x[level] + (index // rows) * 290, 80 + (index % rows) * 115]
    return {'positions': positions, 'width': x + 60, 'height': min(rows, max(map(len, layers.values()))) * 115 + 160}


def build():
    source = ROOT / 'entrega' / 'stargate-rc2-recorrido.json'
    if not source.exists():
        source = ROOT / 'graph-data.json'
    data = json.loads(source.read_text())
    data['mapLayout'] = layout(data)
    payload = base64.b64encode(gzip.compress(json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode(), compresslevel=9, mtime=0)).decode()
    page = (ROOT / 'map-template.html').read_text().replace('__PAYLOAD__', payload)
    output = ROOT / 'entrega' / 'stargate-rc2-mapa.html'
    output.write_text(page)
    print(json.dumps({'bytes': output.stat().st_size, 'resources': len(data['resources']), 'recipes': len(data['recipes']), 'slots': sum(len(r['inputs']) + len(r['outputs']) for r in data['recipes'].values()), 'layout': {k: v for k, v in data['mapLayout'].items() if k != 'positions'}}))


if __name__ == '__main__':
    build()
