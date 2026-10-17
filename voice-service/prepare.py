"""Download an immutable Piper model during the build; no model downloads at request time."""
import hashlib
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent / 'models'
BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/5512791644e2148e4be301d4c7fc2a4bf51a5057/en/en_US/arctic/medium/'
EXPECTED = {'en_US-arctic-medium.onnx': '483303e294947a3ec2f910ea96093d876e1640f5772e9d89e511d6c82c667286', 'en_US-arctic-medium.onnx.json': 'db2ca1a55db01cdd3ce28ae63037ac525133e9e00ca557430dec572643235efe'}
ROOT.mkdir(exist_ok=True)
for name in ('en_US-arctic-medium.onnx', 'en_US-arctic-medium.onnx.json', 'MODEL_CARD'):
    target = ROOT / name
    if not target.exists():
        with urllib.request.urlopen(BASE + name, timeout=180) as response, target.with_suffix(target.suffix + '.part').open('wb') as output:
            while block := response.read(1024 * 1024):
                output.write(block)
        target.with_suffix(target.suffix + '.part').replace(target)
    if name in EXPECTED and hashlib.sha256(target.read_bytes()).hexdigest() != EXPECTED[name]:
        raise RuntimeError('Voice download checksum mismatch: ' + name)
    print('Prepared', name, target.stat().st_size, flush=True)
