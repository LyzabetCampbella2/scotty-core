"""Authenticated Scottish male Piper synthesis. One worker, bounded memory, no transcript logs."""
import hmac
import io
import json
import os
import pathlib
import queue
import re
import threading
import time
import uuid
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

VOICE = 'Piper ARCTIC / AWB Scottish male'

class Engine:
    def __init__(self, model=None):
        from piper import PiperVoice, SynthesisConfig
        from piper.config import PiperConfig
        import onnxruntime
        model = pathlib.Path(model or os.environ.get('SCOTTY_PIPER_MODEL') or pathlib.Path(__file__).resolve().parent / 'models/en_US-arctic-medium.onnx')
        config = json.loads(model.with_suffix(model.suffix + '.json').read_text())
        if config.get('speaker_id_map', {}).get('awb') != 0:
            raise RuntimeError('Expected the AWB Scottish speaker at index zero')
        options = onnxruntime.SessionOptions()
        options.intra_op_num_threads = 1
        options.inter_op_num_threads = 1
        self.voice = PiperVoice(session=onnxruntime.InferenceSession(str(model), sess_options=options, providers=['CPUExecutionProvider']), config=PiperConfig.from_dict(config))
        self.config = SynthesisConfig(speaker_id=0, length_scale=1.0, noise_scale=0.667, noise_w_scale=0.8)

    def synthesize(self, text):
        output = io.BytesIO()
        with wave.open(output, 'wb') as wav:
            self.voice.synthesize_wav(text, wav, syn_config=self.config)
        return output.getvalue()

class Service:
    def __init__(self, engine):
        self.engine = engine
        self.jobs = {}
        self.lock = threading.Lock()
        self.pending = queue.Queue(maxsize=1)
        self.worker = threading.Thread(target=self.work, daemon=True)
        self.worker.start()

    def sweep(self):
        now = time.monotonic()
        for job_id in list(self.jobs):
            j = self.jobs[job_id]
            if j['state'] in ('complete', 'failed') and now - j['created'] > 300:
                del self.jobs[job_id]

    def submit(self, text):
        with self.lock:
            self.sweep()
            if len(self.jobs) >= 32:
                completed = [k for k, v in self.jobs.items() if v['state'] in ('complete', 'failed')]
                if completed:
                    del self.jobs[completed[0]]
                else:
                    raise queue.Full
            job_id = uuid.uuid4().hex
            self.jobs[job_id] = {'state': 'queued', 'created': time.monotonic()}
            try:
                self.pending.put_nowait((job_id, text))
            except queue.Full:
                del self.jobs[job_id]
                raise
            return job_id

    def work(self):
        while True:
            job_id, text = self.pending.get()
            try:
                with self.lock:
                    self.jobs[job_id]['state'] = 'generating'
                started = time.monotonic()
                audio = self.engine.synthesize(text)
                if not audio.startswith(b'RIFF') or len(audio) > 4 * 1024 * 1024:
                    raise ValueError('Invalid or oversized speech output')
                with self.lock:
                    self.jobs[job_id].update(state='complete', audio=audio, synthesisSeconds=round(time.monotonic() - started, 3))
            except Exception as exc:
                print('Voice synthesis error:', type(exc).__name__, flush=True)
                with self.lock:
                    self.jobs[job_id].update(state='failed', error='Scottish speech synthesis failed')
            finally:
                self.pending.task_done()

    def get(self, job_id):
        with self.lock:
            self.sweep()
            j = self.jobs.get(job_id)
            return dict(j) if j else None

def handler_for(service, token):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass  # Do not log spoken text, authorization or request details.

        def respond(self, data, status=200, mime='application/json'):
            payload = data if isinstance(data, bytes) else json.dumps(data).encode()
            self.send_response(status)
            self.send_header('Content-Type', mime)
            self.send_header('Content-Length', str(len(payload)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            try:
                self.wfile.write(payload)
            except (BrokenPipeError, ConnectionResetError):
                pass

        def do_GET(self):
            if self.path in ('/', '/healthz'):
                return self.respond({'ok': True, 'ready': True})
            if not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + token):
                return self.respond({'ok': False, 'error': 'Authentication required'}, 401)
            if self.path == '/health':
                return self.respond({'ok': True, 'ready': True, 'voice': VOICE, 'engine': 'piper', 'speaker': 'awb', 'accent': 'Scottish English', 'hosted': True})
            match = re.fullmatch(r'/jobs/([a-f0-9]{32})(/audio)?', self.path)
            if not match:
                return self.respond({'ok': False, 'error': 'Not found'}, 404)
            job = service.get(match[1])
            if not job:
                return self.respond({'ok': False, 'error': 'Voice job expired or not found'}, 404)
            if match[2]:
                if job['state'] != 'complete':
                    return self.respond({'ok': False, 'error': 'Audio not ready'}, 409)
                return self.respond(job['audio'], mime='audio/wav')
            return self.respond({k: v for k, v in job.items() if k not in ('audio', 'created')})

        def do_POST(self):
            if not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + token):
                return self.respond({'ok': False, 'error': 'Authentication required'}, 401)
            if self.path != '/v1/speak':
                return self.respond({'ok': False, 'error': 'Not found'}, 404)
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 8192:
                    raise ValueError()
                body = json.loads(self.rfile.read(length))
                text = body.get('text')
                if not isinstance(text, str) or not text.strip() or len(text) > 190 or re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', text):
                    raise ValueError()
            except (ValueError, AttributeError, TypeError):
                return self.respond({'ok': False, 'error': 'Use speech text of 1–190 characters'}, 400)
            try:
                job_id = service.submit(text.strip())
            except queue.Full:
                return self.respond({'ok': False, 'error': 'Scottish voice worker busy; replace with the latest request shortly'}, 429)
            return self.respond({'ok': True, 'job_id': job_id, 'voice': VOICE})
    return Handler

if __name__ == '__main__':
    token = os.environ.get('SCOTTY_VOICE_SERVICE_TOKEN', '')
    if len(token) < 43:
        raise RuntimeError('Set a strong voice service token before starting')
    service = Service(Engine())
    server = ThreadingHTTPServer(('0.0.0.0', int(os.environ.get('PORT', '10000'))), handler_for(service, token))
    print('Scottish Piper voice ready; AWB speaker loaded', flush=True)
    server.serve_forever()
