"""Bundle the complete experience into one offline HTML document."""
from pathlib import Path
import re, json, base64, mimetypes
from build import PAGES, build

ROOT=Path(__file__).resolve().parent
def uri(p):
    p=Path(p);typ=mimetypes.guess_type(str(p))[0] or 'application/octet-stream'
    return 'data:'+typ+';base64,'+base64.b64encode(p.read_bytes()).decode()

def make():
    css=(ROOT/'assets/site.css').read_text()
    fonts=(ROOT/'assets/fonts/fonts.css').read_text()
    fonts=re.sub(r'url\(([^)]+)\)',lambda m:'url('+uri(ROOT/'assets/fonts'/m.group(1).strip('"\''))+')',fonts)
    css=css.replace("@import url('./fonts/fonts.css');",fonts)
    def convert(s):
        s=re.sub(r'href="([a-z]+)\.html([^\"]*)"',lambda m:'href="#'+m.group(1)+m.group(2)+'"',s)
        s=re.sub(r'(?:assets/images/[a-z-]+\.webp|assets/favicon\.svg)',lambda m:uri(ROOT/m.group()),s)
        return s
    pages={slug:convert((ROOT/(slug+'.html')).read_text()) for slug,*_ in PAGES}
    js='\n'.join((ROOT/f).read_text() for f in ['assets/vendor/three.min.js','assets/scene.js','assets/app.js'])
    js=re.sub(r'</script',r'<\\/script',js,flags=re.I)
    data=json.dumps(pages,ensure_ascii=False).replace('<','\\u003c')
    images={c:uri(ROOT/f'assets/images/{c}-memory.webp') for c in ['woland','margarita','behemoth']}
    config='<script id="inline-pages" type="application/json">'+data+'</script><script>window.CONTINUANCE_INLINE=true;window.CONTINUANCE_PAGES=JSON.parse(document.getElementById("inline-pages").textContent);window.CONTINUANCE_IMAGE_DATA='+json.dumps(images)+';</script>'
    html=pages['index']
    html=re.sub(r'<link rel="stylesheet"[^>]+>',lambda m:'<style>'+css+'</style>',html)
    html=re.sub(r'<link rel="preload"[^>]+>','',html)
    html=re.sub(r'<script src="[^\"]+" defer></script>','',html)
    html=html.replace('</body>',config+'<script>'+js+'</script></body>')
    dest=ROOT/'PRODOLZHENIE.html';dest.write_text(html,encoding='utf-8')
    print(dest.name,round(dest.stat().st_size/1024),'KiB')
    return dest
if __name__=='__main__':build();make()
