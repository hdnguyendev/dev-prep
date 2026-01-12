# Screen Descriptions - All Actors

## Guest Actor

| Screen Name | Description | Flow |
|------------|-------------|------|
| **Home** | Landing page with featured jobs, companies, and platform overview | Flow 1, 2, 3, 4, 5 |
| **Jobs List** | Browse and search all available job postings with filters | Flow 1, 2 |
| **Job Detail** | View detailed job information including requirements, benefits, and company info | Flow 1 |
| **Login** | Candidate authentication page using Clerk for login/sign up | Flow 1, 3, 4, 5 |
| **Companies List** | Browse and search all registered companies | Flow 2 |
| **Company Detail** | View company profile including description, team, culture, and job listings | Flow 2 |
| **Pricing** | View membership plans and pricing information | Flow 3 |
| **Register** | Recruiter registration page for new company accounts | Flow 4 |

---

## Candidate Actor

| Screen Name | Description | Flow |
|------------|-------------|------|
| **Entry Point** | Initial entry point to the candidate system | Entry Flow |
| **Login** | Candidate authentication using Clerk (email, social login) | Entry Flow |
| **Dashboard** | Candidate dashboard showing overview, stats, quick actions, and recommendations | All Flows |
| **Recommended Jobs** | AI-powered job recommendations based on candidate profile and preferences | Flow 1: Find & Apply for Jobs |
| **Job Detail** | View detailed job information and apply for the position | Flow 1, Flow 4 |
| **Applications** | List of all job applications with status tracking (Applied, Reviewing, Shortlisted, etc.) | Flow 1, Flow 2: Manage Applications |
| **Interviews** | List of scheduled and completed interviews with AI interview access | Flow 2: Manage Applications |
| **Profile** | Edit candidate profile including personal info, skills, experience, education, and resume | Flow 3: Manage Profile |
| **Saved Jobs** | List of bookmarked/saved jobs for later application | Flow 4: View Saved Jobs |
| **Followed Companies** | List of companies the candidate is following for updates | Flow 5: View Followed Companies |
| **Company Detail** | View company profile and their job listings | Flow 5 |
| **Jobs List** | Browse jobs from a specific company | Flow 5 |
| **Membership** | View and manage membership plans, subscription status, and benefits | Flow 6: Manage Membership |

---

## Recruiter Actor

| Screen Name | Description | Flow |
|------------|-------------|------|
| **Entry Point** | Initial entry point to the recruiter system | Entry Flow |
| **Staff Login** | Staff authentication page for Admin and Recruiter login | Entry Flow |
| **Dashboard** | Recruiter dashboard showing job statistics, recent applications, and company overview | All Flows |
| **Jobs** | List and manage all job postings created by the recruiter with status, search, and filters | Flow 1: Manage Jobs |
| **New Job** | Create a new job posting with title, description, requirements, salary, and skills | Flow 1: Manage Jobs |
| **Job Detail** | View and manage individual job posting details, status, and statistics | Flow 1: Manage Jobs |
| **Edit Job** | Edit existing job posting information and requirements | Flow 1: Manage Jobs |
| **Job Applications** | View all applications for a specific job with candidate information and status | Flow 1: Manage Jobs |
| **Applications** | List of all applications across all jobs with filters and search | Flow 2: Manage Applications |
| **Company** | Manage company profile including logo, description, team, culture, and verification status | Flow 3: Manage Company |
| **Candidates** | Browse and search candidate directory with filters to find candidates by skills, experience, or location | Flow 4: View Candidates |
| **Candidate Profile** | View candidate public profile including resume, skills, experience, education, and application history | Flow 4: View Candidates |
| **Membership** | View and manage membership plans, subscription status, and company benefits | Flow 5: Manage Membership |

---

## Admin Actor

| Screen Name | Description | Flow |
|------------|-------------|------|
| **Entry Point** | Initial entry point to the admin system | Entry Flow |
| **Staff Login** | Staff authentication page for Admin and Recruiter login | Entry Flow |
| **Dashboard** | Admin dashboard showing platform overview, statistics, and resource management options | All Flows |
| **Users** | List and manage all users (Candidates, Recruiters, Admins) with search, filter, and CRUD operations | Flow 1: Manage Users |
| **User Detail** | View and edit individual user details including profile, role, verification status | Flow 1: Manage Users |
| **Companies** | List and manage all companies with verification status, search, filter, and CRUD operations | Flow 2: Manage Companies |
| **Company Detail** | View and edit company details, verify or unverify companies, manage company information | Flow 2: Manage Companies |
| **Jobs** | List and manage all job postings with status, search, filter, and CRUD operations | Flow 3: Manage Jobs |
| **Job Detail** | View and edit job details including title, description, requirements, status, and salary | Flow 3: Manage Jobs |
| **Applications** | List and manage all job applications with status, search, filter, and CRUD operations | Flow 4: Manage Applications |
| **Application Detail** | View and edit application details including resume, cover letter, status, and candidate information | Flow 4: Manage Applications |
| **Interviews** | List and manage all interviews (AI Video, AI Voice, AI Chat, Coding Test) with status and search | Flow 5: Manage Interviews |
| **Interview Detail** | View interview details including type, status, access code, recording, transcript, and AI analysis | Flow 5: Manage Interviews |
| **Skills** | Manage job skills with name and icon, create, edit, and delete skills used in job postings | Flow 6: Manage Skills & Categories |
| **Categories** | Manage job categories with name and icon, create, edit, and delete categories for job classification | Flow 6: Manage Skills & Categories |
| **Candidates** | Browse and search candidate directory with filters to find candidates by skills, experience, or location | Flow 7: View Candidates |
| **Candidate Profile** | View candidate public profile including resume, skills, experience, education, and application history | Flow 7: View Candidates |

---

## Flow Summary by Actor

### Guest Flows
- **Flow 1: Browse Jobs & Apply**: Home → Jobs List → Job Detail → Login
- **Flow 2: Browse Companies**: Home → Companies List → Company Detail → Jobs List
- **Flow 3: View Pricing & Subscribe**: Home → Pricing → Login
- **Flow 4: Register as Recruiter**: Home → Register → Login
- **Flow 5: Direct Login**: Home → Login

### Candidate Flows
- **Entry Flow**: Entry Point → Login → Dashboard
- **Flow 1: Find & Apply for Jobs**: Dashboard → Recommended Jobs → Job Detail → Applications
- **Flow 2: Manage Applications**: Dashboard → Applications → Interviews
- **Flow 3: Manage Profile**: Dashboard → Profile
- **Flow 4: View Saved Jobs**: Dashboard → Saved Jobs → Job Detail
- **Flow 5: View Followed Companies**: Dashboard → Followed Companies → Company Detail → Jobs List
- **Flow 6: Manage Membership**: Dashboard → Membership

### Recruiter Flows
- **Entry Flow**: Entry Point → Staff Login → Dashboard
- **Flow 1: Manage Jobs**: Dashboard → Jobs → (New Job / Job Detail) → (Edit Job / Job Applications)
- **Flow 2: Manage Applications**: Dashboard → Applications
- **Flow 3: Manage Company**: Dashboard → Company
- **Flow 4: View Candidates**: Dashboard → Candidates → Candidate Profile
- **Flow 5: Manage Membership**: Dashboard → Membership

### Admin Flows
- **Entry Flow**: Entry Point → Staff Login → Dashboard
- **Flow 1: Manage Users**: Dashboard → Users → User Detail
- **Flow 2: Manage Companies**: Dashboard → Companies → Company Detail
- **Flow 3: Manage Jobs**: Dashboard → Jobs → Job Detail
- **Flow 4: Manage Applications**: Dashboard → Applications → Application Detail
- **Flow 5: Manage Interviews**: Dashboard → Interviews → Interview Detail
- **Flow 6: Manage Skills & Categories**: Dashboard → Skills / Categories
- **Flow 7: View Candidates**: Dashboard → Candidates → Candidate Profile


