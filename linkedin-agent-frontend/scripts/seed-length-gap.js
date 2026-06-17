// Script to fill the 200-300 and 300-500 gap
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function text200to300() {
  const texts = [
    "Hello, I discovered your profile and I am impressed by your journey. Your web development expertise and technical leadership experience would be perfect for our fast-growing team. We are looking for a senior profile to structure our technical division.",
    "Hello, I am a recruiter at TechGrowth. We have an exciting opportunity for a fullstack developer with 5+ years of experience. Our stack: React, Node.js, PostgreSQL. Remote possible. Competitive salary depending on profile.",
    "Hi, I am reaching out because your profile matches a CTO position at a Series A startup. You will have the opportunity to build the technical team from scratch and define the product vision. Significant equity included.",
    "Hello, we are a fast-growing SaaS scale-up looking for a VP of Engineering. You will be in charge of 3 squads and participate in strategic decisions. Package: 90-110k euros + stock options.",
    "Hello, I am the founder of an AI startup. We are developing a copilot for developers. Your technical background and network interest us a lot. Shall we discuss it?"
  ];
  return texts[Math.floor(Math.random() * texts.length)];
}

function text300to500() {
  const texts = [
    "Hello Alexandre, I hope you are doing well. I am reaching out because your LinkedIn profile came up in my candidate search for a Lead Developer position at our client, a fast-growing fintech based in Paris. The role involves managing a team of 6 developers, participating in technical architecture decisions, and ensuring code quality through regular code reviews. Our stack is modern: React, TypeScript, Node.js, PostgreSQL, Redis, Docker. The package is attractive: 75-95k euros depending on experience, hybrid remote (3 days remote), and a training budget of 3k euros per year. Would you be open to discussing it?",
    "Hello Isabelle, I am Head of Talent at CloudNative, a company that publishes a cloud monitoring solution for DevOps teams. We saw your profile and your dual development + infrastructure skills impress us. We are looking for a Senior DevOps Engineer to join our team of 4 people. You will be responsible for optimizing our CI/CD pipelines, migrating to Kubernetes, and supporting development teams in their best practices. Full remote position, package 70-85k euros + profit sharing. Your profile is exactly what we are looking for.",
    "Hi Francois, I am an independent consultant specialized in tech recruitment. One of my clients, a Series B B2B software publisher, is looking for an Engineering Manager to support their growth from 20 to 60 people within 18 months. You would have 2 teams under your responsibility (8 developers in total), with the mission to structure development processes, instill a culture of technical excellence, and recruit new profiles. The package is competitive: 80-100k euros + stock options + flexible remote. Your experience at ScaleTech makes you an ideal candidate.",
    "Hello Catherine, I am the CTO at DevOpsPro, a startup developing a deployment automation platform for SMBs. We just raised 4M euros and are in an intensive recruitment phase. We are looking for a technical co-founder (CTO) who will lead the engineering team (currently 3 people). You will be in charge of the technical roadmap, recruitment, and scalability of our infrastructure. Package: market salary + 10-15% equity. Position based in Bordeaux with remote possible. Your profile is very interesting.",
    "Hello David, I am the CEO of DataMinds, a data science consulting firm. We support large enterprises on their AI and machine learning projects. We are looking for a Data Lead to structure our data team (currently 5 people). You will be in charge of deliverable quality, recruitment, and client relationships on the most strategic projects. Position based in Paris, remote 2 days per week, package 85-105k euros + performance bonus. Your technical background and client experience are a major asset."
  ];
  return texts[Math.floor(Math.random() * texts.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedGap() {
  console.log("📝 Adding messages to fill the 200-300 and 300-500 buckets...");

  try {
    const messages = [];

    // Bucket 200-300: 35 messages
    for (let i = 0; i < 35; i++) {
      messages.push({
        campaign_id: randomInt(1, 4),
        text: text200to300(),
        status: Math.random() < 0.48 ? "replied" : "sent",
        daysAgo: randomInt(1, 60)
      });
    }

    // Bucket 300-500: 40 messages
    for (let i = 0; i < 40; i++) {
      messages.push({
        campaign_id: randomInt(1, 4),
        text: text300to500(),
        status: Math.random() < 0.52 ? "replied" : "sent",
        daysAgo: randomInt(1, 60)
      });
    }

    // Insert in batches
    const batchSize = 50;
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const values = batch
        .map(
          (m, idx) =>
            `(${m.campaign_id}, ${randomInt(1, 110)}, 'ProspectGap${i + idx}', 'RoleGap${i + idx}', 'CompanyGap${i + idx}', '${m.text.replace(/'/g, "''")}', 'connection', '${m.status}', NOW() - INTERVAL '${m.daysAgo} days')`
        )
        .join(", ");

      await pool.query(`
        INSERT INTO messages (campaign_id, prospect_id, recipient_name, recipient_role, recipient_company, message_text, message_type, status, created_at)
        VALUES ${values}
      `);
    }

    console.log(`✅ ${messages.length} messages inserted to fill the gaps`);

    // Final verification
    const verifySql = `
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
    `;

    const verifyResult = await pool.query(verifySql);
    console.log("\n📊 Final distribution by length:");
    console.log("┌─────────┬───────┬─────────┬──────┐");
    console.log("│ Bucket  │ Total │ Replied │ Rate │");
    console.log("├─────────┼───────┼─────────┼──────┤");
    verifyResult.rows.forEach((row) => {
      console.log(
        `│ ${row.bucket.padEnd(7)} │ ${String(row.total).padStart(5)} │ ${String(row.replied).padStart(7)} │ ${String(row.rate).padStart(4)}% │`
      );
    });
    console.log("└─────────┴───────┴─────────┴──────┘");

    const totalResult = await pool.query("SELECT COUNT(*) FROM messages");
    console.log(`\n📨 Total messages: ${totalResult.rows[0].count}`);

    console.log("\n🎉 All buckets are now filled!");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedGap();
