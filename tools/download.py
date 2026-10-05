"""Package the complete offline HTML for download without requiring HTML previews."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib

root = Path(__file__).resolve().parent.parent
html = root / 'Stillwater.html'
archive = root / 'Stillwater.zip'
instructions = '''STILLWATER — PLAY OFFLINE

1. Extract this ZIP into a folder on your computer.
2. Open Stillwater.html in Chrome, Edge, Firefox, or Safari.

The HTML includes the entire engine, models, textures, and lighting data.
No installation or Internet connection is required. Open the HTML in your
browser after extraction; the chat's file preview is not needed to play.

Drag to orbit. Scroll to zoom. Right-drag or Shift-drag to pan.
Choose Furnish, select a facility, and click an empty floor to place it.
R rotates furnishings. C changes roofs. P opens photo view.

Menu offers import/export, graphics quality, and lighting settings.
Import examples/island-retreat.json for a finished resort; export your
current spa first if you want to keep it.

Credits and asset attribution are included in the game's Credits menu and
the licenses folder. Saved spas are local to your browser; use Export spa
to make a portable backup.
'''
with ZipFile(archive, 'w', compression=ZIP_DEFLATED, compresslevel=9) as z:
    z.write(html, 'Stillwater.html')
    z.writestr('START-HERE.txt', instructions)
    z.write(root / 'examples/island-retreat.json', 'examples/island-retreat.json')
    for source, target in [
        ('assets/SOURCES.md', 'licenses/ASSET-CREDITS.md'),
        ('assets/CC-BY-4.0.txt', 'licenses/CC-BY-4.0.txt'),
        ('assets/CC0-1.0.txt', 'licenses/CC0-1.0.txt'),
        ('vendor/Apache-2.0.txt', 'licenses/Apache-2.0.txt'),
        ('vendor/THREE-LICENSE.txt', 'licenses/THREE-LICENSE.txt'),
    ]:
        z.write(root / source, target)
with ZipFile(archive) as z:
    assert z.testzip() is None, 'Archive integrity check failed'
    assert hashlib.sha256(z.read('Stillwater.html')).digest() == hashlib.sha256(html.read_bytes()).digest(), 'Archived game differs from the tested HTML'
print(f'Built and verified {archive.name}: {archive.stat().st_size / 1024 / 1024:.1f} MB')
