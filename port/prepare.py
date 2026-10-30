"""Prepare indexed, bounded-size release assets without changing the original game."""
from pathlib import Path
import hashlib, json, struct, zipfile

BASE = Path(__file__).resolve().parent
GAME = BASE.parent
PROJECT = BASE / 'project'
CHUNK = 8 * 1024 * 1024

def main():
    out = BASE / 'release-assets'
    out.mkdir(exist_ok=True)
    index_dir = PROJECT / 'web-index'
    index_dir.mkdir(exist_ok=True)
    manifest = {'chunkSize': CHUNK, 'files': {}}
    archives = ['data1.zip', 'data2.zip', 'voice.zip', 'sound.zip', 'patch.zip',
                'decensor.zip', 'hires.zip', 'system/frame.zip', 'system/option.zip',
                'system/title.zip', 'system/scenario.zip']
    for archive in archives:
        source = GAME / archive
        prefix = archive.replace('/', '_').removesuffix('.zip')
        entries = {}
        with zipfile.ZipFile(source) as z, source.open('rb') as raw:
            for item in z.infolist():
                if item.is_dir():
                    continue
                if item.compress_type not in (0, 8) or item.flag_bits & 1:
                    raise ValueError(f'Unsupported ZIP entry: {archive}/{item.filename}')
                raw.seek(item.header_offset)
                header = raw.read(30)
                name_len, extra_len = struct.unpack_from('<HH', header, 26)
                offset = item.header_offset + 30 + name_len + extra_len
                entries[item.filename.upper()] = [item.filename, offset, item.compress_size,
                    item.file_size, item.compress_type, item.CRC]
        (index_dir / f'{prefix}.json').write_text(json.dumps(
            {'prefix': prefix, 'chunk_size': CHUNK, 'entries': entries}, ensure_ascii=False), encoding='utf-8')
        with source.open('rb') as raw:
            part = 0
            while data := raw.read(CHUNK):
                name = f'{prefix}-{part:04d}.bin'
                target = out / name
                digest = hashlib.sha256(data).hexdigest()
                if not target.exists() or target.stat().st_size != len(data) or hashlib.sha256(target.read_bytes()).hexdigest() != digest:
                    target.write_bytes(data)
                manifest['files'][name] = {'size': len(data), 'sha256': digest}
                part += 1
        print(f'{archive}: {len(entries)} entries, {part} parts', flush=True)
    movie = out / 'opening.mp4'
    if not movie.exists():
        import subprocess
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(GAME / 'opening.ogv'),
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', str(movie)], check=True)
    manifest['files'][movie.name] = {'size': movie.stat().st_size, 'sha256': hashlib.sha256(movie.read_bytes()).hexdigest()}
    (out / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(f'Ready: {len(manifest["files"])} release assets')

if __name__ == '__main__':
    main()
