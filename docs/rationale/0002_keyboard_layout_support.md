# Keyboard Layout Support

## Overview

Hangul Typing supports visual keyboard layouts to help learners understand the physical key positions for Korean characters. This document describes the supported layouts and design decisions.

## Supported Layouts

### 2-Bulsik (두벌식) - Default

The standard Korean keyboard layout used by approximately 90% of Korean typists. "2-Bulsik" means "two-set style" because it uses two sets of jamo (consonants and vowels).

**Layout Characteristics:**
- Consonants on the left side (QWERTASDFGZXCVB)
- Vowels on the right side (YUIOPHJKLNM)
- Double consonants (ㄲ, ㄸ, ㅃ, ㅆ, ㅉ) via Shift + base consonant
- Some vowels (ㅒ, ㅖ) also require Shift

**Key Mapping:**

```
┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
│ ㅂ │ ㅈ │ ㄷ │ ㄱ │ ㅅ │ ㅛ │ ㅕ │ ㅑ │ ㅐ │ ㅔ │
│ㅃ │ㅉ │ㄸ │ㄲ │ㅆ │   │   │   │ㅒ │ㅖ │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ ㅁ │ ㄴ │ ㅇ │ ㄹ │ ㅎ │ ㅗ │ ㅓ │ ㅏ │ ㅣ │   │
├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│ ㅋ │ ㅌ │ ㅊ │ ㅍ │ ㅠ │ ㅜ │ ㅡ │   │   │   │
└───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
```

### 3-Bulsik (세벌식) - Planned

A more ergonomic layout designed by Dr. Kong Byung-woo. "3-Bulsik" means "three-set style" because it separates initial consonants, vowels, and final consonants.

**Advantages:**
- Better finger distribution
- Faster typing for experienced users
- Less strain on little fingers

**Status:** Planned for future implementation.

## Visual Keyboard Design

### Design Principles

1. **Line-only aesthetic** - Consistent with overall design language
2. **Pastel highlights** - Soft colors that guide without distracting
3. **Clear hierarchy** - Normal jamo prominent, shift variants subtle
4. **Responsive** - Scales down gracefully on mobile devices

### Highlight States

| State           | Color                              | Purpose                     |
|-----------------|------------------------------------|-----------------------------|
| Normal          | White background                   | Default key state           |
| Highlight       | `--accent-primary` (pastel blue)   | Target key to press         |
| Highlight-Shift | `--accent-secondary` (pastel purple) | Shift + key required      |
| Pressed         | Darker background                  | Visual feedback on keypress |

### Key Dimensions

- Desktop: 48×48px per key
- Mobile: 32×40px per key
- Border radius: 8px (rounded corners)
- Gap between keys: 4px

## Implementation Notes

### Jamo-to-Key Mapping

The `JAMO_TO_KEY` reverse mapping allows quick lookup of which physical key produces a given jamo:

```javascript
// Example: Finding the key for ㅏ
JAMO_TO_KEY['ㅏ'] // → { key: 'k', shift: false }

// Example: Finding the key for ㅃ
JAMO_TO_KEY['ㅃ'] // → { key: 'q', shift: true }
```

### Syllable Decomposition

For composed syllables (e.g., 가, 한), the keyboard should ideally show the sequence of keys needed. This requires Hangul decomposition:

1. 가 → ㄱ (r key) + ㅏ (k key)
2. 한 → ㅎ (g key) + ㅏ (k key) + ㄴ (s key)

**Current behavior:** Shows first jamo only
**Future enhancement:** Show full key sequence with animation

## Future Enhancements

1. **3-Bulsik layout** - Add toggle in settings
2. **Key sequence animation** - Animate through syllable composition
3. **Hand position guide** - Show left/right hand assignments
4. **Finger hints** - Indicate which finger should press each key
5. **Custom layouts** - Allow user-defined mappings
