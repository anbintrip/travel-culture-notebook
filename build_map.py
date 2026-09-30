from pathlib import Path
import json
import geopandas as gpd
import pycountry
from pyproj import CRS, Transformer
from shapely.geometry import Polygon, MultiPolygon

SRC = Path('/opt/pyvenv/lib/python3.13/site-packages/pyogrio/tests/fixtures/naturalearth_lowres/naturalearth_lowres.shp')
OUT = Path(__file__).resolve().parent / 'map-data.js'
W, H, PAD = 1200, 610, 24

gdf = gpd.read_file(SRC)
gdf = gdf[gdf['name'] != 'Antarctica'].copy()
robin = CRS.from_proj4('+proj=robin +datum=WGS84 +units=m +no_defs')
gdf = gdf.to_crs(robin)
minx, miny, maxx, maxy = gdf.total_bounds
scale = min((W - PAD*2)/(maxx-minx), (H-PAD*2)/(maxy-miny))
offx = (W - (maxx-minx)*scale)/2
offy = (H - (maxy-miny)*scale)/2

def xy(x,y):
    return round(offx + (x-minx)*scale,1), round(H - (offy + (y-miny)*scale),1)

def ring_path(coords):
    pts=[xy(x,y) for x,y in coords]
    if not pts: return ''
    return 'M' + ' L'.join(f'{x},{y}' for x,y in pts) + ' Z'

def geom_path(geom):
    if geom is None or geom.is_empty: return ''
    polys = [geom] if isinstance(geom, Polygon) else list(geom.geoms) if isinstance(geom, MultiPolygon) else []
    parts=[]
    for p in polys:
        parts.append(ring_path(p.exterior.coords))
        for hole in p.interiors:
            parts.append(ring_path(hole.coords))
    return ' '.join(parts)

features=[]
for _, r in gdf.iterrows():
    d=geom_path(r.geometry)
    if not d: continue
    iso3 = r['iso_a3']
    iso2 = ''
    if iso3 and iso3 != '-99':
        c = pycountry.countries.get(alpha_3=iso3)
        iso2 = c.alpha_2 if c else ''
    if r['name'] == 'France': iso2 = 'FR'
    if r['name'] == 'Norway': iso2 = 'NO'
    if r['name'] == 'Kosovo': iso2 = 'XK'
    features.append({'name':r['name'],'iso2':iso2,'iso3':iso3,'d':d})

# project hand-picked tiny-country hit targets using the exact same transform
geo_to_robin = Transformer.from_crs('EPSG:4326', robin, always_xy=True)
coords = {
    '新加坡': (103.82,1.35),
    '香港': (114.17,22.32),
    '澳門': (113.54,22.20),
    '瑞士': (8.23,46.82),
    '荷蘭': (5.29,52.13),
    '丹麥': (9.50,56.26),
    '約旦': (36.24,30.59),
    '以色列': (34.85,31.05),
    '卡達': (51.18,25.35),
}
points={}
for zh,(lon,lat) in coords.items():
    x,y=geo_to_robin.transform(lon,lat)
    points[zh]=xy(x,y)

content = 'window.WORLD_MAP_FEATURES=' + json.dumps(features, ensure_ascii=False, separators=(',',':')) + ';\n'
content += 'window.WORLD_MAP_POINTS=' + json.dumps(points, ensure_ascii=False, separators=(',',':')) + ';\n'
OUT.write_text(content, encoding='utf-8')
print('features',len(features),'bytes',OUT.stat().st_size)
print(points)
