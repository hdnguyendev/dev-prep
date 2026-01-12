# 6 Evaluation Criteria của Gemini - Code Reference

## 📍 Vị trí trong code

**File**: `server/src/app/services/gemini.ts`  
**Hàm**: `buildPrompt()`  
**Dòng**: 57-92

---

## 📝 Đoạn code đầy đủ

```57:92:server/src/app/services/gemini.ts
## EVALUATION CRITERIA

Evaluate each answer based on these 6 criteria with their weights:

### 1. LENGTH (Weight: 25%)
- Assess answer completeness and detail level
- Minimum words: Junior (18), Mid (25), Senior (35)
- Good length: Junior (25-70), Mid (40-90), Senior (60-120)
- Scoring: 0 (no answer) → 4 (too short) → 7 (adequate) → 8 (optimal)

### 2. STRUCTURE (Weight: 20%)
- Evaluate organization and logical flow
- Look for STAR method: Situation, Task, Action, Result
- Or structured approach: problem → approach → outcome
- Scoring: 4 (unstructured) → 10 (well-structured with STAR/clear narrative)

### 3. EXAMPLES (Weight: 20%)
- Assess use of concrete examples, metrics, and evidence
- Look for: specific numbers (%, users, time, revenue), metrics (KPI, latency, throughput), explicit examples
- Scoring: 4 (no examples) → 10 (clear examples with measurable impact)

### 4. CONFIDENCE (Weight: 10%)
- Evaluate assertiveness and clarity, avoid excessive hedging
- Penalize filler words: "uh", "um", "maybe", "probably", "not sure", "I think", "kind of"
- Scoring: 4 (very hesitant, ≥4 filler words) → 8 (confident and decisive)

### 5. KEYWORD MATCH (Weight: 15%)
- Assess mention of important role-related keywords
- Must-have keywords (weight x3) vs nice-to-have (weight x1)
- Scoring: 0 (no keywords) → 10 (comprehensive keyword coverage)

### 6. RELEVANCE (Weight: 10%)
- Evaluate direct relevance to the question asked
- Compare question and answer tokens/keywords
- Penalize off-topic answers (low relevance but long = max 5/10)
- Scoring: 0 (completely irrelevant) → 10 (directly addresses question)
```

---

## 🔍 Context đầy đủ

### Hàm `buildPrompt()` - Dòng 46-162

```46:162:server/src/app/services/gemini.ts
const buildPrompt = (transcript: string, turns: Turn[]) => {
  const turnsText = turns
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((t) => `Q${t.orderIndex}: ${t.questionText}\nA${t.orderIndex}: ${t.answerText || ""}`.trim())
    .join("\n\n");

  return `You are an expert interviewer and evaluator with deep knowledge of technical and behavioral interview assessment.

You will be given a transcript and a structured list of questions and answers from a mock interview.
Your task is to produce a STRICT JSON object (no markdown, no extra text, no code blocks).

## EVALUATION CRITERIA

Evaluate each answer based on these 6 criteria with their weights:

### 1. LENGTH (Weight: 25%)
- Assess answer completeness and detail level
- Minimum words: Junior (18), Mid (25), Senior (35)
- Good length: Junior (25-70), Mid (40-90), Senior (60-120)
- Scoring: 0 (no answer) → 4 (too short) → 7 (adequate) → 8 (optimal)

### 2. STRUCTURE (Weight: 20%)
- Evaluate organization and logical flow
- Look for STAR method: Situation, Task, Action, Result
- Or structured approach: problem → approach → outcome
- Scoring: 4 (unstructured) → 10 (well-structured with STAR/clear narrative)

### 3. EXAMPLES (Weight: 20%)
- Assess use of concrete examples, metrics, and evidence
- Look for: specific numbers (%, users, time, revenue), metrics (KPI, latency, throughput), explicit examples
- Scoring: 4 (no examples) → 10 (clear examples with measurable impact)

### 4. CONFIDENCE (Weight: 10%)
- Evaluate assertiveness and clarity, avoid excessive hedging
- Penalize filler words: "uh", "um", "maybe", "probably", "not sure", "I think", "kind of"
- Scoring: 4 (very hesitant, ≥4 filler words) → 8 (confident and decisive)

### 5. KEYWORD MATCH (Weight: 15%)
- Assess mention of important role-related keywords
- Must-have keywords (weight x3) vs nice-to-have (weight x1)
- Scoring: 0 (no keywords) → 10 (comprehensive keyword coverage)

### 6. RELEVANCE (Weight: 10%)
- Evaluate direct relevance to the question asked
- Compare question and answer tokens/keywords
- Penalize off-topic answers (low relevance but long = max 5/10)
- Scoring: 0 (completely irrelevant) → 10 (directly addresses question)

## QUESTION TYPE ADJUSTMENTS

- TECHNICAL questions: Increase keywordMatch (+8%), relevance (+5%), examples (+3%); Decrease structure (-3%)
- BEHAVIORAL questions: Increase structure (+8%), examples (+5%), confidence (+3%); Decrease keywordMatch (-4%)
- GENERAL questions: Use default weights

## CATEGORY SCORES (0-10 each)

Evaluate these 5 categories:
1. **Clarity**: Overall clarity and understandability of answers
2. **Structure**: Organization and logical flow across all answers
3. **Depth & Evidence**: Depth of answers and use of concrete evidence
4. **Relevance**: Overall relevance of answers to questions
5. **Keyword Match**: Coverage of important role-related keywords

## OVERALL SCORING

- Calculate per-question score (0-10) using weighted criteria above
- Overall Score = (Average per-question score) × 10 (0-100 integer)
- Recommendation:
  - HIRE: ≥80 points (excellent candidate)
  - CONSIDER: 60-79 points (potential, needs consideration)
  - REJECT: <60 points (does not meet requirements)

## FEEDBACK GUIDELINES

For each question, provide:
- Score (0-10 integer)
- Specific, actionable feedback (1-2 sentences)

For overall feedback:
- Summary: 2-3 sentences describing overall performance
- Strengths: 2-4 specific strengths
- Areas for Improvement: 2-4 specific areas to improve
- Category scores with brief comments

## OUTPUT FORMAT

Return ONLY a valid JSON object (no markdown, no code blocks, no extra text):

{
  "overallScore": <0-100 integer>,
  "recommendation": "HIRE" | "CONSIDER" | "REJECT",
  "summary": "<2-3 sentence summary>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "areasForImprovement": ["<improvement 1>", "<improvement 2>", ...],
  "categoryScores": [
    {"name": "Clarity", "score": <0-10 integer>, "comment": "<brief comment>"},
    {"name": "Structure", "score": <0-10 integer>, "comment": "<brief comment>"},
    {"name": "Depth & Evidence", "score": <0-10 integer>, "comment": "<brief comment>"},
    {"name": "Relevance", "score": <0-10 integer>, "comment": "<brief comment>"},
    {"name": "Keyword Match", "score": <0-10 integer>, "comment": "<brief comment>"}
  ],
  "perQuestion": [
    {"orderIndex": <number>, "score": <0-10 integer>, "feedback": "<specific feedback>"},
    ...
  ]
}

## INPUT DATA

Transcript:
${transcript}

Structured Q&A:
${turnsText}

Now evaluate and return the JSON object.`;
};
```

---

## 📊 Tóm tắt

### 6 Criteria được định nghĩa trong:
- **File**: `server/src/app/services/gemini.ts`
- **Hàm**: `buildPrompt()` (dòng 46)
- **Vị trí**: Dòng 57-92 trong prompt string
- **Mục đích**: Được đưa vào prompt để Gemini hiểu cách đánh giá

### Cách sử dụng:
1. Hàm `buildPrompt()` tạo prompt string
2. Prompt này được gửi đến Gemini API
3. Gemini sử dụng 6 criteria này để đánh giá từng câu trả lời
4. Kết quả trả về là JSON với scores và feedback

### Lưu ý:
- 6 criteria này **KHÔNG** được hardcode trong TypeScript
- Chúng được định nghĩa trong **prompt string** gửi cho Gemini
- Gemini tự động áp dụng các criteria này khi phân tích
- Khác với Rule-based evaluator (có code logic cụ thể)

