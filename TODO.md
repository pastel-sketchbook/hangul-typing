# TODO

## Infrastructure

- [ ] Initialize Zig project with build.zig
- [ ] Set up Taskfile.yml with build:wasm, dev:serve, test tasks
- [ ] Create static HTML/CSS/JS scaffold
- [ ] Integrate hangul-wasm as dependency
- [ ] Set up Zig HTTP server for static file serving

## Core Game Engine

- [ ] Define level data structure
- [ ] Implement level loader
- [ ] Create game state machine (idle, playing, completed, failed)
- [ ] Implement scoring system
- [ ] Add progress tracking (localStorage)

## Levels

- [ ] Level 1: Basic vowels (ㅏ, ㅓ, ㅗ, ㅜ, ㅡ, ㅣ)
- [ ] Level 2: Basic consonants (ㄱ, ㄴ, ㄷ, ㄹ, ㅁ, ㅂ, ㅅ, ㅇ, ㅈ)
- [ ] Level 3: Simple CV syllables (가, 나, 다, 마)
- [ ] Level 4: CVC syllables with final consonants
- [ ] Level 5: Double consonants (ㄲ, ㄸ, ㅃ, ㅆ, ㅉ)
- [ ] Level 6: Complex vowels (ㅐ, ㅔ, ㅚ, ㅟ, ㅢ)
- [ ] Level 7: Common words
- [ ] Level 8: Short phrases
- [ ] Level 9: Full sentences

## UI/UX

- [ ] Design pastel color palette
- [ ] Create line-only icon set
- [ ] Build keyboard visualization
- [ ] Implement real-time composition display
- [ ] Add level progress indicator
- [ ] Create level completion celebration
- [ ] Design level selection screen

## Testing

- [ ] Unit tests for scoring logic
- [ ] Unit tests for level progression
- [ ] Integration tests for keyboard input
- [ ] Browser tests for UI feedback
