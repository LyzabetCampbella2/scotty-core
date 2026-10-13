# Computer voice engine (call feature 19)

This optional companion runs Whisper Tiny English and Kokoro on your Windows, Mac or Linux computer. It does not use the computer microphone. Your iPad captures audio and, only when you select Computer voice engine, sends short chunks through your authenticated Scotty server to the exact paired computer. Synthesized audio returns through the same queue. It is not offline iPad-to-computer calling and does not make Scotty's language-model answers free.

No computer is paired automatically. In Phone Calls, name the computer and choose PAIR COMPUTER. This creates a narrowly scoped speech-device token, shown once, valid for 30 days. Copy it securely to that computer; do not post it in chat. REVOKE COMPUTER disables its token and deletes its queued audio jobs. The token cannot use Scotty's projects, contacts, app actions or owner APIs.

On your computer, create a Python 3.11 virtual environment and install:

```sh
python -m venv scotty-voice-env
# Windows PowerShell: .\scotty-voice-env\Scripts\Activate.ps1
# Mac/Linux: source scotty-voice-env/bin/activate
python -m pip install faster-whisper==1.2.1 kokoro==0.9.4 numpy
```

Kokoro may require the system eSpeak NG phonemizer. Use its official installation instructions for your OS; do not install random binaries. First launch downloads substantial model files. CPU speed, available memory and platform dependencies affect startup/latency.

Download scotty-voice-companion.py from the authenticated Phone Calls panel. Set the token locally:

```sh
# Mac/Linux:
export SCOTTY_VOICE_DEVICE_TOKEN='YOUR_PAIRING_TOKEN'
# Windows PowerShell:
$env:SCOTTY_VOICE_DEVICE_TOKEN='YOUR_PAIRING_TOKEN'
python scotty-voice-companion.py --url https://scotty-core.onrender.com
```

After it reports ready, refresh computers in Phone Calls, select the exact computer and choose Computer voice engine. Start a Scotty call. Keep the companion terminal, computer and HUD open. No port forwarding or inbound computer server is needed. Stop with Ctrl+C. Outside-call wake recognition and Scottish HUD speech retain their existing pipeline.

Jobs are capped at 12 seconds of audio or 220 speech characters, claimed once and expire after two minutes. The server clears request audio when the computer reports and deletes results after the browser reads them. Call end cancels that session's jobs; expired jobs are cleaned on the next queue request. A disconnected computer cannot be confirmed ready. There is no automatic fallback that sends speech to a paid provider. The provided bridge has been protocol/mock tested, not installed or paired on your physical computer.
