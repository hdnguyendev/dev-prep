# Scoring System Documentation

This document describes the three-layer scoring system used in the DevPrep platform to evaluate candidates throughout the recruitment process. Each layer operates independently and contributes to the overall candidate assessment.

---

## Section 1: Matching Score Layer (CV-Job Matching)

### Overview

The Matching Score Layer calculates a compatibility score between a candidate's profile and a job posting. This score ranges from 0 to 100 and is computed using a weighted combination of seven distinct factors.

### Input Data

**Candidate Profile:**
- Skills: Array of skill names from the candidate's profile
- Experiences: Array of work experience records (startDate, endDate, isCurrent, position)
- Education: Degree, field of study, institution, graduation year
- Headline/Title: Professional title or headline
- Address: Location information
- Soft Skills: Object containing scores for communication, leadership, problem-solving, adaptability, creativity, attentionToDetail
- Technologies: Object containing arrays for frontend, backend, database, cloud, and tools

**Job Requirements:**
- Skills: Array of required and optional skills (each skill has an `isRequired` flag)
- Experience Level: Required level (Junior, Mid, Senior, Lead, Principal, etc.)
- Education Requirements: Required degree, preferred degree, required field of study, preferred schools
- Job Title: Position title
- Location: Job location and remote work availability (`isRemote` flag)
- Job Description: Full text description, requirements, and responsibilities (used for text analysis)

### Scoring Components

#### 1. Skills Score (30% Weight)

**Calculation Process:**
1. **Normalization**: Skills are normalized by converting to lowercase, removing special characters, and handling synonyms (e.g., "js" → "JavaScript", "react" → "React.js")
2. **Comparison**: The system compares candidate skills against job required skills to identify:
   - `matched`: Skills the candidate has that match job requirements
   - `missing`: Required skills the candidate lacks
   - `extra`: Skills the candidate has beyond requirements
3. **Required Skills Matching**: 
   - `requiredMatchPercentage = (matchedCount / requiredCount) × 100`
   - If no required skills exist, the score is 100 if the candidate has any skills, otherwise 0
4. **Optional Skills Bonus**:
   - `optionalMatchCount` = number of optional skills the candidate possesses
   - `optionalBonus = min((optionalMatchCount / optionalCount) × 20, 20)` (capped at 20 points)
5. **Final Score**: 
   - `skillScore = min(requiredMatchPercentage + optionalBonus, 100)`
   - This score is then multiplied by the weight: `weightedSkillScore = skillScore × 0.30`

**Output**: Score from 0-100, plus detailed breakdown of matched, missing, and extra skills.

#### 2. Experience Score (18% Weight)

**Calculation Process:**
1. **Calculate Total Years**: Sum all experience durations from candidate's work history
   - For each experience: `years = (endDate - startDate) / 365.25`
   - If `isCurrent = true`, use current date as end date
   - Sum all years to get `totalYears`
2. **Map Years to Level**:
   - `< 1 year` → Intern (level 0)
   - `1 - < 2 years` → Junior (level 1)
   - `2 - < 5 years` → Mid-level (level 2)
   - `5 - < 8 years` → Senior (level 3)
   - `8 - < 12 years` → Lead (level 4)
   - `≥ 12 years` → Principal/Architect (level 5)
3. **Compare with Job Requirement**:
   - If job does not specify experience level: `score = 100`
   - If job specifies level:
     - Normalize job level using `EXPERIENCE_LEVELS` mapping
     - If `candidateLevel >= requiredLevel`: `score = 100`
     - If `candidateLevel < requiredLevel`:
       - `levelDiff = requiredLevel - candidateLevel`
       - `score = max(0, 100 - (levelDiff × 25))` (penalty of 25 points per level gap)
4. **Final Score**: `weightedExperienceScore = experienceScore × 0.18`

**Output**: Score from 0-100, plus years of experience, required level, and gap description if applicable.

#### 3. Title Score (12% Weight)

**Calculation Process:**
1. **Normalize Titles**: 
   - Convert candidate headline/title and job title to lowercase
   - Remove special characters
   - Split into words
   - Filter out words with length ≤ 2 characters
2. **Find Common Keywords**:
   - `candidateWords` = set of normalized words from candidate title
   - `jobWords` = set of normalized words from job title
   - `commonWords` = intersection of both sets
3. **Calculate Similarity**:
   - `totalUniqueWords` = union of candidateWords and jobWords
   - `similarity = (commonWords.length / totalUniqueWords) × 100`
   - `titleScore = min(rounded(similarity), 100)`
4. **Final Score**: `weightedTitleScore = titleScore × 0.12`

**Output**: Score from 0-100, plus similarity description (High/Moderate/Low similarity).

#### 4. Education Score (12% Weight)

**Calculation Process:**
1. **Check Required Degree**: If job specifies `requiredDegree`, check if candidate's degree matches exactly
2. **Check Preferred Degree**: If job specifies `preferredDegree`, check if candidate's degree matches
3. **Check Field of Study**: If job specifies `requiredField`, check if candidate's field matches
4. **Calculate Score**:
   - If required degree matches: `score = 100`
   - Else if preferred degree matches: `score = 70`
   - Else if field of study matches: `score = 50`
   - Else: `score = 0` (or low score based on partial matches)
5. **Final Score**: `weightedEducationScore = educationScore × 0.12`

**Output**: Score from 0-100, plus education match description.

#### 5. Soft Skills Score (12% Weight)

**Calculation Process:**
1. **Extract Soft Skills from Job**: Analyze job description text to identify soft skills mentioned:
   - Keywords: communication, leadership, problem-solving, adaptability, creativity, attention to detail, teamwork, etc.
   - Uses text analysis to extract these from job description
2. **Compare with Candidate**: 
   - `candidateSoftSkills` = object containing candidate's soft skill scores
   - `jobSoftSkills` = extracted soft skills from job text
3. **Calculate Match**:
   - For each soft skill mentioned in job:
     - If candidate has that skill (with a score): add points
   - `softSkillsScore = (matchedSkills / totalJobSoftSkills) × 100`
4. **Final Score**: `weightedSoftSkillsScore = softSkillsScore × 0.12`

**Output**: Score from 0-100, plus list of matched soft skills and gaps.

#### 6. Technology Score (8% Weight)

**Calculation Process:**
1. **Extract Technologies from Job**: Analyze job description to extract technologies by category:
   - Frontend technologies (React, Vue, Angular, etc.)
   - Backend technologies (Node.js, Python, Java, etc.)
   - Database technologies (PostgreSQL, MongoDB, etc.)
   - Cloud platforms (AWS, Azure, GCP, etc.)
   - Tools and frameworks
2. **Compare with Candidate**: 
   - `candidateTechs` = candidate's technologies object (organized by category)
   - `jobTechs` = extracted technologies from job (by category)
3. **Calculate Match**:
   - For each category (frontend, backend, database, cloud, tools):
     - Calculate intersection and union of technologies
     - `matchPercentage = (intersection / union) × 100`
   - `technologyScore = average of all category match percentages`
4. **Final Score**: `weightedTechnologyScore = technologyScore × 0.08`

**Output**: Score from 0-100, plus matched and missing technologies by category.

#### 7. Location Score (8% Weight)

**Calculation Process:**
1. **Check Remote Work**: If `job.isRemote === true`:
   - `score = 100` (immediate return, no further calculation needed)
2. **Extract Locations**: 
   - Parse candidate address to extract location (city, country)
   - Parse job location to extract location
3. **Calculate Distance Match**:
   - If same city: `score = 100`
   - If same country (different city): `score = 70`
   - If different country: `score = 30`
   - If no location information available: `score = 50` (neutral score)
4. **Final Score**: `weightedLocationScore = locationScore × 0.08`

**Output**: Score from 0-100, plus location match description.

### Final Matching Score Calculation

**Weighted Sum Formula:**
```
totalMatchScore = (skillScore × 0.30) + 
                  (experienceScore × 0.18) + 
                  (titleScore × 0.12) + 
                  (educationScore × 0.12) + 
                  (softSkillsScore × 0.12) + 
                  (technologyScore × 0.08) + 
                  (locationScore × 0.08)
```

**Note**: Bonus score component exists in the codebase but has a weight of 0.00, so it does not contribute to the final score.

**Output**: 
- **Match Score**: 0-100 (rounded to 2 decimal places)
- **Breakdown**: Individual scores for each component
- **Details**: 
  - Matched skills, missing skills, extra skills
  - Experience gap description
  - Title similarity description
  - Education match description
  - Soft skills match and gaps
  - Matched and missing technologies by category
  - Location match description

---

## Section 2: Interview Feedback Score Layer (AI Interview Evaluation)

### Overview

The Interview Feedback Score Layer evaluates candidate performance during AI-powered interviews. It analyzes each question-answer pair using six criteria, then aggregates scores to produce an overall assessment with recommendations.

### Input Data

**Interview Transcript:**
- Full conversation text
- Array of `turns`: Each turn contains:
  - `questionText`: The question asked
  - `answerText`: The candidate's response
  - `questionCategory`: Type of question (Technical, Behavioral, General)
  - `orderIndex`: Question sequence number

**Interview Metadata:**
- `seniority`: Candidate level (Junior, Mid, Senior)
- `mustHaveKeywords`: Array of required keywords for the position
- `niceToHaveKeywords`: Array of preferred keywords
- `language`: Interview language (en or vi)
- `stopwords`: Language-specific stopwords for text processing

### Per-Question Scoring (0-10 Scale)

For each question-answer pair, the system calculates six sub-scores using the `scoreAnswer0to10` function:

#### 1. Length Score (15% Weight)

**Calculation Process:**
1. **Count Words**: `words = countWords(answerText)`
2. **Check Minimum by Seniority**:
   - **Junior**: Minimum = 18 words, Good range = 25-70 words
   - **Mid-level**: Minimum = 25 words, Good range = 40-90 words
   - **Senior**: Minimum = 35 words, Good range = 60-120 words
3. **Calculate Score**:
   - If `words == 0`: `lengthSubScore = 0`
   - Else if `words < minGoodWords`: `lengthSubScore = 4` (too short)
   - Else if `words < okWords`: `lengthSubScore = 7` (adequate but could be more detailed)
   - Else: `lengthSubScore = 8` (appropriate length)

**Purpose**: Ensures answers are sufficiently detailed and comprehensive for the candidate's level.

#### 2. Structure Score (20% Weight)

**Calculation Process:**
1. **Detect Structure Signals**: Check for STAR method keywords or logical flow indicators:
   - STAR keywords: `situation`, `task`, `action`, `result`
   - Alternative patterns: `problem`, `approach`, `outcome`, `context`, `challenge`, `solution`
2. **Check Logical Flow**: Verify sequential organization:
   - Problem → Solution → Result pattern
   - Presence of sequential markers (first, then, finally, etc.)
3. **Calculate Score**:
   - If structure signals detected: `structureSubScore = 10`
   - Else: `structureSubScore = 4` (lacks clear structure)

**Purpose**: Evaluates organization and logical presentation of answers.

#### 3. Examples Score (20% Weight)

**Calculation Process:**
1. **Detect Example Signals**: Check for concrete evidence:
   - Example markers: "for example", "e.g.", "ví dụ", "chẳng hạn"
   - Numbers and metrics: "10%", "1000 users", "5 seconds", "$50K revenue"
   - Performance indicators: "KPI", "latency", "throughput", "ROI", "conversion rate"
   - Specific technologies or tools mentioned
2. **Count Examples**: `exampleCount = countExampleSignals(answerText)`
3. **Calculate Score**:
   - If examples detected: `examplesSubScore = 10`
   - Else: `examplesSubScore = 4` (lacks concrete examples)

**Purpose**: Assesses use of real-world examples and measurable evidence.

#### 4. Confidence Score (15% Weight)

**Calculation Process:**
1. **Detect Filler Words**: Identify hesitation indicators:
   - English: "uh", "um", "maybe", "probably", "I think", "kind of", "sort of", "not sure"
   - Vietnamese: "ờ", "ừm", "chắc", "không chắc", "kiểu như"
2. **Count Filler Occurrences**: `fillerCount = countFillerWords(answerText)`
3. **Calculate Score**:
   - If `hesitant === true` OR `fillerCount >= 4`: `confidenceSubScore = 4` (low confidence)
   - Else: `confidenceSubScore = 8` (confident and decisive)

**Purpose**: Evaluates candidate's confidence and clarity in communication.

#### 5. Keyword Match Score (15% Weight)

**Calculation Process:**
1. **Extract Keywords**: 
   - `mustHaveKeywords` = required keywords from job posting
   - `niceToHaveKeywords` = preferred keywords from job posting
2. **Count Matches**: 
   - `mustHits` = number of must-have keywords found in answer
   - `niceHits` = number of nice-to-have keywords found in answer
3. **Calculate Score**:
   - `keywordSubScore = clampInt(mustHits × 3 + niceHits × 1, 0, 10)`
   - Must-have keywords weighted 3x more than nice-to-have
   - Score capped at 10

**Purpose**: Measures alignment with job requirements and technical terminology.

#### 6. Relevance Score (15% Weight)

**Calculation Process:**
1. **Tokenize Text**: 
   - `questionTokens` = tokenize(questionText, language, stopwords)
   - `answerTokens` = tokenize(answerText, language, stopwords)
   - Remove stopwords and normalize tokens
2. **Calculate Jaccard Similarity**:
   - `intersection` = common tokens between question and answer
   - `union` = all unique tokens from both question and answer
   - `jaccard = intersection / union`
3. **Calculate Score**:
   - `relevanceSubScore = clampInt(jaccard × 10, 0, 10)`
   - Higher similarity = more relevant answer

**Purpose**: Evaluates how directly the answer addresses the question asked.

### Question Type Adjustment

The system adjusts weights based on question type:

**Technical Questions:**
- Increase: Keyword Match (+8%), Relevance (+5%), Examples (+3%)
- Decrease: Structure (-3%)
- Rationale: Technical questions prioritize knowledge and terminology

**Behavioral Questions:**
- Increase: Structure (+8%), Examples (+5%), Confidence (+3%)
- Decrease: Keyword Match (-4%)
- Rationale: Behavioral questions prioritize storytelling and soft skills

**General Questions:**
- Use default weights (no adjustment)
- Balanced evaluation across all criteria

### Score Blending (Per-Question Final Score)

**Weighted Combination:**
```
weightedScore = (lengthSubScore × w.length) + 
                (structureSubScore × w.structure) + 
                (examplesSubScore × w.examples) + 
                (confidenceSubScore × w.confidence) + 
                (keywordSubScore × w.keywordMatch) + 
                (relevanceSubScore × w.relevance)
```

**Normalization:**
- `finalScore = weightedScore / totalWeight` (normalize by sum of weights)
- `perQuestionScore = clampInt(finalScore, 0, 10)`

**Output**: Each question receives a score from 0-10, plus specific feedback.

### Score Aggregation

#### Overall Score (0-100)

**Calculation:**
1. Calculate average of all per-question scores:
   - `avgScore = sum(perQuestionScores) / questionCount`
2. Scale to 0-100:
   - `overallScore = clampInt(avgScore × 10, 0, 100)`

#### Category Scores (0-10)

Five category scores are calculated:

1. **Clarity**: Percentage of answers scoring ≥ 6 points
   - `clarityScore = (answersWithScore >= 6) / totalAnswers × 10`

2. **Structure**: Percentage of answers with good structure
   - `structureScore = (structuredAnswers) / totalAnswers × 10`

3. **Depth & Evidence**: Average score plus bonus for examples
   - `depthScore = average(perQuestionScores) + examplesBonus`

4. **Relevance**: Average relevance score across all questions
   - `relevanceScore = average(relevanceSubScores)`

5. **Keyword Match**: Keyword coverage across all answers
   - `keywordScore = average(keywordSubScores)` (if keywords exist)

### Recommendation Generation

**Decision Logic:**
- If `overallScore ≥ 80`: `recommendation = "HIRE"`
- Else if `overallScore ≥ 60`: `recommendation = "CONSIDER"`
- Else: `recommendation = "REJECT"`

### Output

**Interview Feedback Object:**
- **Overall Score**: 0-100
- **Recommendation**: HIRE / CONSIDER / REJECT
- **Category Scores**: Array of 5 scores (0-10 each) with comments
- **Per-Question Scores**: Array of scores (0-10) with individual feedback
- **Summary**: Overall assessment (strong / mixed / weak)
- **Strengths**: Array of positive observations
- **Areas for Improvement**: Array of suggestions for enhancement

---

## Section 3: Engagement Tracking Layer (Interaction Metrics)

### Overview

The Engagement Tracking Layer monitors and records candidate interactions with job postings. This layer tracks views, clicks, and application submissions to measure candidate interest and engagement levels.

### Input Data

**Candidate Actions:**
- Job views: When a candidate views a job detail page
- Job clicks: When a candidate clicks on a job card/listing
- Application submissions: When a candidate applies for a position

**Job Data:**
- Job ID, published date, deadline, status
- Cumulative counters: `viewsCount`, `clicksCount` (stored in Job table)

**Application Data:**
- Application records with status (APPLIED, REVIEWING, SHORTLISTED, INTERVIEW_SCHEDULED, etc.)
- Application history: Timeline of status changes with timestamps

### Tracking Mechanisms

#### 1. Job Views Tracking

**Event Trigger:**
- When candidate navigates to job detail page
- API endpoint: `GET /jobs/:id`

**Process:**
1. **Check User Role**: Verify user has `candidateProfile`
   - Only candidates are tracked (recruiters and admins excluded)
2. **Increment Counter**: Call `incrementViewCount(jobId)`
3. **Database Update**:
   ```sql
   UPDATE Job SET viewsCount = viewsCount + 1 WHERE id = jobId
   ```
4. **Tracking Scope**: 
   - Cumulative count per job (not per candidate per job)
   - Tracks total number of views across all candidates

**Current Implementation:**
- `viewsCount` is a simple integer counter on the Job table
- Incremented atomically using Prisma's `increment` operation
- No per-candidate tracking (if needed, would require separate tracking table)

#### 2. Job Clicks Tracking

**Event Trigger:**
- When candidate clicks on a job card/listing
- API endpoint: `POST /jobs/:id/click`

**Process:**
1. **Check User Role**: Verify user has `candidateProfile`
   - Only candidates are tracked
2. **Increment Counter**: Call `incrementClickCount(jobId)`
3. **Database Update**:
   ```sql
   UPDATE Job SET clicksCount = clicksCount + 1 WHERE id = jobId
   ```
4. **Tracking Scope**:
   - Cumulative count per job
   - Measures click-through from job listings to detail pages

**Current Implementation:**
- `clicksCount` is a simple integer counter on the Job table
- Incremented atomically
- Used to calculate click-through rate (CTR)

#### 3. Application Status Tracking

**Event Trigger:**
- When candidate submits an application
- API endpoint: `POST /applications`

**Process:**
1. **Create Application Record**:
   - `status = "APPLIED"`
   - `applicationDate = current timestamp`
   - Link to candidate and job
2. **Status Change Tracking**:
   - Each status change creates an `ApplicationHistory` record
   - Status flow: `APPLIED → REVIEWING → SHORTLISTED → INTERVIEW_SCHEDULED → INTERVIEWED → OFFER_SENT → OFFER_ACCEPTED/OFFER_REJECTED → HIRED/REJECTED`
3. **History Records**:
   - Each change includes: `status`, `note`, `changedBy`, `createdAt`
   - Provides complete timeline of application progress

**Current Implementation:**
- Application status changes are logged in `ApplicationHistory` table
- Timeline is displayed in candidate's "All Applications" page
- Status changes can be triggered by:
  - Recruiter actions (manual status updates)
  - System automation (e.g., interview completion → INTERVIEWED)

### Metrics Calculation

#### Per-Job Metrics

**Available Metrics:**
1. **Total Views**: `viewsCount` from Job table
   - Cumulative count of all candidate views
2. **Total Clicks**: `clicksCount` from Job table
   - Cumulative count of all candidate clicks
3. **Click-Through Rate (CTR)**:
   - `CTR = (clicksCount / viewsCount) × 100` (if viewsCount > 0)
   - Percentage of views that resulted in clicks
4. **Application Count**: Count of applications for the job
   - `applicationsCount = COUNT(applications WHERE jobId = jobId)`
5. **Application Rate**:
   - `applicationRate = (applicationsCount / viewsCount) × 100` (if viewsCount > 0)
   - Percentage of views that resulted in applications
6. **Conversion Rate**:
   - `conversionRate = (applicationsCount / clicksCount) × 100` (if clicksCount > 0)
   - Percentage of clicks that resulted in applications

#### Per-Candidate Metrics

**Available Metrics:**
1. **Total Views Across Jobs**: Sum of views for all jobs candidate has viewed
   - (Requires tracking per candidate, currently not implemented)
2. **Total Clicks Across Jobs**: Sum of clicks for all jobs candidate has clicked
   - (Requires tracking per candidate, currently not implemented)
3. **Total Applications**: Count of applications submitted by candidate
   - `applicationsCount = COUNT(applications WHERE candidateId = candidateId)`
4. **Application Status Distribution**: Breakdown by status
   - Count of applications in each status (APPLIED, REVIEWING, SHORTLISTED, etc.)
5. **Application Timeline**: For each application, full history of status changes
   - Displayed in candidate's application detail modal
   - Shows: Applied date, Reviewing date, Shortlisted date, Interview scheduled date, etc.

#### Aggregate Metrics

**System-Wide Analytics:**
1. **Most Viewed Jobs**: Jobs with highest `viewsCount`
2. **Most Clicked Jobs**: Jobs with highest `clicksCount`
3. **Highest CTR Jobs**: Jobs with highest click-through rates
4. **Highest Application Rate Jobs**: Jobs with highest application rates
5. **Engagement Trends**: Changes in views/clicks over time
   - (Requires time-series data, currently not implemented)

### Current Limitations

**Not Currently Implemented:**
1. **Per-Candidate View Tracking**: System tracks total views per job, not per candidate per job
   - Cannot determine if one candidate viewed a job multiple times
2. **Engagement Score Calculation**: No formal 0-100 engagement score is calculated
   - Metrics are tracked but not aggregated into a single score
3. **Time-to-Apply Tracking**: System does not track time between first view and application
   - Would require per-candidate view tracking
4. **Unique Viewers Count**: Cannot determine how many unique candidates viewed a job
   - Only total view count is available

**What Is Implemented:**
1. ✅ Job-level view and click counters
2. ✅ Application creation and status tracking
3. ✅ Complete application history timeline
4. ✅ Status change logging
5. ✅ Display of engagement metrics in UI (views, clicks, application status)

### Output

**Engagement Data Available:**
- **Per Job**:
  - `viewsCount`: Total number of views
  - `clicksCount`: Total number of clicks
  - Calculated CTR, application rate, conversion rate (if needed)
- **Per Candidate**:
  - List of applications with current status
  - Complete timeline for each application
  - Application status distribution
- **System-Wide**:
  - Most popular jobs (by views/clicks)
  - Application statistics
  - Job performance metrics

**Use Cases:**
- Recruiters can see which jobs attract the most interest
- Candidates can track their application progress
- System can identify high-performing job postings
- Analytics can inform job posting optimization

---

## Summary

The three-layer scoring system provides comprehensive candidate evaluation:

1. **Matching Score Layer**: Evaluates CV-Job compatibility using weighted factors (Skills 30%, Experience 18%, Title 12%, Education 12%, Soft Skills 12%, Technology 8%, Location 8%)

2. **Interview Feedback Score Layer**: Assesses interview performance using six criteria (Length 15%, Structure 20%, Examples 20%, Confidence 15%, Keyword Match 15%, Relevance 15%) with question-type adjustments

3. **Engagement Tracking Layer**: Monitors candidate interactions (views, clicks, applications) to measure interest and track application progress

Together, these layers provide recruiters with a holistic view of candidate qualifications, interview performance, and engagement levels, enabling data-driven hiring decisions.


