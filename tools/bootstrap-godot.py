"""Install the pinned, verified web export templates inside the workspace.

The managed cloud image already supplies Godot 4.6.3. No system-wide writes,
credentials, disabled TLS checks or changes to the network proxy are needed.
"""
import hashlib, os, pathlib, subprocess, urllib.request, zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
VERSION = '4.6.3'
SHA512 = 'da606b61c10157844f8300172df374472665f95015495cb1a7cd132c40ede404faa96cc1016a4b9662db9909ddea69632c4948b2cd11163438dad4808881fb68'
DATA = ROOT.parent / '.godot-data'
DEST = DATA / 'godot/export_templates/4.6.3.stable'
if not subprocess.check_output(['godot','--version'],text=True).strip().startswith(VERSION+'.stable'):
    raise SystemExit('Install the official Godot 4.6.3 editor before running this helper.')
if not (DEST/'web_nothreads_release.zip').exists():
    archive = pathlib.Path('/tmp/godot-templates.tpz')
    if not archive.exists():
        url = f'https://github.com/godotengine/godot/releases/download/{VERSION}-stable/Godot_v{VERSION}-stable_export_templates.tpz'
        print('Downloading the official Godot export templates (1.2 GB).',flush=True)
        with urllib.request.urlopen(url) as response, archive.open('wb') as output:
            while chunk:=response.read(1024*1024): output.write(chunk)
    if hashlib.file_digest(archive.open('rb'),'sha512').hexdigest()!=SHA512:
        raise SystemExit('The export-template SHA-512 does not match the official release.')
    DEST.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(archive) as z:
        for name in z.namelist():
            if '/web_' in name or name.endswith('/version.txt'):
                (DEST/pathlib.Path(name).name).write_bytes(z.read(name))
print('Godot 4.6.3 web export templates ready:',DEST)
