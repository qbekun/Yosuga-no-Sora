"""Verify archive offsets, chunk boundaries, decompression and source bytes."""
from pathlib import Path
import json, zipfile, zlib
BASE = Path(__file__).resolve().parent

def main():
    count = 0
    for index_file in (BASE / 'project/web-index').glob('*.json'):
        index = json.loads(index_file.read_text(encoding='utf-8'))
        prefix = index['prefix']
        source = prefix.replace('system_', 'system/') + '.zip'
        entries = list(index['entries'].values())
        samples = entries[:2] + entries[-2:]
        samples += [e for e in entries if e[1] // index['chunk_size'] != (e[1] + max(0,e[2]-1)) // index['chunk_size']][:2]
        with zipfile.ZipFile(BASE.parent / source) as archive:
            for name, offset, size, unpacked, compression, crc in samples:
                raw = bytearray()
                while len(raw) < size:
                    chunk_number, position = divmod(offset, index['chunk_size'])
                    chunk = (BASE / 'release-assets' / f'{prefix}-{chunk_number:04d}.bin').read_bytes()
                    part = chunk[position:position + size - len(raw)]
                    assert part
                    raw.extend(part)
                    offset += len(part)
                data = zlib.decompress(raw, -15) if compression == 8 else bytes(raw)
                assert len(data) == unpacked and zlib.crc32(data) == crc
                assert data == archive.read(name)
                count += 1
    print(f'Verified {count} entries from all archives, including chunk boundaries.')

if __name__ == '__main__':
    main()
