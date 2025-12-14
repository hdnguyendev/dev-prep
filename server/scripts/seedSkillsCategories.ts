import prisma from "../src/app/db/prisma";

async function seedSkillsAndCategories() {
  console.log("🌱 Seeding Skills and Categories...");

  try {
    // Check if already seeded
    const existingCategories = await prisma.category.count();
    const existingSkills = await prisma.skill.count();
    
    if (existingCategories > 0 || existingSkills > 0) {
      console.log(`\n⚠️  Data already exists: ${existingCategories} categories, ${existingSkills} skills`);
      console.log("✅ Skipping seed. Database already populated!");
      return;
    }

    // ============= CATEGORIES =============
    console.log("\n📁 Creating Categories...");
    
    const categories = await Promise.all([
      prisma.category.create({
        data: {
          name: "Full Stack Development",
          iconUrl: "https://cdn-icons-png.flaticon.com/512/1005/1005141.png",
        },
      }),
      prisma.category.create({
        data: {
          name: "Frontend Development",
          iconUrl: "https://cdn-icons-png.flaticon.com/512/1005/1005141.png",
        },
      }),
      prisma.category.create({
        data: {
          name: "Backend Development",
          iconUrl: "https://cdn-icons-png.flaticon.com/512/2103/2103658.png",
        },
      }),
      prisma.category.create({
        data: {
          name: "Mobile Development",
          iconUrl: "https://cdn-icons-png.flaticon.com/512/4882/4882727.png",
        },
      }),
      prisma.category.create({
        data: {
          name: "DevOps & Cloud",
          iconUrl: "https://cdn-icons-png.flaticon.com/512/2103/2103832.png",
        },
      }),
      prisma.category.create({
        data: {
          name: "Data Science & ML",
          iconUrl: "https://cdn-icons-png.flaticon.com/512/2103/2103665.png",
        },
      }),
      prisma.category.create({
        data: {
          name: "UI/UX Design",
          iconUrl: "https://cdn-icons-png.flaticon.com/512/3959/3959542.png",
        },
      }),
      prisma.category.create({
        data: {
          name: "QA & Testing",
          iconUrl: "https://cdn-icons-png.flaticon.com/512/2103/2103832.png",
        },
      }),
      prisma.category.create({
        data: {
          name: "Security",
          iconUrl: "https://cdn-icons-png.flaticon.com/512/2092/2092662.png",
        },
      }),
      prisma.category.create({
        data: {
          name: "Database Administration",
          iconUrl: "https://cdn-icons-png.flaticon.com/512/2103/2103665.png",
        },
      }),
      prisma.category.create({
        data: {
          name: "Project Management",
          iconUrl: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        },
      }),
      prisma.category.create({
        data: {
          name: "Product Management",
          iconUrl: "https://cdn-icons-png.flaticon.com/512/3135/3135810.png",
        },
      }),
    ]);

    console.log(`✅ Created ${categories.length} categories`);

    // ============= SKILLS =============
    console.log("\n🛠️  Creating Skills...");

    const skills = await Promise.all([
      // Programming Languages
      prisma.skill.create({ data: { name: "JavaScript", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" } }),
      prisma.skill.create({ data: { name: "TypeScript", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" } }),
      prisma.skill.create({ data: { name: "Python", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" } }),
      prisma.skill.create({ data: { name: "Java", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg" } }),
      prisma.skill.create({ data: { name: "C#", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg" } }),
      prisma.skill.create({ data: { name: "Go", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg" } }),
      prisma.skill.create({ data: { name: "Rust", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/rust/rust-plain.svg" } }),
      prisma.skill.create({ data: { name: "PHP", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg" } }),
      prisma.skill.create({ data: { name: "Ruby", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-original.svg" } }),
      prisma.skill.create({ data: { name: "Swift", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/swift/swift-original.svg" } }),
      prisma.skill.create({ data: { name: "Kotlin", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg" } }),
      prisma.skill.create({ data: { name: "Dart", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dart/dart-original.svg" } }),

      // Frontend Frameworks & Libraries
      prisma.skill.create({ data: { name: "React", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" } }),
      prisma.skill.create({ data: { name: "Vue.js", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg" } }),
      prisma.skill.create({ data: { name: "Angular", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angularjs/angularjs-original.svg" } }),
      prisma.skill.create({ data: { name: "Next.js", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg" } }),
      prisma.skill.create({ data: { name: "Svelte", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/svelte/svelte-original.svg" } }),
      prisma.skill.create({ data: { name: "HTML5", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg" } }),
      prisma.skill.create({ data: { name: "CSS3", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg" } }),
      prisma.skill.create({ data: { name: "Tailwind CSS", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-plain.svg" } }),
      prisma.skill.create({ data: { name: "Bootstrap", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/bootstrap/bootstrap-original.svg" } }),
      prisma.skill.create({ data: { name: "Material-UI", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/materialui/materialui-original.svg" } }),

      // Backend Frameworks
      prisma.skill.create({ data: { name: "Node.js", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" } }),
      prisma.skill.create({ data: { name: "Express.js", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg" } }),
      prisma.skill.create({ data: { name: "NestJS", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nestjs/nestjs-plain.svg" } }),
      prisma.skill.create({ data: { name: "Django", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/django/django-plain.svg" } }),
      prisma.skill.create({ data: { name: "Flask", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flask/flask-original.svg" } }),
      prisma.skill.create({ data: { name: "FastAPI", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg" } }),
      prisma.skill.create({ data: { name: "Spring Boot", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg" } }),
      prisma.skill.create({ data: { name: "Ruby on Rails", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/rails/rails-plain.svg" } }),
      prisma.skill.create({ data: { name: "Laravel", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/laravel/laravel-plain.svg" } }),
      prisma.skill.create({ data: { name: ".NET Core", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dotnetcore/dotnetcore-original.svg" } }),

      // Databases
      prisma.skill.create({ data: { name: "PostgreSQL", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg" } }),
      prisma.skill.create({ data: { name: "MySQL", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg" } }),
      prisma.skill.create({ data: { name: "MongoDB", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg" } }),
      prisma.skill.create({ data: { name: "Redis", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg" } }),
      prisma.skill.create({ data: { name: "Elasticsearch", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/elasticsearch/elasticsearch-original.svg" } }),
      prisma.skill.create({ data: { name: "SQLite", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sqlite/sqlite-original.svg" } }),
      prisma.skill.create({ data: { name: "Oracle", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/oracle/oracle-original.svg" } }),

      // Cloud & DevOps
      prisma.skill.create({ data: { name: "AWS", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original.svg" } }),
      prisma.skill.create({ data: { name: "Azure", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg" } }),
      prisma.skill.create({ data: { name: "Google Cloud", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-original.svg" } }),
      prisma.skill.create({ data: { name: "Docker", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg" } }),
      prisma.skill.create({ data: { name: "Kubernetes", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kubernetes/kubernetes-plain.svg" } }),
      prisma.skill.create({ data: { name: "Jenkins", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jenkins/jenkins-original.svg" } }),
      prisma.skill.create({ data: { name: "GitLab CI/CD", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/gitlab/gitlab-original.svg" } }),
      prisma.skill.create({ data: { name: "GitHub Actions", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg" } }),
      prisma.skill.create({ data: { name: "Terraform", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/terraform/terraform-original.svg" } }),
      prisma.skill.create({ data: { name: "Ansible", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ansible/ansible-original.svg" } }),

      // Mobile Development
      prisma.skill.create({ data: { name: "React Native", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" } }),
      prisma.skill.create({ data: { name: "Flutter", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flutter/flutter-original.svg" } }),
      prisma.skill.create({ data: { name: "iOS Development", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/apple/apple-original.svg" } }),
      prisma.skill.create({ data: { name: "Android Development", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/android/android-original.svg" } }),

      // Data Science & ML
      prisma.skill.create({ data: { name: "TensorFlow", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg" } }),
      prisma.skill.create({ data: { name: "PyTorch", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pytorch/pytorch-original.svg" } }),
      prisma.skill.create({ data: { name: "Pandas", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pandas/pandas-original.svg" } }),
      prisma.skill.create({ data: { name: "NumPy", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/numpy/numpy-original.svg" } }),
      prisma.skill.create({ data: { name: "Scikit-learn", iconUrl: "https://cdn-icons-png.flaticon.com/512/2103/2103665.png" } }),

      // Tools & Version Control
      prisma.skill.create({ data: { name: "Git", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg" } }),
      prisma.skill.create({ data: { name: "GitHub", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg" } }),
      prisma.skill.create({ data: { name: "GitLab", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/gitlab/gitlab-original.svg" } }),
      prisma.skill.create({ data: { name: "Bitbucket", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/bitbucket/bitbucket-original.svg" } }),
      prisma.skill.create({ data: { name: "Jira", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jira/jira-original.svg" } }),
      prisma.skill.create({ data: { name: "Confluence", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/confluence/confluence-original.svg" } }),

      // Design & UI/UX
      prisma.skill.create({ data: { name: "Figma", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg" } }),
      prisma.skill.create({ data: { name: "Adobe XD", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/xd/xd-plain.svg" } }),
      prisma.skill.create({ data: { name: "Sketch", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sketch/sketch-original.svg" } }),
      prisma.skill.create({ data: { name: "Photoshop", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/photoshop/photoshop-plain.svg" } }),
      prisma.skill.create({ data: { name: "Illustrator", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/illustrator/illustrator-plain.svg" } }),

      // Testing
      prisma.skill.create({ data: { name: "Jest", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jest/jest-plain.svg" } }),
      prisma.skill.create({ data: { name: "Cypress", iconUrl: "https://cdn-icons-png.flaticon.com/512/2103/2103832.png" } }),
      prisma.skill.create({ data: { name: "Selenium", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/selenium/selenium-original.svg" } }),
      prisma.skill.create({ data: { name: "Pytest", iconUrl: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pytest/pytest-original.svg" } }),

      // Soft Skills
      prisma.skill.create({ data: { name: "Communication", iconUrl: "https://cdn-icons-png.flaticon.com/512/2991/2991148.png" } }),
      prisma.skill.create({ data: { name: "Leadership", iconUrl: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" } }),
      prisma.skill.create({ data: { name: "Team Collaboration", iconUrl: "https://cdn-icons-png.flaticon.com/512/3135/3135810.png" } }),
      prisma.skill.create({ data: { name: "Problem Solving", iconUrl: "https://cdn-icons-png.flaticon.com/512/4727/4727266.png" } }),
      prisma.skill.create({ data: { name: "Agile/Scrum", iconUrl: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" } }),
      prisma.skill.create({ data: { name: "Project Management", iconUrl: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" } }),
    ]);

    console.log(`✅ Created ${skills.length} skills`);

    console.log("\n✅ Seeding completed successfully!");
    console.log(`📊 Total: ${categories.length} categories, ${skills.length} skills`);

  } catch (error) {
    console.error("❌ Error seeding data:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedSkillsAndCategories()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
