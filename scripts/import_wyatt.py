"""Load a few Wyatt Injury Law pages into the trial Studio, word for word from the live site.

Usage: SANITY_TOKEN=... python3 scripts/import_wyatt.py <folder of saved page HTML>
Each page is saved as <slug>.html from https://wyatt-netlify.netlify.app/<slug>/.
Documents get fixed IDs (wyatt-trial-*), so running it again replaces them and touches nothing else.
"""
import json, os, re, sys, urllib.request, uuid
from bs4 import BeautifulSoup

PROJECT, DATASET = 'i2tdfchw', 'production'
PAGES = {
    'about-us': 'page',
    'phoenix-car-accident-lawyer': 'practiceArea',
    'justin-l-wyatt-esq': 'attorney',
}
# Site-wide widgets and sidebars, not page copy
STOP_AT = {'Client reviews', 'Why trust us?'}


def key():
    return uuid.uuid4().hex[:12]


def clean(el):
    t = re.sub(r'\s+', ' ', el.get_text(' ', strip=True))
    return re.sub(r' ([,.;:!?’])', r'\1', t)


def read(path):
    s = BeautifulSoup(open(path, encoding='utf-8').read(), 'lxml')
    title = s.title.get_text(strip=True)
    d = s.find('meta', attrs={'name': 'description'})
    main = s.find('main')
    for t in main.find_all(['form', 'script', 'style', 'noscript', 'svg', 'button', 'nav']):
        t.decompose()
    h1, items, started = '', [], False
    for el in main.find_all(['h1', 'h2', 'h3', 'p', 'li']):
        if el.name == 'p' and el.find_parent('li'):
            continue
        txt = clean(el)
        if not txt:
            continue
        if el.name == 'h1':
            h1, started = txt, True
            continue
        if not started:
            continue
        if txt in STOP_AT:
            break
        items.append((el.name, txt))
    # Drop an on-page table of contents: list items that repeat a later heading
    heads = {t for n, t in items if n in ('h2', 'h3')}
    items = [(n, t) for n, t in items if not (n == 'li' and t in heads)]
    # A heading left with nothing under it belonged to a widget
    while items and items[-1][0] in ('h2', 'h3'):
        items.pop()
    return title, d['content'] if d else '', h1, items


def blocks(items):
    out = []
    for n, t in items:
        b = {'_type': 'block', '_key': key(), 'style': n if n in ('h2', 'h3') else 'normal',
             'markDefs': [], 'children': [{'_type': 'span', '_key': key(), 'text': t, 'marks': []}]}
        if n == 'li':
            b['listItem'], b['level'] = 'bullet', 1
        out.append(b)
    return out


def doc(slug, kind, folder):
    title, desc, h1, items = read(os.path.join(folder, slug + '.html'))
    d = {'_id': 'wyatt-trial-' + slug, '_type': kind, 'slug': {'_type': 'slug', 'current': slug},
         'seo': {'_type': 'seo', 'title': title, 'description': desc}}
    if kind == 'attorney':
        d['name'] = h1
        d['role'], items = items[0][1], items[1:]
        d['bio'] = blocks(items)
    else:
        d['title'] = h1
        d['headline'] = h1
        if kind == 'practiceArea' and items and items[0][0] == 'p':
            d['intro'], items = items[0][1], items[1:]
        d['body'] = blocks(items)
    return d


def main():
    folder, token = sys.argv[1], os.environ['SANITY_TOKEN']
    docs = [doc(s, k, folder) for s, k in PAGES.items()]
    body = json.dumps({'mutations': [{'createOrReplace': d} for d in docs]}).encode()
    req = urllib.request.Request(
        f'https://{PROJECT}.api.sanity.io/v2024-01-01/data/mutate/{DATASET}',
        data=body, method='POST',
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r:
        print(r.status, 'saved', [d['_id'] for d in docs])


if __name__ == '__main__':
    main()
