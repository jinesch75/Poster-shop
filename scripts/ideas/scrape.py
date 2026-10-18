import json, re, html, urllib.request, os
BASE='https://www.gridlinecities.com'
def get(u): return urllib.request.urlopen(urllib.request.Request(BASE+u, headers={'User-Agent':'gc-mockups'}), timeout=60).read().decode()
posters={}
for page, gallery in (('/', 'MAIN'), ('/mondrian', 'MONDRIAN')):
    s = get(page); city = None
    # walk city headings and card links in document order
    for m in re.finditer(r'city-heading"><span class="name">([^<]+)<|href="/shop/([^"]+)"', s):
        if m.group(1): city = html.unescape(m.group(1)).strip()
        elif city and m.group(2) and m.group(2) not in posters:
            posters[m.group(2)] = {'slug': m.group(2), 'city': city, 'gallery': gallery}
for slug, p in posters.items():
    s = get('/shop/' + slug)
    t = re.search(r'<h2>([^<]+)</h2>', s)
    p['title'] = html.unescape(t.group(1)) if t else slug
    pv = re.search(r'/api/storage/previews/[^"&\\?]+', s)
    p['preview'] = pv.group(0)
    dst = f'previews/{slug}.jpg'
    if not os.path.exists(dst):
        urllib.request.urlretrieve(BASE + p['preview'], dst)
json.dump(list(posters.values()), open('posters.json', 'w'), indent=1, ensure_ascii=False)
print(len(posters))
from collections import Counter
print(Counter((p['gallery'], p['city']) for p in posters.values()))
