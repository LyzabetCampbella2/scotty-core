# Voice features and spatial folders

Folders use the existing resource graph and are rendered as orange canvas blocks. Select them through the existing touch or Eyes On selection, then open Contents or Open Folder, or say “open this folder”. The sidebar has a Folders entry. Folder-to-folder drops persist hierarchy; cycles are refused. Moving a folder carries its descendants and indexed contents into the destination project. Spatial undo checks the subtree before restoring a move.

## Spoken examples

- Create project called My Novel.
- Create a folder called Writing.
- Create folder Research inside folder Writing.
- Create folder Photos inside this folder.
- Create folder Photos in project My Novel.
- Open folder Writing / Research.
- Rename this folder to Sources.
- Move folder Research into folder Archive.
- Move file Chapter One.pdf into folder Writing.
- Put this into folder Writing (one selected file or folder).
- Upload photos to folder Writing (opens the local picker controls).
- Add Google Doc https://docs.google.com/document/d/DOCUMENT_ID/edit to folder Writing.
- Add Google Doc Chapter One to folder Writing (requires the Google Docs connector).
- Add Apple Calendar event Writing session to folder Writing (requires an exported event from the Apple planner bridge).
- What controls are available here?
- Press Create Folder.
- Set New folder name to Research.
- Choose My Novel for Project for a root folder.
- Read current panel.
- Scroll down.

Only exact unique folder/file names or folder paths resolve. Missing and duplicate names produce a clarification message without mutating anything. For repeated names in separate projects, select the intended node and use “this”, or use its unique path/ID.

## Content and boundaries

Owner-selected uploads use the existing artifact store, with an 8 MB limit per file. Audio/video can play inside the folder; other files open the existing preview. Google Docs are canonical HTTPS links, not automatic copies or new Google permissions. A typed/pasted URL can be filed without an authorized Google Docs connector. Listing connected Docs uses only the document allowlist already configured in that connector.

Apple events are saved references: either a user-entered event record or a snapshot of an event explicitly exported by the Apple planner bridge. They do not create, move, edit, delete, or continually synchronize iCloud events. Bridge references retain event/device identity and a snapshot timestamp. Manually entered references require ISO start/end dates with a timezone offset.

UI voice controls can operate visible uniquely named buttons, fill ordinary labelled fields, select options, read the current panel and scroll. They do not enter secrets, choose local files, or bypass the existing approval flow for sending, publishing, deletion, pairing, or authorization. Initial browser microphone permission and OS file selection require user interaction. Existing feature-specific commands still run through their handlers. Commands are deterministic, not a claim that every possible natural-language phrase is implemented.

Folders are index organization within Scotty; moving an item does not relocate its external source. The folder listing includes up to 1,000 indexed files; canvas/workspace listings retain their existing limits. No destructive folder deletion is added.

## Validation

Run `node --test tests/*.test.mjs`. Folder tests cover ancestor loops, subtree project propagation, exact name resolution, URL validation, voice parsing, and owner-route protection. Live microphone, camera/hand tracking, external Docs access and Apple device exports require real-device verification.

## Speech recovery

“Create a folder” and “create a project” ask for a name. The next response can be a plain name or “call it NAME”; it expires after two minutes and is scoped to the conversation. Opening another command cancels the naming prompt. Boundary quotation marks from transcription are removed from labels.

Unknown conversational requests do not run the strict command-chain quote validator. Explicit saved chains retain strict parsing. Scottish speech generation has a 20-second deadline per chunk; an unavailable worker sets Voice Unavailable and releases the command path instead of remaining Busy. A wake-name command can replace waiting voice generation; approval/send/publish/delete requests still require their existing review path. Actual playback continues to suppress non-interruption echo. Check Voice Connection in Voice settings performs a bounded gateway health check without changing the selected voice.
