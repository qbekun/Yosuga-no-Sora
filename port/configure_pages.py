"""Enable GitHub Pages for the prepared main branch using existing Git login."""
import json, subprocess, urllib.request, urllib.error

def main():
    process = subprocess.run(['git','credential','fill'], input='protocol=https\nhost=github.com\n\n', text=True, capture_output=True, check=True)
    credential = dict(line.split('=',1) for line in process.stdout.splitlines() if '=' in line)
    headers = {'Authorization':'Bearer '+credential['password'], 'Accept':'application/vnd.github+json',
        'X-GitHub-Api-Version':'2022-11-28', 'User-Agent':'yosuga-web-port', 'Content-Type':'application/json'}
    url = 'https://api.github.com/repos/qbekun/Yosuga-no-Sora/pages'
    try:
        with urllib.request.urlopen(urllib.request.Request(url,headers=headers)) as response:
            json.load(response)
        method = 'PUT'
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise
        method = 'POST'
    data = json.dumps({'source':{'branch':'main','path':'/'},'build_type':'legacy'}).encode()
    with urllib.request.urlopen(urllib.request.Request(url,data=data,headers=headers,method=method)) as response:
        body = response.read()
        print(json.loads(body).get('html_url','Pages configured.') if body else 'Pages configured.')

if __name__ == '__main__':
    main()
