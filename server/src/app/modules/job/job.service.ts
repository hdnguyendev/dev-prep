import type { CreateJobInput } from "./job.schema";

export const JobService = {
  async list() {
    return [
      {
        id: "1",
        title: "Senior Frontend Engineer",
        company: "Acme Corp",
        location: "Remote",
        type: "Remote",
        salary: "$160k–$185k • Equity",
        tags: ["React", "TypeScript", "Design Systems"],
      },
      {
        id: "2",
        title: "Product Designer",
        company: "Nova",
        location: "HCMC",
        type: "Full-time",
        salary: "$2,500–$3,500 • Bonus",
        tags: ["Figma", "UX", "Motion"],
      },
      {
        id: "3",
        title: "Backend Engineer",
        company: "Globex",
        location: "Hanoi",
        type: "Full-time",
        salary: "$1,800–$2,800",
        tags: ["Node.js", "PostgreSQL", "Microservices"],
      },
    ] as Array<CreateJobInput>
  },
};


