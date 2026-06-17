// Script to add messages specifically in the 300-500 character bucket
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Texts calibrated to be between 300 and 500 characters
const texts300to500 = [
  "Hello, I discovered your LinkedIn profile and I am particularly impressed by your professional journey. Your fullstack web development experience as well as your ability to manage technical teams would be a major asset for our company. We are currently looking for a Lead Developer for our Product team which already has 8 talented developers. Our tech stack is modern: React, TypeScript, Node.js, PostgreSQL and Redis. The position is hybrid remote with 3 days remote per week. The package is attractive: 75-95k euros gross annual depending on your experience, with stock options and a training budget of 3k euros per year. Would you be open to a 20-minute call to discuss it informally?",
  "Hello, I am Head of Talent at TechGrowth, a Series C SaaS scale-up developing a marketing automation solution for B2B teams. We recently raised 25M euros and are in a European expansion phase. We are looking for a VP of Engineering who will be responsible for our technical strategy over the next 3 years. This includes structuring our 4 current squads (32 people in total), recruiting 20 new profiles by year-end, and migrating our monolithic architecture to microservices. The package is competitive: 110-140k euros gross, stock options representing 0.5% of equity, hybrid remote, and 5k euros of training per year. Your profile is exactly what we are looking for. Does a chat interest you?",
  "Hi, I am the CEO and co-founder of CloudNative, a startup that publishes a cloud monitoring solution for DevOps teams. After 3 years of bootstrapping, we have just finalized our first fundraising round of 3M euros and are embarking on an ambitious growth phase. Our stack is modern: Next.js, Node.js, PostgreSQL, Redis, Kubernetes on GCP. We are looking for a co-founder CTO who will take the technical direction of the company. Your responsibilities include: defining the technical roadmap over 18 months, recruiting and structuring the dev team (goal: 8 people within 6 months), implementing development best practices (CI/CD, testing, documentation), and representing tech to clients and investors. Compensation: market salary (60-75k euros) + 15 to 20% equity depending on your contribution. Position based in Lyon but remote possible in a European time zone.",
  "Hello, I am a tech recruitment consultant specialized in senior profiles. One of my clients, a Series B B2B software publisher with 200 employees, is looking for an Engineering Manager to support their growth to 500 people within 2 years. You will have 2 teams under your responsibility (8 developers in total), with the mission to structure development processes, instill a culture of technical excellence through tech talks and internal hackathons, and actively recruit new profiles. The package is attractive: 80-100k euros + significant stock options + flexible remote. Your past experience and ability to structure teams from scratch make you an ideal candidate. Can I offer you a virtual coffee to talk about it?",
  "Hello, I am the founder of AIStartup, a startup developing an intelligent copilot for developers based on generative AI. We just raised 4M euros in Series A and are in an intensive recruitment phase. We are looking for a technical co-founder (CTO) who will lead our engineering team currently composed of 3 very talented people. You will be in charge of the entire product and technical roadmap, recruiting 10 new developers by year-end, and scaling our cloud infrastructure on AWS. The package includes a market salary (70-90k euros) + 10-15% significant equity. Position based in Bordeaux with fully remote possible. Your dual dev + product skills make you the ideal candidate.",
  "Hello, we are a fast-growing fintech based in Paris looking for a Lead Developer for our Core Banking team. You will be in charge of managing a team of 6 senior developers, participating in technical architecture decisions (we are migrating to an event-driven architecture), and ensuring code quality through systematic code reviews and test coverage above 80%. Our stack is modern: React, TypeScript, Node.js, PostgreSQL, Redis, Docker, Kubernetes. The package is very attractive: 85-105k euros depending on experience, hybrid remote (3 days remote), profit-sharing bonus, and training budget of 4k euros per year. Your profile is exactly what we need to accelerate.",
  "Hi, I am the CTO of DataMinds, a data science and artificial intelligence consulting firm. We support large CAC40 companies on their most strategic AI and machine learning projects. We are looking for a Data Lead to structure our data team currently composed of 5 very talented people. You will be in charge of deliverable quality on client projects, recruiting new data scientist and data engineer profiles, and client relationships on the most strategic accounts. Position based in Paris with 2 days of remote work per week, package 85-105k euros + performance bonus + company car. Your solid technical background and client experience are a major asset for this position.",
  "Hello, I am a recruiter at DevOpsPro, a hyper-growth company that publishes a deployment automation platform for SMBs and mid-sized companies. We saw your profile and your dual development + infrastructure skills really impress us. We are looking for a Senior DevOps Engineer to join our infrastructure team of 4 people. You will be responsible for optimizing our CI/CD pipelines on GitLab, gradually migrating our infrastructure to Kubernetes on GCP, and supporting development teams in their DevOps best practices. Full remote position from France, package 70-85k euros + profit sharing + coworking fee reimbursement. Your expertise is exactly what we are looking for.",
  "Hello, your profile is exactly what we are looking for! I am the HR Director at InnovateTech, a recruitment firm specialized in senior tech profiles. We have a client, a Series C SaaS scale-up developing a collaborative solution for product teams, looking for a technical CEO to launch their new business unit dedicated to artificial intelligence. The role involves managing a team of 30 people from day one, defining the AI product roadmap over 18 months, and representing the company to investors and clients. Package: 120-150k euros + very significant stock options + fully remote from Europe. Your entrepreneurial experience and network in the startup ecosystem are major assets. Does a first chat interest you?",
  "Hello, I am the CEO of ScaleTech, a startup developing a no-code business process automation platform for SMBs. After 2 years of development and a first product validated by the market, we have just finalized our first fundraising round of 5M euros and are embarking on an ambitious growth phase. We are looking for a CTO who will be my technical right-hand person and will lead all product engineering. You will be in charge of the technical roadmap, recruiting and retaining dev teams (goal: 12 people within 12 months), quality and scalability of our infrastructure, and technology watch. Package: 80-100k euros + 8-12% equity depending on your experience and ability to join us quickly. Position based in Paris with flexible remote."
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  console.log("📝 Adding calibrated 300-500 character messages...");

  try {
    const messages = [];

    // 45 messages between 300 and 500 characters
    for (let i = 0; i < 45; i++) {
      const baseText = texts300to500[i % texts300to500.length];
      // Add a little variation to avoid exact duplicates
      const suffix = ` (ref: ${i + 100})`;
      const text = baseText + suffix;
      messages.push({
        campaign_id: randomInt(1, 4),
        text: text,
        status: Math.random() < 0.5 ? "replied" : "sent",
        daysAgo: randomInt(1, 60)
      });
    }

    // Insert in batches
    const batchSize = 25;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const values = batch
        .map(
          (m, idx) =>
            `(${m.campaign_id}, ${randomInt(1, 110)}, 'ProspectL${i + idx}', 'RoleL${i + idx}', 'CompanyL${i + idx}', '${m.text.replace(/'/g, "''")}', 'connection', '${m.status}', NOW() - INTERVAL '${m.daysAgo} days')`
        )
        .join(", ");

      await pool.query(`
        INSERT INTO messages (campaign_id, prospect_id, recipient_name, recipient_role, recipient_company, message_text, message_type, status, created_at)
        VALUES ${values}
      `);
    }

    console.log(`✅ ${messages.length} messages inserted`);

    // Verification
    const verify = await pool.query(`
      WITH bucketed AS (
        SELECT
          CASE
            WHEN LENGTH(message_text) < 100 THEN '0-100'
            WHEN LENGTH(message_text) < 200 THEN '100-200'
            WHEN LENGTH(message_text) < 300 THEN '200-300'
            WHEN LENGTH(message_text) < 500 THEN '300-500'
            WHEN LENGTH(message_text) < 800 THEN '500-800'
            ELSE '800+'
          END AS bucket,
          status
        FROM messages
        WHERE created_at > NOW() - INTERVAL '60 days'
      )
      SELECT
        bucket,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'replied') AS replied,
        ROUND(COUNT(*) FILTER (WHERE status = 'replied') * 100.0 / COUNT(*), 1) AS rate
      FROM bucketed
      GROUP BY bucket
      ORDER BY
        CASE bucket
          WHEN '0-100' THEN 1
          WHEN '100-200' THEN 2
          WHEN '200-300' THEN 3
          WHEN '300-500' THEN 4
          WHEN '500-800' THEN 5
          ELSE 6
        END
    `);

    console.log("\n📊 Final distribution:");
    console.log("┌─────────┬───────┬─────────┬──────┐");
    console.log("│ Bucket  │ Total │ Replied │ Rate │");
    console.log("├─────────┼───────┼─────────┼──────┤");
    verify.rows.forEach((row) => {
      console.log(
        `│ ${row.bucket.padEnd(7)} │ ${String(row.total).padStart(5)} │ ${String(row.replied).padStart(7)} │ ${String(row.rate).padStart(4)}% │`
      );
    });
    console.log("└─────────┴───────┴─────────┴──────┘");

    const totalResult = await pool.query("SELECT COUNT(*) FROM messages");
    console.log(`\n📨 Total messages: ${totalResult.rows[0].count}`);
    console.log("\n🎉 Done!");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();
