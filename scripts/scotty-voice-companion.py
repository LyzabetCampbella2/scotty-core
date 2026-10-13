"""Owner-paired Whisper/Kokoro speech worker. No computer microphone or network listener.
Only processes short audio/text jobs polled from the exact configured HTTPS Scotty origin.
"""
import argparse, base64, json, os, time, urllib.request, urllib.error
from urllib.parse import urlparse

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(req.full_url, code, 'Redirect refused', headers, fp)

def origin(value):
    u=urlparse(value)
    if u.scheme!='https' or not u.hostname or u.username or u.password or u.query or u.fragment or u.path not in ['', '/']:
        raise ValueError('Use the exact HTTPS Scotty origin without path, credentials or query.')
    return value.rstrip('/')

def request(base, path, body, token):
    req=urllib.request.Request(base+'/api/calls/device/'+path,json.dumps(body).encode(),{'Content-Type':'application/json','Authorization':'Bearer '+token},method='POST')
    with urllib.request.build_opener(NoRedirect).open(req,timeout=25) as response: raw=response.read(4200001)
    if len(raw)>4200000: raise ValueError('Voice response too large')
    result=json.loads(raw)
    if not result.get('ok'): raise ValueError(result.get('error','Voice bridge failed'))
    return result

class Engines:
    def __init__(self):
        import numpy as np
        from faster_whisper import WhisperModel
        from kokoro import KPipeline
        self.np=np
        self.whisper=WhisperModel('tiny.en',device='cpu',compute_type='int8')
        self.pipelines={'b':KPipeline(lang_code='b',device='cpu'),'a':KPipeline(lang_code='a',device='cpu')}

    def process(self, payload):
        np=self.np
        if payload.get('type')=='transcribe':
            pcm=base64.b64decode(payload.get('pcm',''),validate=True)
            if not pcm or len(pcm)>16000*12*4 or len(pcm)%4: raise ValueError('Invalid short audio')
            audio=np.frombuffer(pcm,dtype='<f4').copy()
            if not np.isfinite(audio).all() or np.max(np.abs(audio))>1.001: raise ValueError('Invalid samples')
            segments,_=self.whisper.transcribe(audio,language='en',beam_size=1,vad_filter=False)
            return {'text':' '.join(s.text.strip() for s in segments)[:3000]}
        if payload.get('type')=='speak':
            text=payload.get('text','');voice=payload.get('voice')
            if not isinstance(text,str) or not text.strip() or len(text)>220 or voice not in ['bm_george','am_michael']: raise ValueError('Invalid speech request')
            audio=np.concatenate([a.detach().cpu().numpy() if hasattr(a,'detach') else np.asarray(a) for _,_,a in self.pipelines[voice[0]](text,voice=voice,speed=1)])
            audio=np.clip(audio,-1,1).astype('<f4')
            if audio.nbytes>3000000: raise ValueError('Speech result too large')
            return {'pcm':base64.b64encode(audio.tobytes()).decode(),'sampleRate':24000}
        raise ValueError('Unsupported operation')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--url',default='https://scotty-core.onrender.com');args=parser.parse_args()
    base=origin(args.url);token=os.environ.get('SCOTTY_VOICE_DEVICE_TOKEN','')
    if len(token)!=43: raise ValueError('Set the pairing token in SCOTTY_VOICE_DEVICE_TOKEN on this computer.')
    print('Loading local speech models. First use downloads model files; no jobs are claimed yet.')
    engines=Engines();print('Voice worker ready. Keep this window open. Ctrl+C stops it.')
    while True:
        try:
            job=request(base,'poll',{},token).get('job')
            if job:
                try: result=engines.process(job['payload'])
                except Exception: result={'error':'Local speech processing failed. Check the computer installation.'}
                request(base,'report',{'id':job['id'],'lease':job['lease'],**result},token)
            else: time.sleep(2)
        except urllib.error.HTTPError as e:
            if e.code in [401,403]: raise RuntimeError('Pairing revoked or expired. Pair again in Scotty.') from None
            print('Voice bridge unavailable or claim expired; no job is replayed.');time.sleep(3)
        except (ValueError,OSError):
            print('Voice bridge unavailable or job rejected; no job is replayed.');time.sleep(3)

if __name__=='__main__':
    try: main()
    except KeyboardInterrupt: print('Voice worker stopped.')
