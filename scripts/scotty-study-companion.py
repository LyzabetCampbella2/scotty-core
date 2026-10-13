"""Scotty companion for selected Obsidian folders OR AnkiConnect.
Use --help for setup. Pair this companion in Scotty; no server admin token is used.
"""
import argparse, hashlib, html, json, os, re, time, urllib.request, urllib.error
from pathlib import Path
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(req.full_url, code, 'Redirect refused', headers, fp)
OPENER = urllib.request.build_opener(NoRedirect)
def request_json(url, body, token=None):
    data=json.dumps(body).encode(); headers={'Content-Type':'application/json'}
    if token: headers['Authorization']='Bearer '+token
    req=urllib.request.Request(url,data=data,headers=headers,method='POST')
    with OPENER.open(req,timeout=20) as response:
        raw=response.read(3*1024*1024+1)
    if len(raw)>3*1024*1024: raise ValueError('Response too large')
    return json.loads(raw)
def note_path(root, name, folders):
    if not isinstance(name,str) or '\\' in name or not name.endswith('.md'): raise ValueError('Invalid path')
    parts=name.split('/')
    if any(not p or p.startswith('.') or re.search(r'[\x00-\x1f:*?"<>|]',p) for p in parts): raise ValueError('Invalid path')
    if not any(name.startswith(f.rstrip('/')+'/') for f in folders): raise ValueError('Outside allowed folders')
    target=root.joinpath(*parts)
    for part in [target,*target.parents]:
        if part == root: break
        if part.is_symlink(): raise ValueError('Symlinks are not allowed')
    target.resolve().relative_to(root.resolve())
    return target
class Obsidian:
    def __init__(self, root, folders): self.root=Path(root).resolve(); self.folders=folders
    def snapshot(self):
        notes=[]
        for folder in self.folders:
            base=self.root/folder
            if not base.is_dir() or base.is_symlink(): continue
            for f in base.rglob('*.md'):
                if len(notes)>=30: break
                try:
                    safe=note_path(self.root,f.relative_to(self.root).as_posix(),self.folders)
                    if safe.stat().st_size>60000: continue
                    data=safe.read_bytes()
                    notes.append({'path':safe.relative_to(self.root).as_posix(),'text':data.decode('utf8')[:12000],'sha256':hashlib.sha256(data).hexdigest()})
                except (OSError,ValueError,UnicodeError): continue
        return {'notes':notes}
    def execute(self, job, response):
        p=job['payload']; approved=response.get('allowedFolders',[])
        source=note_path(self.root,p['path'],self.folders); note_path(self.root,p['path'],approved)
        if job['operation']=='obsidian_create_note':
            data=p['text'].encode('utf8')
            if len(data)>60000: raise ValueError('Note too large')
            source.parent.mkdir(parents=True,exist_ok=True)
            source=note_path(self.root,p['path'],self.folders)
            with source.open('xb') as out: out.write(data)
            return 'Created note '+p['path']+'.'
        if job['operation']=='obsidian_move_note':
            if source.stat().st_size>60000: raise ValueError('Note too large')
            data=source.read_bytes()
            if hashlib.sha256(data).hexdigest()!=p['expectedSha256']: raise ValueError('Note changed')
            target=note_path(self.root,p['destination'],self.folders); note_path(self.root,p['destination'],approved)
            target.parent.mkdir(parents=True,exist_ok=True); target=note_path(self.root,p['destination'],self.folders)
            # A hard link gives atomic no-overwrite destination creation. Never replace an existing note.
            os.link(source,target,follow_symlinks=False)
            # Preserve the source if its bytes changed during the move.
            if hashlib.sha256(source.read_bytes()).hexdigest()!=p['expectedSha256']:
                raise ValueError('Source changed; both paths retained for review')
            source.unlink()
            return 'Moved note to '+p['destination']+'.'
        raise ValueError('Unsupported operation')
class Anki:
    def __init__(self,decks): self.decks=decks
    def api(self,action,params=None):
        body={'action':action,'version':6,'params':params or {}}
        if os.environ.get('SCOTTY_ANKI_KEY'): body['key']=os.environ['SCOTTY_ANKI_KEY']
        result=request_json('http://127.0.0.1:8765',body)
        if result.get('error'): raise ValueError('AnkiConnect rejected the request')
        return result['result']
    def snapshot(self):
        decks=[d for d in self.api('deckNames') if d in self.decks]
        return {'decks':decks,'notes':[]}
    def execute(self,job,response):
        p=job['payload']; deck=p['deck']
        if job['operation']!='anki_add_note' or deck not in self.decks or deck not in response.get('allowedDecks',[]): raise ValueError('Unallowed operation/deck')
        if deck not in self.api('deckNames'): raise ValueError('Deck not found')
        if self.api('modelFieldNames',{'modelName':'Basic'})!=['Front','Back']: raise ValueError('Use the standard Basic note type with Front and Back fields')
        fields={k:html.escape(p[k.lower()]).replace('\n','<br>') for k in ['Front','Back']}
        note_id=self.api('addNote',{'note':{'deckName':deck,'modelName':'Basic','fields':fields,'options':{'allowDuplicate':False},'tags':['scotty']}})
        if not isinstance(note_id,int): raise ValueError('No note ID returned')
        return 'AnkiConnect created note '+str(note_id)+' in '+deck+'.'
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--provider',choices=['obsidian','anki'],required=True)
    parser.add_argument('--vault',help='Obsidian vault path, used only locally')
    parser.add_argument('--allow',required=True,help='Comma-separated exact folders or deck names matching Scotty setup')
    args=parser.parse_args(); token=os.environ.get('SCOTTY_DEVICE_TOKEN','')
    url=os.environ.get('SCOTTY_ADDON_URL','https://scotty-core.onrender.com').rstrip('/')
    if not token or not url.startswith('https://'): raise SystemExit('Set SCOTTY_DEVICE_TOKEN and use an HTTPS Scotty origin. No credential was printed.')
    allowed=[v.strip() for v in args.allow.split(',') if v.strip()]
    if args.provider=='obsidian':
        if not args.vault: raise SystemExit('--vault is required for Obsidian.')
        worker=Obsidian(args.vault,allowed)
        for folder in allowed: note_path(worker.root,folder+'/check.md',allowed)
    else:
        if any('"' in d or '\n' in d for d in allowed): raise SystemExit('Use exact deck names.')
        worker=Anki(allowed)
    print('Scotty '+args.provider+' companion started. Only explicitly allowed folders/decks are exposed.')
    while True:
        try:
            response=request_json(url+'/api/connectors/device/poll',worker.snapshot(),token); job=response.get('job')
            if job:
                ok=False; message='Companion refused an unsupported command.'
                try:
                    if job['provider']!=args.provider: raise ValueError('Wrong provider')
                    message=worker.execute(job,response); ok=True
                except Exception:
                    message='Companion could not confirm this command. Check the local application before preparing another action. This job will not be replayed.'
                try: request_json(url+'/api/connectors/device/report',{'id':job['id'],'lease':job['lease'],'ok':ok,'message':message},token)
                except Exception: print('Could not save the device report. Verify locally before approving another command.')
            time.sleep(5)
        except KeyboardInterrupt: break
        except Exception:
            print('Companion check-in unavailable. No command was retried and no credentials were printed.');time.sleep(10)
if __name__=='__main__': main()
