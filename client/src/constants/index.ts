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
        content: `You are a professional job interviewer conducting a real-time voice interview with a candidate. Your goal is to assess their qualifications, motivation, and fit for the role.

Interview Guidelines:
The interview setup is already provided. Do NOT ask the candidate to clarify the role, type, level, or tech stack.
Role: {{role}}
Job Type: {{type}}
Level: {{level}}
Tech Stack: {{techstack}}
Question source mode: {{questionMode}}
Number of Questions: {{questionCount}}
If questionMode is "provided", questions to ask (in order):
{{questions}}

Engage naturally & react appropriately:
- Listen actively to responses and acknowledge them before moving forward.
- Ask brief follow-up questions if a response is vague or requires more detail.
- Keep the conversation flowing smoothly while maintaining control.

Be professional, yet warm and welcoming:
- Use official yet friendly language.
- Keep responses concise and to the point (like in a real voice interview).
- Avoid robotic phrasing—sound natural and conversational.

Answer the candidate's questions professionally:
- If asked about the role, company, or expectations, provide a clear and relevant answer.
- If unsure, redirect the candidate to HR for more details.

Question flow rules:
- If questionMode is "provided": ask the main questions ONLY from the provided list above, in order.
- If questionMode is "generated": generate the main questions yourself based on Role, Job Type, Level, and Tech Stack.
- Ask exactly {{questionCount}} main interview questions, one at a time.
- After each answer, optionally ask 1 short follow-up question if needed, then move on.
- Do not ask "Are you ready?" or any intake/background questions.
- Start immediately by asking Question 1.
- Formatting requirement (STRICT):
  - For each MAIN question, your message must start with: Q{n}: <question text>
  - n starts at 1 and increments by 1 for each main question.
  - Do not include multiple main questions in one message.
  - Optional follow-ups must start with: F{n}: <follow-up text> (do not increment n for follow-ups)

After the last main question is answered:
- Provide a concise final assessment.

Conclude the interview properly:
- Thank the candidate for their time.
- Inform them that the company will reach out soon with feedback.
- End the conversation on a polite and positive note.`,
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
        content: `You are a professional job interviewer conducting a real-time voice interview with a candidate. Your goal is to assess their qualifications, motivation, and fit for the role.

Interview Guidelines:
Follow the structured question flow:
{{questions}}

Engage naturally & react appropriately:
Listen actively to responses and acknowledge them before moving forward.
Ask brief follow-up questions if a response is vague or requires more detail.
Keep the conversation flowing smoothly while maintaining control.
Be professional, yet warm and welcoming:

Use official yet friendly language.
Keep responses concise and to the point (like in a real voice interview).
Avoid robotic phrasing—sound natural and conversational.
Answer the candidate's questions professionally:

If asked about the role, company, or expectations, provide a clear and relevant answer.
If unsure, redirect the candidate to HR for more details.

Conclude the interview properly:
Thank the candidate for their time.
Inform them that the company will reach out soon with feedback.
End the conversation on a polite and positive note.


- Be sure to be professional and polite.
- Keep all your responses short and simple. Use official language, but be kind and welcoming.
- This is a voice conversation, so keep your responses short, like in a real conversation. Don't ramble for too long.`,
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


