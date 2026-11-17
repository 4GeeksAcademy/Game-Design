# Wild Cards audio

## Current implementation
The initial audio layer uses the Web Audio API to synthesize lightweight UI cues, visual-novel dialogue blips, and a simple ambient chord bed. No third-party audio files are bundled in this first pass.

## Optional CC0 source packs for the next asset pass
- Kenney UI Audio: https://kenney.nl/assets/ui-audio — CC0
- Kenney Interface Sounds: https://kenney.nl/assets/interface-sounds — CC0
- Kenney Impact Sounds: https://kenney.nl/assets/impact-sounds — CC0
- Kenney Music Jingles: https://kenney.nl/assets/music-jingles — CC0 (short stingers, not long background tracks)
- Kenney RPG Audio: https://kenney.nl/assets/rpg-audio — CC0

CC0 assets may be used commercially without attribution. Keep the source pack's license/readme with any downloaded assets. Background music loops and character voice performances are intentionally not claimed as included here.

## Replaceable music slots
Drop your own MP3 files into these paths to replace the synthesized prototype themes automatically:
- `public/audio/music/menu-theme.mp3` — main menu / arcade theme
- `public/audio/music/story-theme.mp3` — Story Mode
- `public/audio/music/battle-1v1.mp3` — 1v1 battle
- `public/audio/music/battle-2v2.mp3` — 2v2 team battle
- `public/audio/music/victory-theme.mp3` — victory / reward screens

If a file is not present, the Web Audio prototype plays instead.

## Character sound profiles
Character dialogue and expression effects currently use synthesized voice-like prototypes. The profile keys are character ID + expression in `src/audio/audioManager.js`; recorded voice clips can be added in a later asset pass.

## Hosted CC0 sound effects currently used by the game

These are library MP3 files hotlinked by `src/audio/audioManager.js` (the game streams them when the matching event occurs; they are not bundled into the repository yet):

- UI click: SFXMint library — `https://sfxmint.com/dl/ui-click-56.mp3`
- Attack impact: SFXMint library — `https://sfxmint.com/dl/impact-punch-51.mp3`
- Successful shop purchase / cash register: SFXMint library — `https://sfxmint.com/dl/office-cash-register-16.mp3`

SFXMint states that its public sound library is dedicated to CC0 1.0, permits commercial use without attribution, and allows hotlinking. See [SFXMint license and terms](https://sfxmint.com/terms).

**Hosting note:** These effects currently stream from SFXMint. If the service changes a file URL or becomes unavailable, the sound will not play; gameplay will continue. We can later download approved clips into `public/audio/effects/` and switch the asset map to local files for self-hosting.
