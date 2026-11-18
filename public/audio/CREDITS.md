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


## Bundled audio files

All files below are stored locally in this repository. The game loads them from `public/audio/` using paths based on Vite's `BASE_URL`, so they work with the GitHub Pages `/Game-Design/` deployment.

### Sound effects

| Local file | Source | License |
|---|---|---|
| `effects/ui-click.mp3` | [Kenney — Interface Sounds](https://kenney.nl/assets/interface-sounds), click sound | CC0 1.0 |
| `effects/purchase-coin.mp3` | [Kenney — Casino Audio](https://kenney.nl/assets/casino-audio), coin sound | CC0 1.0 |
| `effects/attack-impact.ogg` | [Kenney — Impact Sounds](https://kenney.nl/assets/impact-sounds), medium punch impact | CC0 1.0 |

### Music

| Local file | Track / creator | Source | License |
|---|---|---|---|
| `music/menu-theme.mp3` | Upbeat Loop — BenjaTheMaker | [OpenGameArt](https://opengameart.org/content/upbeat-short-music-loop-vorbis-oog) | CC0 1.0 |
| `music/story-theme.mp3` | Peaceful Days — Juhani Junkala | [OpenGameArt](https://opengameart.org/content/jrpg-pack-4-calm) | CC0 1.0 |
| `music/battle-1v1.mp3` (shared by 1v1 and 2v2) | Stage 2 — Juhani Junkala | [OpenGameArt](https://opengameart.org/content/4-chiptunes-adventure) | CC0 1.0 |
| `music/victory-theme.mp3` | Kenney Music Jingles — NES stinger | [Kenney — Music Jingles](https://kenney.nl/assets/music-jingles) | CC0 1.0 |

These assets were sourced from the public [S3M1TR4SH asset-library](https://github.com/S3M1TR4SH/asset-library), which documents the individual asset sources and CC0 licenses in its `LICENSES.md`. The punch impact was sourced from [GeorgeQLe/assets-sfx-combat](https://github.com/GeorgeQLe/assets-sfx-combat), which includes Kenney's CC0 license information.

## Replacing audio later

Keep the filenames above and replace the corresponding files in `public/audio/music/` or `public/audio/effects/`. The code does not need to change as long as the filenames remain the same. Music and effects are loaded locally; no external sound-library URL is required.


## Character expression reaction sounds

These CC0 1.0 MP3 clips are currently streamed directly from SFXMint. They are not recordings of the anime cast; they are generic game-character vocal reactions selected to match the expression. Replace the URLs in `src/audio/audioManager.js` with local recordings whenever custom voice assets are ready.

| Character / expression | Clip | Source |
|---|---|---|
| Rock Lee — happy / excited | Cartoon Man Chuckle 06 | [SFXMint](https://sfxmint.com/sounds/man-chuckle-06) |
| Rock Lee — determined | Impressed Ooh Character Emote 08 | [SFXMint](https://sfxmint.com/sounds/character-emote-08) |
| Rock Lee — serious | Thinking Hmm Character Emote 06 | [SFXMint](https://sfxmint.com/sounds/character-emote-06) |
| Rock Lee — pushups1 | Lifting Effort Pain Grunt 06 | [SFXMint](https://sfxmint.com/sounds/pain-grunt-06) |
| Rock Lee — pushups2 | Long Strain Pain Grunt 10 | [SFXMint](https://sfxmint.com/sounds/pain-grunt-10) |
| Tenten — happy | Happy Cheer Character Emote 10 | [SFXMint](https://sfxmint.com/sounds/character-emote-10) |
| Tenten — angry / exasperated | Grumble Character Emote 05 | [SFXMint](https://sfxmint.com/sounds/character-emote-05) |
| Tenten — facepalm | Sigh Character Emote 09 | [SFXMint](https://sfxmint.com/sounds/character-emote-09) |
| Tenten — relate | Confused Huh Character Emote 07 | [SFXMint](https://sfxmint.com/sounds/character-emote-07) |

SFXMint states that its library files are CC0 1.0, including commercial use and hotlinking. The sound URLs are centralized in `EXPRESSION_AUDIO` in `src/audio/audioManager.js`.
