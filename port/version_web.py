"""Give the changed game pack and browser bridge fresh URLs after each export."""
from pathlib import Path
import hashlib

base = Path(__file__).resolve().parent
output = base / 'publish'
pack = output / 'game.pck'
version = hashlib.sha256(pack.read_bytes()).hexdigest()[:12]
name = f'game-{version}.pck'
target = output / name
target.write_bytes(pack.read_bytes())
html = output / 'game.html'
text = html.read_text(encoding='utf-8')
text = text.replace('"game.pck":', f'"{name}":')
text = text.replace('engine.startGame({', f'engine.startGame({{\n\t\t\tmainPack: "{name}",')
text = text.replace('src="asset-bridge.js"', f'src="asset-bridge.js?v={version}"')
html.write_text(text, encoding='utf-8')
print('Versioned web pack:', name)
