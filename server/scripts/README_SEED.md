# Seed Scripts

## seedCompaniesRecruitersJobs.ts

Script này tạo dữ liệu seed cho:
- **10 companies** (công ty IT)
- **10 recruiters** (mỗi công ty 1 recruiter)
- **100 jobs** (mỗi công ty ~10 jobs liên quan đến IT)

### Cách chạy:

```bash
# Từ thư mục server
bun run seed:companies

# Hoặc chạy trực tiếp
bun run scripts/seedCompaniesRecruitersJobs.ts
```

### Dữ liệu được tạo:

#### Companies:
1. TechVenture Solutions - Software Development (HCMC, Vietnam)
2. CloudScale Technologies - Cloud Infrastructure (Hanoi, Vietnam)
3. DataFlow Analytics - Data & AI (Singapore)
4. CodeCraft Studios - Software Development (Da Nang, Vietnam)
5. SecureNet Systems - Cybersecurity (HCMC, Vietnam)
6. MobileFirst Apps - Mobile Development (HCMC, Vietnam)
7. DevOps Pro - DevOps & Infrastructure (Hanoi, Vietnam)
8. BlockChain Labs - Blockchain & Web3 (Singapore)
9. AI Innovations - AI/ML (HCMC, Vietnam)
10. FullStack Dynamics - Software Development (Hanoi, Vietnam)

#### Jobs (10 jobs per company):
- Senior Full Stack Developer
- Backend Engineer (Node.js/Python)
- Frontend Engineer (React/TypeScript)
- DevOps Engineer
- Data Engineer
- Mobile Developer (React Native/Flutter)
- Security Engineer
- Machine Learning Engineer
- Blockchain Developer
- Site Reliability Engineer (SRE)

#### Recruiters:
Mỗi công ty có 1 recruiter với:
- Email: `recruiter@[company-domain]`
- Password mặc định: `password123`
- Role: `RECRUITER`

### Lưu ý:
- Script sử dụng `upsert` nên có thể chạy nhiều lần mà không tạo duplicate
- Skills và categories sẽ được tạo tự động nếu chưa tồn tại
- Tất cả jobs đều có status `PUBLISHED`
- Jobs được gán skills và categories phù hợp

