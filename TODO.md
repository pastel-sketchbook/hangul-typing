# TODO

## Completed

### Infrastructure
- [x] Initialize Zig project with build.zig
- [x] Set up Taskfile.yml with build:wasm, build:ts, dev:serve, test tasks
- [x] Create static HTML/CSS/JS scaffold
- [x] Integrate hangul-wasm as dependency (v0.7.2 via build.zig.zon)
- [x] Set up Zig HTTP server for static file serving
- [x] Add TypeScript IME fallback with unified loader
- [x] Add IME status indicator in footer (WASM vs JS)
- [x] Set up release workflow (task release:patch/minor/major)

### Core Game Engine
- [x] Define level data structure (9 levels with chars and thresholds)
- [x] Implement level loader
- [x] Create game state machine (level-select, game, result screens)
- [x] Implement scoring system (10 points per correct answer)
- [x] Add progress tracking (localStorage)

### Levels
- [x] Level 1: Basic vowels (ㅏ, ㅓ, ㅗ, ㅜ, ㅡ, ㅣ)
- [x] Level 2: Basic consonants (ㄱ, ㄴ, ㄷ, ㄹ, ㅁ, ㅂ, ㅅ, ㅇ, ㅈ)
- [x] Level 3: Simple CV syllables (가, 나, 다, 라, 마, 바, 사, 아, 자)
- [x] Level 4: CVC syllables with final consonants (간, 날, 달, etc.)
- [x] Level 5: Double consonants (까, 따, 빠, 싸, 짜)
- [x] Level 6: Complex vowels (개, 게, 괴, 귀, 의)
- [x] Level 7: Common words (한국, 사람, 감사, 안녕, 좋아)
- [x] Level 8: Short phrases (안녕하세요, 감사합니다, 좋아요)
- [x] Level 9: Full sentences

### UI/UX
- [x] Design 60:30:10 color palette (warm cream, white cards, soft teal accent)
- [x] Build keyboard visualization with 2-Bulsik layout
- [x] Implement real-time composition display
- [x] Add level progress indicator (progress bar)
- [x] Create level completion celebration (stars, pass/fail)
- [x] Design level selection screen
- [x] Add key highlighting for target characters
- [x] Add version display in footer

### Documentation
- [x] Add screenshots to README
- [x] Create rationale docs (level progression, keyboard layout, visual design, hangul-wasm integration)

---

## In Progress

### UI/UX Polish
- [ ] Create line-only icon set (currently using Unicode symbols)
- [ ] Add keyboard highlighting for composed syllables (decompose and show sequence)

---

## Future Enhancements

### Game Features
- [ ] Add sound effects for keypress/correct/incorrect
- [ ] Add combo multiplier for consecutive correct answers
- [ ] Add time-attack mode
- [ ] Add practice mode (no scoring, unlimited retries)
- [ ] Add statistics/history tracking

### Content
- [ ] Expand Level 7-9 with more words and phrases
- [ ] Add romanization hints (optional toggle)
- [ ] Add pronunciation audio (optional)

### Testing
- [ ] Unit tests for scoring logic
- [ ] Unit tests for level progression
- [ ] Integration tests for keyboard input
- [ ] Browser tests for UI feedback

### Accessibility
- [ ] Add keyboard shortcuts for navigation
- [ ] Add high contrast mode
- [ ] Add screen reader support

### Mobile Support
- [ ] Responsive design for mobile screens
- [ ] Touch keyboard support
