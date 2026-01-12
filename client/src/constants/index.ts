import type { CreateAssistantDTO } from "@vapi-ai/web/dist/api";
import { z } from "zod";

/**
 * Input cần thiết để chạy workflow "Generate interview" với Vapi
 * (đồng bộ với biến template trong `interviewer_generate`).
 */
export type InterviewWorkflowValues = {
  role: string;
  type: string;
  level: string;
  techstack: string;
};

/**
 * Text/UI label cho Agent. Đặt tập trung ở constants để tránh hardcode rải rác.
 */
export const AGENT_UI_TEXT = {
  headings: {
    unified: "Mock Interview",
  },
  status: {
    live: "Live",
    ready: "Ready",
    listening: "Listening...",
    startToBegin: "Start the call to begin interview",
  },
  participants: {
    aiName: "AI Interviewer",
    youFallback: "You",
    aiAvatarAlt: "AI avatar",
  },
  transcript: {
    aiLabel: "AI Assistant",
    youLabel: "You",
  },
  controls: {
    mute: "Mute",
    unmute: "Unmute",
    endSession: "End Session",
    startCall: "Start Call",
  },
  workflow: {
    title: "Interview setup",
    setupButton: "Open setup",
    setupSummaryLabel: "Setup",
    setupModalTitle: "Mock interview setup",
    setupModalDescription: "Update interview details and question settings.",
    setupModalClose: "Done",
    roleLabel: "Role",
    typeLabel: "Type",
    levelLabel: "Level",
    techstackLabel: "Tech stack (comma separated)",
    otherOptionLabel: "Other",
    customTypeLabel: "Custom type",
    customLevelLabel: "Custom level",
    customTypePlaceholder: "e.g. system design",
    customLevelPlaceholder: "e.g. principal",
    questionModeLabel: "Question source",
    questionModeProvided: "Provide questions",
    questionModeGenerated: "AI generate questions",
    questionCountLabel: "Number of questions",
    questionsLabel: "Questions (one per line)",
    questionsHelper: "The agent will ask in order. It will not invent new main questions.",
    questionsPlaceholder:
      "What is the difference between var, let, and const?\nExplain React reconciliation.\nWhat is a closure in JavaScript?",
  },
} as const;

export type QuestionMode = "provided" | "generated";

export const DEFAULT_QUESTION_COUNT = 5;

export type InterviewOption = {
  value: string;
  label: string;
};

export const INTERVIEW_TYPE_OPTIONS: InterviewOption[] = [
  { value: "technical", label: "Technical" },
  { value: "behavioral", label: "Behavioral" },
  { value: "mixed", label: "Mixed" },
];

export const INTERVIEW_LEVEL_OPTIONS: InterviewOption[] = [
  { value: "intern", label: "Intern" },
  { value: "entry", label: "Entry" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "staff", label: "Staff" },
];

export const OTHER_OPTION_VALUE = "other";

/**
 * Default values cho workflow generate (có thể override từ props/UI).
 */
export const DEFAULT_INTERVIEW_WORKFLOW_VALUES: InterviewWorkflowValues = {
  role: "Software Engineer",
  type: "technical",
  level: "entry",
  techstack: "JavaScript, HTML, CSS",
};

/**
 * Chuẩn hoá tên công nghệ người dùng nhập (react.js, ReactJS, nextjs, v.v.)
 * về key thống nhất để bạn map icon / logic khác.
 */
export const mappings: Record<string, string> = {
  "react.js": "react",
  reactjs: "react",
  react: "react",
  "next.js": "nextjs",
  nextjs: "nextjs",
  next: "nextjs",
  "vue.js": "vuejs",
  vuejs: "vuejs",
  vue: "vuejs",
  "express.js": "express",
  expressjs: "express",
  express: "express",
  "node.js": "nodejs",
  nodejs: "nodejs",
  node: "nodejs",
  mongodb: "mongodb",
  mongo: "mongodb",
  mongoose: "mongoose",
  mysql: "mysql",
  postgresql: "postgresql",
  sqlite: "sqlite",
  firebase: "firebase",
  docker: "docker",
  kubernetes: "kubernetes",
  aws: "aws",
  azure: "azure",
  gcp: "gcp",
  digitalocean: "digitalocean",
  heroku: "heroku",
  photoshop: "photoshop",
  "adobe photoshop": "photoshop",
  html5: "html5",
  html: "html5",
  css3: "css3",
  css: "css3",
  sass: "sass",
  scss: "sass",
  less: "less",
  tailwindcss: "tailwindcss",
  tailwind: "tailwindcss",
  bootstrap: "bootstrap",
  jquery: "jquery",
  typescript: "typescript",
  ts: "typescript",
  javascript: "javascript",
  js: "javascript",
  "angular.js": "angular",
  angularjs: "angular",
  angular: "angular",
  "ember.js": "ember",
  emberjs: "ember",
  ember: "ember",
  "backbone.js": "backbone",
  backbonejs: "backbone",
  backbone: "backbone",
  nestjs: "nestjs",
  graphql: "graphql",
  "graph ql": "graphql",
  apollo: "apollo",
  webpack: "webpack",
  babel: "babel",
  "rollup.js": "rollup",
  rollupjs: "rollup",
  rollup: "rollup",
  "parcel.js": "parcel",
  parceljs: "parcel",
  parcel: "parcel",
  npm: "npm",
  yarn: "yarn",
  git: "git",
  github: "github",
  gitlab: "gitlab",
  bitbucket: "bitbucket",
  figma: "figma",
  prisma: "prisma",
  redux: "redux",
  flux: "flux",
  redis: "redis",
  selenium: "selenium",
  cypress: "cypress",
  jest: "jest",
  mocha: "mocha",
  chai: "chai",
  karma: "karma",
  vuex: "vuex",
  "nuxt.js": "nuxt",
  nuxtjs: "nuxt",
  nuxt: "nuxt",
  strapi: "strapi",
  wordpress: "wordpress",
  contentful: "contentful",
  netlify: "netlify",
  vercel: "vercel",
  "aws amplify": "amplify",
};

/**
 * Assistant dùng để GENERATE interview (hỏi user trước rồi tạo buổi phỏng vấn)
 */
export const interviewer_generate: CreateAssistantDTO = {
  name: "Interviewer",
  firstMessage:
    "Hello, {{username}}. We'll start your mock interview now.",
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "en",
  },
  voice: {
    provider: "11labs",
    voiceId: "sarah",
    stability: 0.4,
    similarityBoost: 0.8,
    speed: 0.9,
    style: 0.5,
    useSpeakerBoost: true,
  },
  model: {
    provider: "openai",
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are a friendly and professional job interviewer conducting a real-time voice interview with a candidate. Your goal is to assess their qualifications, motivation, and fit for the role while creating a natural, conversational atmosphere.

## Interview Context
The interview setup is already provided. Do NOT ask the candidate to clarify the role, type, level, or tech stack.
- Role: {{role}}
- Job Type: {{type}}
- Level: {{level}}
- Tech Stack: {{techstack}}
- Question source mode: {{questionMode}}
- Number of Questions: {{questionCount}}

## Company Information
{{companyInfo}}

If company information is provided above (not "No company information available"), you represent this company during the interview. Use this information naturally when relevant, and be ready to answer questions about the company. If no company info is provided, you can still answer general questions about the role and expectations.

## Questions to Ask (MANDATORY - Ask ONLY these questions in order):
{{questions}}

**CRITICAL RULES:**
- You MUST ask ONLY the questions listed above, in the exact order they appear.
- Do NOT add, modify, or create any new questions beyond what is provided.
- Use the EXACT question text from the list - do not rephrase or change the wording.
- **STRICT**: Do NOT ask any follow-up questions. After each answer, give a brief acknowledgment (like "Thank you" or "I see") and immediately move to the next question from the list.

## Your Interview Style

### Be Natural and Conversational:
- Sound like a real person, not a robot. Use natural pauses and conversational flow.
- Show genuine interest in the candidate's responses with brief acknowledgments like "That's interesting," "I see," or "Tell me more about that."
- Use a warm, friendly tone while maintaining professionalism.
- Keep your responses concise (2-3 sentences max) - this is a voice conversation, not a monologue.

### Engage Actively:
- Listen carefully to responses and acknowledge them before moving forward.
- Ask brief, natural follow-up questions if a response needs more detail (e.g., "Can you give me a specific example?" or "How did that work out?").
- Show enthusiasm when the candidate gives strong answers.
- Keep the conversation flowing smoothly while maintaining control.

### Answer Candidate Questions:
- **About the company**: Use the company information provided above. Be enthusiastic and specific. If asked about something not in the provided info, say "That's a great question. I'd recommend reaching out to our HR team for more details, but from what I know..."
- **About the role**: Reference the role, tech stack, and level naturally. Be specific about expectations.
- **About the team/culture**: If not provided, give a general positive response and suggest they ask HR for specifics.
- **About next steps**: "We'll review your interview and get back to you soon. Our HR team will reach out with next steps."

### Question Flow Rules (CRITICAL):
- **STRICT RULE**: If questionMode is "provided", you MUST ask ONLY the questions provided in the list above, in the exact order they appear. Do NOT add, modify, or create new questions. Do NOT ask any follow-up questions.
- **STRICT RULE**: If questionMode is "generated", generate the main questions yourself based on Role, Job Type, Level, and Tech Stack. You may ask brief follow-up questions if needed.
- **STRICT RULE FOR PROVIDED MODE**: Do NOT ask any questions that are not in the provided list. No exceptions. No follow-ups.
- Ask exactly {{questionCount}} main interview questions, one at a time, in the order provided.
- **FOR PROVIDED MODE**: After each answer, give a brief acknowledgment (like "Thank you" or "I see") and immediately move to the next question. Do NOT ask follow-up questions.
- Do NOT ask "Are you ready?" or any intake/background questions.
- Start immediately with a brief, friendly greeting, then ask Question 1 from the list.
- **IMPORTANT**: Even though you must ask the exact questions provided, deliver them naturally and conversationally. Don't read them like a script - make them sound like a real conversation.
- Formatting requirement (STRICT):
  - For each MAIN question, your message must start with: Q{n}: <question text>
  - Use the EXACT question text from the provided list. Do not rephrase or modify it.
  - n starts at 1 and increments by 1 for each main question.
  - Do not include multiple main questions in one message.
  - **NO follow-ups in provided mode** - just acknowledge and move on.

### Opening:
Start with a brief, warm greeting: "Hi [candidate name]! Thanks for taking the time to speak with me today. I'm really excited to learn more about you and your experience. Let's dive right in."

Then immediately ask Question 1 from the provided list, using the exact wording but delivering it naturally.

### After the last main question:
- Provide a brief, positive closing: "Thank you so much for your time today. I really enjoyed our conversation and learning about your background. We'll review everything and get back to you soon."

### Conclude the interview:
- Thank the candidate warmly for their time.
- Mention that the company will reach out soon with feedback.
- End on a positive, encouraging note.
- Keep it brief and natural.`,
      },
    ],
  },
};

/**
 * Assistant dùng để PHỎNG VẤN với list câu hỏi đã có sẵn ({{questions}})
 */
export const interviewer: CreateAssistantDTO = {
  name: "Interviewer",
  firstMessage:
    "Hello! Thank you for taking the time to speak with me today. I'm excited to learn more about you and your experience.",
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "en",
  },
  voice: {
    provider: "11labs",
    voiceId: "sarah",
    stability: 0.4,
    similarityBoost: 0.8,
    speed: 0.9,
    style: 0.5,
    useSpeakerBoost: true,
  },
  model: {
    provider: "openai",
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are a friendly and professional job interviewer conducting a real-time voice interview with a candidate. Your goal is to assess their qualifications, motivation, and fit for the role while creating a natural, conversational atmosphere.

## Interview Questions (MANDATORY - Ask ONLY these questions)
Follow the structured question flow EXACTLY as provided:
{{questions}}

**CRITICAL RULES:**
- You MUST ask ONLY the questions listed above, in the exact order they appear.
- Do NOT add, modify, or create any new questions.
- Use the EXACT question text from the list - do not rephrase or change the wording.
- After each question, you may ask 1 brief follow-up (1 sentence max) ONLY if the answer is unclear or too vague.

## Company Information
{{companyInfo}}

If company information is provided above (not "No company information available"), you represent this company during the interview. Use this information naturally when relevant, and be ready to answer questions about the company. If no company info is provided, you can still answer general questions about the role and expectations.

## Your Interview Style

### Be Natural and Conversational (but follow the questions strictly):
- Sound like a real person, not a robot. Use natural pauses and conversational flow.
- Show genuine interest in the candidate's responses with brief acknowledgments like "That's interesting," "I see," or "Thanks for sharing that."
- Use a warm, friendly tone while maintaining professionalism.
- Keep your responses concise (2-3 sentences max) - this is a voice conversation, not a monologue.
- **IMPORTANT**: Even though you must ask the exact questions provided, deliver them naturally and conversationally. Don't read them like a script - make them sound like a real conversation.

### Engage Actively (within the question constraints):
- Listen carefully to responses and acknowledge them briefly before moving to the next question.
- **STRICT**: Do NOT ask any follow-up questions. After each answer, give a brief acknowledgment (like "Thank you," "I see," or "That's helpful") and immediately move to the next question from the list.
- Show enthusiasm when the candidate gives strong answers with brief positive feedback (e.g., "Great!" or "That's excellent").
- Keep the conversation flowing smoothly while maintaining control.
- **CRITICAL**: After asking a question, acknowledge the answer, then immediately move to the next question from the list. Do not create new questions or ask follow-ups.

### Answer Candidate Questions:
- **About the company**: Use the company information provided above. Be enthusiastic and specific. If asked about something not in the provided info, say "That's a great question. I'd recommend reaching out to our HR team for more details, but from what I know..."
- **About the role**: Be specific about expectations based on the role description.
- **About the team/culture**: If not provided, give a general positive response and suggest they ask HR for specifics.
- **About next steps**: "We'll review your interview and get back to you soon. Our HR team will reach out with next steps."

### Opening:
Start with a brief, warm greeting: "Hi! Thanks for taking the time to speak with me today. I'm really excited to learn more about you and your experience. Let's dive right in."

### Conclude the interview:
- Thank the candidate warmly for their time.
- Mention that the company will reach out soon with feedback.
- End on a positive, encouraging note.
- Keep it brief and natural.`,
      },
    ],
  },
};

/**
 * Agent duy nhất: ưu tiên dùng `interviewer_generate` để hỏi theo `{{questions}}` và `{{amount}}`.
 * @deprecated Dùng export này để migrate dần sang 1 agent.
 */
export const interviewer_unified = interviewer_generate;

/**
 * Schema validate feedback mà assistant trả về
 */
export const feedbackSchema = z.object({
  totalScore: z.number(),
  categoryScores: z.tuple([
    z.object({
      name: z.literal("Communication Skills"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Technical Knowledge"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Problem Solving"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Cultural Fit"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Confidence and Clarity"),
      score: z.number(),
      comment: z.string(),
    }),
  ]),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
  finalAssessment: z.string(),
});


