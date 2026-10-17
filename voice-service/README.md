# Hosted Scottish voice

A dedicated, authenticated Piper CPU service that implements the existing HUD voice job protocol. Uses the ARCTIC model's `awb` speaker (index 0), a male Scottish-English speaker, rather than treating a generic en-GB voice as Scottish. Engine: https://github.com/OHF-Voice/piper1-gpl (GPL-3.0). Model and model card: https://huggingface.co/rhasspy/piper-voices/tree/5512791644e2148e4be301d4c7fc2a4bf51a5057/en/en_US/arctic/medium . Original ARCTIC corpus: http://www.festvox.org/cmu_arctic/ . Retain model/dataset notices with deployments.

Build: `pip install -r voice-service/requirements.txt && python voice-service/prepare.py`
Start: `python voice-service/server.py`
Set `SCOTTY_VOICE_SERVICE_TOKEN` (at least 43 random characters), `PYTHON_VERSION=3.12.11`, and optionally `PORT`. Set the HUD's `SCOTTY_SCOTTISH_VOICE_URL` and matching `SCOTTY_SCOTTISH_VOICE_TOKEN` only after verifying the hosted worker.

One inference thread, one queued utterance, up to 32 expiring job records. No stored transcript logs. Audio expires after five minutes and is lost on service restart. Public readiness is `/healthz`; voice metadata and synthesis require the service token. The HUD retains its owner authentication.

Render's free plan may sleep after inactivity. A wake from sleep can take longer than a warm speech request. This is synthesized speech for each response, not a recording or a clone of the old voice.
