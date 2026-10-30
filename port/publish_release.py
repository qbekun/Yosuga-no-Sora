"""Upload prepared data to a draft release; credentials stay in process memory."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import json, subprocess, urllib.request, urllib.error, urllib.parse, time, argparse

BASE = Path(__file__).resolve().parent
REPO = 'qbekun/Yosuga-no-Sora'
API = 'https://api.github.com'

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--publish', action='store_true')
    parser.add_argument('--inspect', action='store_true')
    parser.add_argument('--only', help='Upload one named file from the prepared manifest')
    args = parser.parse_args()
    process = subprocess.run(['git', 'credential', 'fill'], input='protocol=https\nhost=github.com\n\n', text=True, capture_output=True, check=True)
    credential = dict(line.split('=', 1) for line in process.stdout.splitlines() if '=' in line)
    token = credential['password']

    def request(path, method='GET', data=None, binary=False):
        url = path if path.startswith('https://') else API + path
        payload = data if binary else (json.dumps(data).encode() if data is not None else None)
        headers = {'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'yosuga-web-port'}
        if payload is not None:
            headers['Content-Type'] = 'application/octet-stream' if binary else 'application/json'
        req = urllib.request.Request(url, data=payload, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=180) as response:
            body = response.read()
            return json.loads(body) if body else {}

    repo = request('/repos/' + REPO)
    print('Repository:', repo['full_name'], 'private:', repo['private'], flush=True)
    releases = request('/repos/' + REPO + '/releases?per_page=100')
    if args.inspect:
        for release in releases:
            print('Release:', release['tag_name'], 'draft:', release['draft'], 'uploaded:', len(release.get('assets', [])))
        return
    release = next((r for r in releases if r['tag_name'] == 'web-assets-v1'), None)
    if not release:
        release = request('/repos/' + REPO + '/releases', 'POST', {
            'tag_name': 'web-assets-v1', 'name': 'Web game assets v1', 'draft': True,
            'body': 'Indexed game data for the browser port. Files are split into 8 MiB chunks; manifest.json contains sizes and SHA-256 checksums.'})
    if args.publish:
        result = request('/repos/' + REPO + '/releases/' + str(release['id']), 'PATCH', {'draft': False})
        print('Published:', result['html_url'], flush=True)
        return
    existing = {}
    page = 1
    while True:
        assets = request('/repos/' + REPO + '/releases/' + str(release['id']) + f'/assets?per_page=100&page={page}')
        existing.update({a['name']: a for a in assets})
        if len(assets) < 100:
            break
        page += 1
    manifest = json.loads((BASE / 'release-assets/manifest.json').read_text())
    allowed = set(manifest['files']) | {'manifest.json'}
    files = sorted(p for p in (BASE / 'release-assets').iterdir() if p.name in allowed and (not args.only or p.name == args.only))
    missing = [p for p in files if p.name not in existing or existing[p.name]['size'] != p.stat().st_size]
    upload_url = release['upload_url'].split('{')[0]
    print('Release:', release['id'], 'to upload:', len(missing), flush=True)
    def upload(path):
        if path.name in existing:
            request('/repos/' + REPO + '/releases/assets/' + str(existing[path.name]['id']), 'DELETE')
        for attempt in range(4):
            try:
                request(upload_url + '?name=' + urllib.parse.quote(path.name), 'POST', path.read_bytes(), True)
                return path.name
            except urllib.error.HTTPError as error:
                if error.code not in (429, 500, 502, 503, 504) or attempt == 3:
                    raise RuntimeError(f'Upload {path.name}: HTTP {error.code}') from None
                time.sleep(2 ** attempt * 3)
            except Exception as error:
                print('Upload error:', path.name, type(error).__name__, flush=True)
                raise
    with ThreadPoolExecutor(max_workers=4) as pool:
        failures = []
        for count, future in enumerate(as_completed([pool.submit(upload, p) for p in missing]), 1):
            try:
                name = future.result()
            except Exception as error:
                failures.append(str(error))
                print('Upload failed:', type(error).__name__, str(error), flush=True)
                continue
            if count % 20 == 0 or count == len(missing):
                print(f'Uploaded {count}/{len(missing)}: {name}', flush=True)
        if failures:
            raise RuntimeError(f'{len(failures)} uploads failed; rerun to resume missing files.')
    print('All assets uploaded to draft release.', flush=True)

if __name__ == '__main__':
    main()
