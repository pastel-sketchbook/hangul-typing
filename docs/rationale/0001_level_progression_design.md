# Level Progression Design

## Philosophy

Learning Hangul typing should feel like playing a game, not studying. Each level introduces a focused concept, building on previous knowledge. Players "break" levels by demonstrating mastery, unlocking new challenges.

## Level Structure

### Stage 1: Jamo Foundations (Levels 1-2)

**Level 1: Basic Vowels**
- Characters: ㅏ ㅓ ㅗ ㅜ ㅡ ㅣ
- Goal: Learn the 6 fundamental vowels
- Key positions: Right hand home row and extensions
- Break condition: Type all vowels with 90% accuracy

**Level 2: Basic Consonants**
- Characters: ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅅ ㅇ ㅈ
- Goal: Learn the 9 basic consonants
- Key positions: Left hand primarily
- Break condition: Type all consonants with 90% accuracy

### Stage 2: Syllable Building (Levels 3-4)

**Level 3: Simple CV Syllables**
- Pattern: Consonant + Vowel (초성 + 중성)
- Examples: 가 나 다 마 바 사 아 자
- Goal: Understand syllable composition
- Break condition: Compose 20 CV syllables correctly

**Level 4: CVC Syllables**
- Pattern: Consonant + Vowel + Final (초성 + 중성 + 종성)
- Examples: 간 날 달 말 발 산
- Goal: Add final consonants (받침)
- Break condition: Compose 20 CVC syllables correctly

### Stage 3: Advanced Jamo (Levels 5-6)

**Level 5: Double Consonants**
- Characters: ㄲ ㄸ ㅃ ㅆ ㅉ
- Goal: Learn tense consonants (Shift + base consonant)
- Break condition: Type double consonants in syllables with 85% accuracy

**Level 6: Complex Vowels**
- Characters: ㅐ ㅔ ㅚ ㅟ ㅢ ㅘ ㅝ ㅙ ㅞ
- Goal: Learn compound vowels
- Break condition: Type complex vowels in syllables with 85% accuracy

### Stage 4: Real-World Application (Levels 7-9)

**Level 7: Common Words**
- Content: High-frequency Korean words (한국, 사람, 감사, 안녕)
- Goal: Build vocabulary muscle memory
- Break condition: Type 30 words with 80% accuracy

**Level 8: Short Phrases**
- Content: Common expressions (안녕하세요, 감사합니다, 좋아요)
- Goal: Handle longer sequences
- Break condition: Type 15 phrases with 80% accuracy

**Level 9: Full Sentences**
- Content: Simple sentences with spaces and punctuation
- Goal: Real-world typing proficiency
- Break condition: Type 10 sentences with 75% accuracy

## Breaking Mechanics

### Score Calculation

```
base_score = correct_characters * 10
time_bonus = max(0, (time_limit - elapsed_time) * 2)
accuracy_bonus = (accuracy_percentage - 80) * 5  // only if > 80%
final_score = base_score + time_bonus + accuracy_bonus
```

### Break Conditions

Each level has:
1. **Minimum accuracy threshold** - Must achieve to pass
2. **Target count** - Number of items to complete
3. **Optional time limit** - For bonus points, not required to pass

### Star Rating

- 1 Star: Met minimum accuracy
- 2 Stars: 90%+ accuracy
- 3 Stars: 95%+ accuracy with time bonus

## Progression Rules

1. Levels unlock sequentially (must break Level N to access Level N+1)
2. Players can replay any broken level to improve stars
3. Progress persists via localStorage
4. No penalty for mistakes beyond accuracy score

## Design Rationale

### Why "Break" Instead of "Complete"?

The word "break" implies:
- Active accomplishment (you broke through a barrier)
- Game-like achievement (breaking records, breaking limits)
- Satisfying finality (the level is conquered)

### Why No Strict Time Limits?

- Reduces anxiety for new learners
- Focuses on accuracy over speed
- Time bonus rewards improvement without punishing beginners

### Why 90% Starting Threshold?

- High enough to ensure learning
- Low enough to avoid frustration
- Allows for occasional typos while still progressing
