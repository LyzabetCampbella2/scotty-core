import io
import json
import threading
import unittest
import urllib.error
import urllib.request
import wave
from server import Service, ThreadingHTTPServer, handler_for

class FakeEngine:
    def synthesize(self, text):
        out = io.BytesIO()
        with wave.open(out, 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(22050)
            w.writeframes(b'\0\0' * 2205)
        return out.getvalue()

class VoiceHTTPTests(unittest.TestCase):
    def setUp(self):
        self.service = Service(FakeEngine())
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), handler_for(self.service, 't' * 43))
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()

    def call(self, path, body=None, auth=True):
        req = urllib.request.Request('http://127.0.0.1:' + str(self.server.server_port) + path,
            data=json.dumps(body).encode() if body is not None else None,
            headers={'Authorization': 'Bearer ' + 't' * 43} if auth else {})
        try:
            with urllib.request.urlopen(req, timeout=2) as response:
                return response.status, response.read()
        except urllib.error.HTTPError as response:
            return response.code, response.read()

    def test_authentication_and_validation(self):
        self.assertEqual(self.call('/health', auth=False)[0], 401)
        self.assertEqual(self.call('/healthz', auth=False)[0], 200)
        self.assertEqual(self.call('/v1/speak', {'text': 'x' * 191})[0], 400)
        self.assertEqual(self.call('/v1/speak', {'text': 'hello'}, auth=False)[0], 401)

    def test_job_generates_audio_without_public_access(self):
        job = json.loads(self.call('/v1/speak', {'text': 'Fresh answer'})[1])['job_id']
        self.service.pending.join()
        self.assertEqual(json.loads(self.call('/jobs/' + job)[1])['state'], 'complete')
        self.assertTrue(self.call('/jobs/' + job + '/audio')[1].startswith(b'RIFF'))
        self.assertEqual(self.call('/jobs/' + job + '/audio', auth=False)[0], 401)
        self.assertEqual(self.call('/jobs/' + 'a' * 32)[0], 404)

if __name__ == '__main__':
    unittest.main()
