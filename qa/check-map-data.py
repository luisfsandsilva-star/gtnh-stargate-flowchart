"""Check that the optimized HTML retains every authoritative recipe field."""
import base64
import gzip
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
source = root / 'graph-data.json'
if not source.exists():
    source = root / 'entrega' / 'stargate-rc2-recorrido.json'
expected = json.loads(source.read_text())
page = (root / 'entrega' / 'stargate-rc2-mapa.html').read_text()
payload = re.search(r'<script type="application/octet-stream" id="payload">(.*?)</script>', page, re.S).group(1)
actual = json.loads(gzip.decompress(base64.b64decode(payload)))
for field in ['version', 'root', 'resources', 'recipes']:
    assert actual[field] == expected[field], field
assert len(actual['mapLayout']['positions']) == len(expected['resources']) + len(expected['recipes'])
assert len(page.encode()) < 1_000_000
assert len(re.findall(r'<canvas\b', page)) == 1
assert 'data-from=' not in page
print('All resources, recipes, slots, conditions and metadata preserved; HTML under 1 MB.')
