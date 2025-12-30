# DevPrep - Quick Pitch (5-minute version)

## Opening (30 seconds)

Good morning/afternoon. I'm presenting **DevPrep**, an AI-powered job application platform that revolutionizes recruitment through intelligent voice interviews and streamlined application workflows.

---

## The Problem (30 seconds)

Traditional recruitment is time-consuming and inconsistent:
- Recruiters spend 70% of time on initial candidate screening
- Inconsistent evaluation across different interviewers
- Limited scalability during high-volume hiring periods
- Candidates face scheduling conflicts and long wait times

---

## The Solution: AI Interview System (2 minutes)

### How It Works

**For Candidates:**
1. Apply for a job → Upload resume → Submit application
2. Receive email with unique **8-character access code**
3. Enter code → Start **real-time AI voice interview** at their convenience
4. Natural conversation with AI interviewer (GPT-4 powered)
5. Receive **instant feedback** with scores and recommendations

**For Recruiters:**
1. Review applications in dashboard
2. Click "Schedule Interview" → System automatically:
   - Generates access code
   - Creates interview session
   - Sends email to candidate
3. Candidate completes interview
4. **AI analyzes transcript** (Google Gemini) → Generates:
   - Overall score (0-100)
   - Per-question feedback
   - Hiring recommendation
5. Recruiter reviews analysis → Makes informed decision

### Key Technologies
- **Vapi.ai**: Real-time voice conversation
- **GPT-4**: Natural interviewer responses
- **Google Gemini**: Transcript analysis & scoring
- **Deepgram**: Speech-to-text transcription
- **11Labs**: Natural voice synthesis

### Benefits
✅ **70% time savings** for recruiters  
✅ **24/7 availability** for candidates  
✅ **Consistent evaluation** across all candidates  
✅ **Scalable** to handle unlimited concurrent interviews  
✅ **Objective assessment** reduces bias  

---

## Application Workflow (1 minute)

### Seamless Process

**Candidate Side:**
- Browse jobs with advanced filters
- One-click application with resume upload
- Real-time status tracking
- Interview access via email code
- View feedback and scores

**Recruiter Side:**
- Application dashboard with filtering
- Automated interview scheduling
- AI-powered candidate analysis
- Status pipeline management
- Offer management system

### Status Pipeline
APPLIED → SCREENING → INTERVIEW_SCHEDULED → INTERVIEWED → SHORTLISTED → OFFER_SENT → OFFER_ACCEPTED

---

## Technical Highlights (30 seconds)

- **Full-stack TypeScript** with end-to-end type safety
- **Serverless architecture** (Cloudflare Workers + Pages)
- **PostgreSQL** with Prisma ORM
- **Real-time AI integration** with multiple providers
- **Secure authentication** via Clerk
- **Scalable file storage** (Cloudflare R2)

---

## Impact & Results (30 seconds)

- **Scalability**: Handle 1000+ concurrent interviews
- **Efficiency**: 70% reduction in recruiter screening time
- **Consistency**: Standardized evaluation criteria
- **Accessibility**: 24/7 interview availability
- **Cost-effective**: Serverless architecture reduces infrastructure costs

---

## Conclusion (30 seconds)

DevPrep demonstrates practical AI application in solving real recruitment challenges. By combining **intelligent voice interviews** with **streamlined workflows**, we create value for candidates, recruiters, and companies.

The platform is production-ready, deployed on Cloudflare, and ready to transform how companies hire talent.

**Thank you. Questions?**

---

## Key Talking Points (If Asked)

**Q: AI Accuracy?**  
A: Uses Google Gemini 2.5 with structured evaluation. AI is a screening tool; human recruiters make final decisions.

**Q: Privacy?**  
A: Encrypted data, unique access codes, time-limited sessions, GDPR-compliant.

**Q: Cost?**  
A: Serverless = pay-per-use. ~$50-100/month for 100 interviews.

**Q: Customization?**  
A: Recruiters set custom questions, interview type, level, and tech stack focus.

---

*Total: ~5 minutes*




