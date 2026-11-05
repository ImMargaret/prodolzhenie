"""Embed JPEG assets into the native Figma Plugin API script."""
import base64,json,io
from pathlib import Path
from PIL import Image
from build import CAST
ROOT=Path(__file__).resolve().parent
def run():
    images={}
    for name,filename in [('hero','reliquary'),('woland','woland'),('margarita','margarita'),('behemoth','behemoth'),('memory','margarita-memory')]:
        im=Image.open(ROOT/f'assets/images/{filename}.webp').convert('RGB');f=io.BytesIO();im.save(f,'JPEG',quality=86,optimize=True);images[name]=base64.b64encode(f.getvalue()).decode()
    engine=(ROOT/'figma/layout-engine.js').read_text()
    code=engine.replace('__EMBEDDED_IMAGES__',json.dumps(images,separators=(',',':'))).replace('__CAST_DATA__',json.dumps(CAST,ensure_ascii=False))
    (ROOT/'figma/PRODOLZHENIE-FIGMA.js').write_text(code)
    (ROOT/'figma/PRODOLZHENIE-FIGMA.txt').write_text(code)
    (ROOT.parent/'PRODOLZHENIE-FIGMA.txt').write_text(code)
    plugin=ROOT/'figma/local-plugin';plugin.mkdir(exist_ok=True)
    (plugin/'code.js').write_text(code)
    (plugin/'manifest.json').write_text(json.dumps({'name':'Продолжение — макеты сайта','api':'1.0.0','main':'code.js','editorType':['figma']},ensure_ascii=False,indent=2))
    print('Figma script:',len(code),'bytes; 20 primary layouts + 10 state layouts.')
if __name__=='__main__':run()
