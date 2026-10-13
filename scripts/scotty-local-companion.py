"""Scotty local companion: selected files, printing, apps, Blender and manuscript exports.
Pair later in Connectors. Paths, executables and local device credentials stay here.
No arbitrary shell, job-provided arguments, automatic approval or claimed-job replay.
"""
import argparse, base64, hashlib, json, mimetypes, os, re, subprocess, tempfile, time, sys, urllib.request, urllib.error, uuid
from pathlib import Path
from urllib.parse import urlparse
MAX=8*1024*1024
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        raise urllib.error.HTTPError(req.full_url,code,'Redirect refused',headers,fp)
OPENER=urllib.request.build_opener(NoRedirect)
def post(url,body,token):
    req=urllib.request.Request(url,json.dumps(body).encode(),{'Content-Type':'application/json','Authorization':'Bearer '+token},method='POST')
    with OPENER.open(req,timeout=20) as r: raw=r.read(12*1024*1024+1)
    if len(raw)>12*1024*1024: raise ValueError('Response too large')
    return json.loads(raw)
def safe_path(root,name,folders):
    if not isinstance(name,str) or '\\' in name or name.startswith('/') or any(not p or p.startswith('.') or re.search(r'[\x00-\x1f:*?"<>|]',p) for p in name.split('/')): raise ValueError('Unsafe relative path')
    if not any(name.startswith(f.rstrip('/')+'/') for f in folders): raise ValueError('Outside selected folders')
    target=root.joinpath(*name.split('/'))
    for p in [target,*target.parents]:
        if p==root: break
        if p.is_symlink(): raise ValueError('Symlinks refused')
    target.resolve().relative_to(root.resolve())
    return target
class Worker:
    def __init__(self,provider,root,folders,mapping,export=None):
        self.provider=provider;self.root=Path(root).resolve();self.folders=folders;self.mapping=mapping;self.export=export;self.renders={}
        for f in folders: safe_path(self.root,f+'/check',folders)
    def files(self):
        rows=[];budget=MAX
        for folder in self.folders:
            base=self.root/folder
            if not base.is_dir() or base.is_symlink(): continue
            # Walk without following symlinks, bound both traversal and hashing work.
            count=0
            for directory,dirs,names in os.walk(base,followlinks=False):
                dirs[:]=[d for d in dirs if not d.startswith('.') and not (Path(directory)/d).is_symlink()]
                count+=1
                if count>200 or len(rows)>=30: break
                for name in sorted(names):
                    if len(rows)>=30: break
                    try:
                        p=safe_path(self.root,(Path(directory)/name).relative_to(self.root).as_posix(),self.folders)
                        size=p.stat().st_size
                        if size>64*1024*1024: continue
                        if self.provider=='blender' and p.suffix.lower()!='.blend': continue
                        if self.provider=='printscan' and p.suffix.lower() not in ['.pdf','.png','.jpg','.jpeg']: continue
                        data=p.read_bytes();mime=mimetypes.guess_type(name)[0] or 'application/octet-stream'
                        if p.suffix=='.md': mime='text/markdown'
                        row={'path':p.relative_to(self.root).as_posix(),'size':len(data),'mime':mime,'sha256':hashlib.sha256(data).hexdigest()}
                        if mime in ['application/pdf','image/png','image/jpeg','text/plain','text/markdown','application/json'] and len(data)<=budget:
                            row['base64']=base64.b64encode(data).decode();budget-=len(data)
                        rows.append(row)
                    except (OSError,ValueError): continue
        return rows
    def snapshot(self):
        if self.provider=='hardware':
            return {'sensors':[{'id':k,'value':Path(v).read_text()[:500]} for k,v in self.mapping.get('sensorFiles',{}).items() if Path(v).is_file()]}
        if self.provider=='manuscript':
            if not self.export or Path(self.export).stat().st_size>1024*1024: raise ValueError('Choose a selected JSON export up to 1 MB')
            data=json.loads(Path(self.export).read_text());projects=[]
            for p in data.get('projects',[])[:30]:
                if p.get('id') not in self.mapping.get('projects',[]): continue
                row={k:str(p.get(k,''))[:500] for k in ['id','title','chapterProgress','reportStatus']}
                row['sha256']=hashlib.sha256(json.dumps(row,ensure_ascii=False,separators=(',',':')).encode()).hexdigest();projects.append(row)
            return {'projects':projects}
        renders=[]
        for key,job in list(self.renders.items())[-20:]:
            status=job['process'].poll();renders.append({'id':key,'path':job['path'],'frame':job['frame'],'status':'running' if status is None else 'completed' if status==0 and any(job['output'].glob('*.png')) else 'error'})
        return {'files':self.files(),'apps':list(self.mapping.get('apps',{})),'printers':self.mapping.get('printers',[]),'renders':renders}
    def execute(self,job,response):
        p=job['payload'];op=job['operation']
        if job['provider']!=self.provider: raise ValueError('Wrong companion provider')
        if op=='desktop_launch_app' and self.provider=='desktop':
            alias=p['appId'];executable=self.mapping.get('apps',{}).get(alias)
            if alias not in response.get('allowedApps',[]) or not executable: raise ValueError('Unallowed app')
            path=Path(executable)
            if not path.is_absolute() or path.is_symlink(): raise ValueError('Configure an exact absolute executable or Mac app bundle')
            if sys.platform=='darwin' and path.suffix=='.app' and path.is_dir(): command=['/usr/bin/open','-a',str(path)]
            else:
                if not path.is_file() or sys.platform=='win32' and path.suffix.lower()!='.exe': raise ValueError('Use an executable file; Windows accepts .exe only')
                command=[str(path)]
            subprocess.Popen(command,stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,close_fds=True)
            return 'Application process started for '+alias+'. Application readiness is not independently verified.'
        if op=='hardware_signal' and self.provider=='hardware':
            name=p['outputId'];target=self.mapping.get('outputs',{}).get(name)
            if name not in response.get('allowedOutputs',[]) or not isinstance(target,dict): raise ValueError('Unallowed hardware output')
            value=p['value']
            if value not in target.get('values',[]): raise ValueError('Output value not locally allowed')
            url=target['url'];u=urlparse(url)
            if u.scheme not in ['http','https'] or u.username or u.password or u.query or u.fragment: raise ValueError('Use a fixed local hardware endpoint')
            token=os.environ.get(target.get('tokenEnv','SCOTTY_HARDWARE_TOKEN'),'')
            if not token: raise ValueError('Set the local hardware bearer token')
            result=post(url,{'outputId':name,'value':value},token)
            if result.get('ok') is not True: raise ValueError('Hardware did not accept output')
            return 'Hardware endpoint accepted '+name+' = '+value+'. Physical effects are unverified.'
        if op not in ['local_print','blender_render_frame']: raise ValueError('Unsupported operation')
        f=safe_path(self.root,p['path'],self.folders);safe_path(self.root,p['path'],response.get('allowedFolders',[]))
        if not f.is_file() or f.stat().st_size>64*1024*1024: raise ValueError('Selected file unavailable')
        data=f.read_bytes()
        if hashlib.sha256(data).hexdigest()!=p['expectedSha256']: raise ValueError('Selected file changed')
        if op=='local_print' and self.provider=='printscan':
            printer=p['printer'];copies=int(p['copies'])
            if printer not in self.mapping.get('printers',[]) or printer not in response.get('allowedPrinters',[]) or not re.fullmatch(r'[A-Za-z0-9_-]+',printer) or not 1<=copies<=5 or f.suffix.lower()!='.pdf' or not data.startswith(b'%PDF-'): raise ValueError('Unallowed PDF printer request')
            # CUPS on Mac/Linux copies bytes to the spool before this temporary file is deleted.
            lp=self.mapping.get('lp','/usr/bin/lp')
            if not Path(lp).is_absolute() or not Path(lp).is_file(): raise ValueError('CUPS lp is required; Windows printing is not enabled')
            with tempfile.TemporaryDirectory(prefix='scotty-print-') as tmp:
                saved=Path(tmp)/'reviewed.pdf';saved.write_bytes(data)
                r=subprocess.run([lp,'-d',printer,'-n',str(copies),'--',str(saved)],capture_output=True,text=True,timeout=30,check=True)
            return 'CUPS accepted print job: '+r.stdout.strip()[:250]+'. Physical printing is not verified.'
        if op=='blender_render_frame' and self.provider=='blender':
            frame=int(p['frame']);executable=Path(self.mapping.get('blender',''))
            if not executable.is_absolute() or not executable.is_file() or not 1<=frame<=100000 or f.suffix.lower()!='.blend': raise ValueError('Configure a Blender executable and selected .blend scene')
            render_root=self.root/'.scotty-renders'
            if render_root.is_symlink(): raise ValueError('Render output symlinks refused')
            render_root.mkdir(exist_ok=True);render_root.resolve().relative_to(self.root)
            output=render_root/str(uuid.uuid4());output.mkdir(exist_ok=False)
            # Render the checksum-matched copy, preventing later source-file edits from changing the job.
            saved=output/'reviewed.blend';saved.write_bytes(data)
            process=subprocess.Popen([str(executable),'--disable-autoexec','--background',str(saved),'--render-output',str(output/'frame_####'),'--render-format','PNG','--render-frame',str(frame)],stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,close_fds=True)
            self.renders[job['id']]={'process':process,'path':p['path'],'frame':frame,'output':output}
            return 'Blender render process started for frame '+str(frame)+'. Completion will appear in the companion snapshot; automatic scripts are disabled.'
        raise ValueError('Wrong operation for companion')
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--provider',choices=['desktop','printscan','blender','hardware','manuscript'],required=True);parser.add_argument('--root',default='.');parser.add_argument('--allow',default='',help='Selected relative folders, comma separated');parser.add_argument('--mapping',required=True,help='Local JSON aliases and executable paths');parser.add_argument('--export',help='Selected manuscript JSON export');args=parser.parse_args()
    token=os.environ.get('SCOTTY_DEVICE_TOKEN','');url=os.environ.get('SCOTTY_ADDON_URL','https://scotty-core.onrender.com').rstrip('/');u=urlparse(url)
    if not token or u.scheme!='https' or not u.hostname or u.username or u.password or u.path or u.query or u.fragment: raise SystemExit('Set SCOTTY_DEVICE_TOKEN and an HTTPS Scotty origin.')
    worker=Worker(args.provider,args.root,[v.strip() for v in args.allow.split(',') if v.strip()],json.loads(Path(args.mapping).read_text()),args.export)
    print('Scotty companion started for '+args.provider+'. Only configured resources are exposed.')
    while True:
        try:
            response=post(url+'/api/connectors/device/poll',worker.snapshot(),token);job=response.get('job')
            if job:
                try: message=worker.execute(job,response);ok=True
                except Exception: message='Local outcome not confirmed. Check the device before another approval. This job is not replayed.';ok=False
                try: post(url+'/api/connectors/device/report',{'id':job['id'],'lease':job['lease'],'ok':ok,'message':message},token)
                except Exception: print('Report unavailable. Verify locally before another approval.')
            time.sleep(5)
        except KeyboardInterrupt: break
        except Exception: print('Check-in unavailable. No action retried; no credentials printed.');time.sleep(10)
if __name__=='__main__':main()
