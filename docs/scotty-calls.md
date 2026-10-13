# Scotty calls, features 1–12

PHONE CALLS is in the restored left sidebar. It opens an owner-initiated voice screen with an orb, timer, microphone controls and status. It does not provide a telephone number or dial ordinary phone numbers.

Use LOAD WHISPER + KOKORO to prepare the device models, then CALL SCOTTY. First use downloads the models from Hugging Face and pinned runtime packages from jsDelivr. This can take time and requires sufficient device memory and browser storage. Subsequent loads can use the browser model cache. It does not automatically download models or open a microphone on page load.

Whisper Tiny English transcribes local microphone chunks; Kokoro generates George (British English) or Michael (American English) speech locally in a Web Worker. The existing Groq Whisper endpoint is an explicit alternative in the recognition selector and retains its provider quotas. Device processing incurs no speech API minutes. Scotty answers still use the existing authenticated server and its configured language model; this does not make all hosting, inference, internet or electricity free.

The existing Scottish HUD voice remains selected outside calls. Kokoro call voices are not a Scottish voice clone. The microphone uses echo cancellation; headphones improve interruption reliability. Voice activity pauses spoken output and routes the new utterance to Whisper, with a best-effort echo filter. Natural conversation sends recognized requests through the existing Scotty command and approval boundaries. Call mode does not automatically approve app actions.

Call voice controls: Call Scotty, mute, unmute, end call, repeat that, stop speaking. A muted audio track cannot hear an unmute command: use the visible Unmute control. End stops microphone tracks and playback, aborts the active Scotty response, and invalidates late results. Hiding the page pauses capture and requires explicit unmute on return. Browser calls are not guaranteed to remain active while an iPad locks or the app backgrounds.

CHECK DEVICE VOICE ENGINES opens `/calls-engine-check`. It loads the models, synthesizes a fixed sample with Kokoro and transcribes that sample with Whisper. No microphone permission, private user audio, real calls, or model-provider transcription request is used by this check.

START JITSI AUDIO ROOM loads the official meet.jit.si IFrame API only on request. It uses audio-only defaults and Jitsi's prejoin screen. The free public service may require the room creator to authenticate. The displayed room URL is not automatically sent to contacts. Mute/end control the local Jitsi connection; leaving does not end the room for other participants. Scotty's own microphone capture is stopped before Jitsi starts. The AI does not join, capture, transcribe, record or synthesize speech into the Jitsi room. Connecting an AI participant would be a separate build with explicit participant consent and suitable hosting.

Pinned browser runtimes: Transformers.js 3.5.1 and Kokoro.js 1.2.1. Models: `onnx-community/whisper-tiny.en` and `onnx-community/Kokoro-82M-v1.0-ONNX`, q8 CPU/WASM. Jitsi API: `https://meet.jit.si/external_api.js`.

## Voice setup

Tap the bottom HUD microphone once and allow Safari microphone access. Keep Scotty open. Say “Scotty, load voice models”, wait for readiness, then “Scotty, call Scotty”. Setup commands also include “Scotty, use local Whisper”, “Scotty, use cloud Whisper”, “Scotty, use Kokoro George”, “Scotty, use Kokoro Michael”, “Scotty, check voice engines”, “Scotty, open phone calls” and “Scotty, start Jitsi audio room”. These named call commands bypass the ordinary spoken-request review, while app-action approval boundaries stay in effect. While Scotty is audibly speaking, only explicit stop/end/mute call interruptions bypass echo protection. Setup commands can interrupt generation before audible playback begins.

Voice-started Scotty calls reuse the already-unlocked HUD AudioContext when available; ending a call disconnects its graph and tracks without closing that shared context. Unmuting after disabling the microphone and Jitsi authentication may still need a screen tap. Jitsi uses its own microphone and does not route room speech back to Scotty for voice-command interpretation.

## Contacts and conversation, features 6–12

6. Contacts have display names and exact-match nicknames. Older device phone contacts are copied into the new contact list without deleting the old data. Shared nicknames show candidate people instead of choosing automatically.
7. Each contact prefers Jitsi or telephone. Jitsi does not need a phone number. Telephone is explicitly unavailable until a provider is connected.
8. Call requests show the exact recipient, method and destination. Confirmation is bound to a snapshot, consumed once and expires after two minutes; editing contacts or ending a call cancels it. Only “confirm call” or the explicit confirmation button approves a pending request.
9. Favorite contacts have a dedicated filter. Contacts and favorites are saved in this browser profile only, not synchronized or encrypted. Do not use a shared browser profile for private contacts.
10. Confirming a Jitsi recipient opens a newly generated, high-entropy unlisted room. This is not a direct call to that person: share its link yourself. No message or invitation is sent. Unlisted is not access-restricted. After joining as host, ENABLE JITSI LOBBY requests the official `toggleLobby` command; check the actual room security state. Authentication and moderator permissions may be required.
11. Call preparation shows recipient/method information and provides a goal and notes/questions. Briefs are page-only, not persisted, sent to contacts or treated as AI instructions. Preparing never starts a call.
12. Scotty call captions display completed Whisper utterances and response text, with show/hide control. They are not incremental live recognition or word-timed speech alignment, and do not caption Jitsi participants. This feature does not persist transcripts; existing Scotty conversation history behavior is unchanged.

Example voice commands: “Scotty, save internet contact Alex”, “nickname Alex as boss”, “use Jitsi for Alex”, “favorite Alex”, “show call favorites”, “prepare call with boss”, “set call goal to Review the project”, “call boss”, “confirm call”, “cancel call”, “show call captions”. Contact commands outside a call follow the existing spoken-request review policy. The HUD microphone must be enabled; during a Jitsi room Scotty is not listening.
