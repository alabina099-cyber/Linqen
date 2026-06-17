// Script to add messages of various lengths (for "Length vs reply rate")
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Text generators of different lengths
function shortText() {
  const texts = [
    "Hello, interested in your profile.",
    "Hello, would love to connect with you.",
    "Hi, your experience interests me.",
    "Hello, let's talk opportunities?",
    "Hi, your profile looks interesting.",
    "Hello, let's chat quickly?",
    "Hello, a short message for you.",
    "Hello, are you hiring right now?",
    "Hi, a quick question!",
    "Hello, your role interests me."
  ];
  return texts[Math.floor(Math.random() * texts.length)];
}

function mediumText() {
  const texts = [
    "Hello, your LinkedIn profile caught my attention. I would like to discuss an opportunity that matches your development and technical leadership skills.",
    "Hello, I am impressed by your journey at your current company. I would like to present you with an opportunity at a fast-growing scale-up.",
    "Hello, we are looking for a profile like yours for our engineering team. Your cloud and DevOps expertise would be a real asset for us.",
    "Hi, I am in charge of recruiting at TechGrowth. Your background in AI and data science perfectly matches our current needs.",
    "Hello, your company looks very interesting. I would like to understand your tech challenges and see how our solution could help you.",
    "Hello, I am reaching out because we are launching a new B2B product and your profile matches our target persona. Can we discuss it?",
    "Hello, I saw you were working at your company. A similar opportunity with more autonomy might interest you?",
    "Hi, I am the founder of a Series A startup. Your tech + business profile is exactly what we are looking for in our team.",
    "Hello, your cloud architecture expertise is rare. We have a lead architect position that could suit you perfectly.",
    "Hello, I am a tech recruitment consultant. One of our clients is looking for a senior profile like yours. Interested in talking about it?"
  ];
  return texts[Math.floor(Math.random() * texts.length)];
}

function longText() {
  const texts = [
    "Hello Marie, I hope you are doing well. I am reaching out because I have analyzed your LinkedIn profile in detail and your experience at TechCorp exactly matches the profile we are looking for in our new R&D team. We are a fast-growing B2B scale-up, currently at Series B with 15M euros raised. Our product is a generative AI-based marketing automation platform. Your dual technical and leadership skills would be a major asset to structure our team of 8 developers. The position is fully remote with an attractive package (80-100k euros + stock options). Would you be open to a 20-minute call this week to discuss it?",
    "Hello Pierre, I am the CTO at DataFlow, a startup specialized in predictive analytics for retail. We saw your profile and your data engineering experience at your current company really impresses us. We are looking for a VP of Engineering to support our growth from 50 to 200 people by 2026. You would be in charge of the entire tech strategy, from architecture to team culture. We offer a competitive package (90-120k euros, stock options, flexible remote) and real decision-making autonomy. Would you be interested in an informal first chat?",
    "Hello Sophie, your profile is exactly what we are looking for! I am a recruiter at InnovateTech, a tech recruitment firm. We have a client, a Series C SaaS scale-up, looking for a technical CEO to launch their new AI business unit. The role involves managing a team of 30 people, defining the product roadmap, and representing the company to investors. Package: 120-150k euros + significant stock options + fully remote. Your experience at GrowthSaaS and your network in the startup ecosystem make you an ideal candidate. Can I offer you a debrief call?",
    "Hi Thomas, I discovered your profile through a mutual contact and I must say your journey is impressive. 8 years of DevOps experience, AWS and Kubernetes certifications, and especially that ability to structure teams from scratch. I am the founder of AIStartup, we are developing a conversational AI solution for customer service. We are growing from 10 to 50 people and need a Head of Infrastructure to ensure the scalability of our platform. Position based in Paris with 3 days remote per week, package 70-90k euros + stock options. Your profile is exactly what we need. Shall we talk?",
    "Hello Claire, I am writing because your LinkedIn profile came up in my candidate search for a very specific position. I am the HR Director at CloudScale, a company in hyper-growth (x3 in 18 months). We are looking for an Engineering Manager for our Data Platform team. You would have 6 data engineers under your responsibility, with the mission to build our lakehouse on Databricks and migrate our on-premise infrastructure to the cloud. Fully remote possible, package 75-95k euros + bonus + continuous training. Your experience at DataFlow and your solid technical background are a perfect match. Does a chat interest you?"
  ];
  return texts[Math.floor(Math.random() * texts.length)];
}

function veryLongText() {
  const texts = [
    "Hello Jean, I hope this message finds you well and that your week is going nicely. I am reaching out today because I have spent considerable time analyzing your professional journey on LinkedIn, and I must say I am particularly impressed by the diversity and richness of your experience. Your 12 years of expertise in the startup ecosystem, from hands-on technical roles to strategic leadership positions, demonstrate a rare adaptability and business vision in our sector. I am currently Head of Talent at InnovateTech, a Series C scale-up developing a collaborative data analysis platform for product and growth teams. We recently raised 25 million euros and are in an intensive recruitment phase to support our European expansion. Specifically, we are looking for a VP of Engineering who will be responsible for defining and executing our technology strategy over the next 3 years. This includes structuring our 4 current squads (32 people), recruiting 20 new profiles by year-end, migrating our monolithic architecture to a microservices architecture, and establishing a culture of technical excellence (code reviews, tech talks, internal hackathons). The package we offer is competitive: 110-140k euros gross annual, stock options representing 0.5% of equity, hybrid remote (2 days Paris / 3 days remote), and a training budget of 5k euros per year. I would be delighted to exchange with you on this opportunity, even if only to discuss the direction the tech market is currently taking. Would you be available for a 30-minute call this week or next week?",
    "Hello Camille, I came across your profile by chance while browsing a mutual contact's connections, and I was immediately captivated by the coherence of your journey. Your successful transition from pure development to product management, and then to engineering team leadership, is exactly the type of trajectory we value at DevWorld. I am the CEO and co-founder of this startup that publishes a no-code business process automation solution for SMBs. After 3 years of bootstrapping, we have just finalized our first fundraising round of 3M euros and are embarking on an ambitious growth phase. Our tech stack is modern (Next.js, Node.js, PostgreSQL, Redis, Kubernetes on GCP) and our codebase is relatively young and clean. We are looking for a co-founder CTO (partner status with significant equity) who will take the technical direction of the company. Your responsibilities would include: defining the technical roadmap over 12-18 months, recruiting and structuring the dev team (goal: 8 people within 6 months), implementing development best practices (CI/CD, testing, documentation), and representing tech to our clients and investors. In terms of compensation: a market salary (60-75k euros) + 15 to 20% equity depending on your experience and contribution. The position is based in Lyon but remote is possible if you are in a European time zone. I know this type of opportunity is very specific and requires real reflection, but I am convinced that your profile perfectly matches what we are looking for. Can I offer you a virtual coffee to discuss it informally?"
  ];
  return texts[Math.floor(Math.random() * texts.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedMessageLengths() {
  console.log(
    "📝 Adding messages of various lengths for 'Length vs reply rate'..."
  );

  try {
    const messages = [];

    // Bucket 0-100 characters: ~40 short messages
    for (let i = 0; i < 40; i++) {
      messages.push({
        campaign_id: randomInt(1, 4),
        text: shortText(),
        status: Math.random() < 0.35 ? "replied" : "sent",
        daysAgo: randomInt(1, 60)
      });
    }

    // Bucket 100-200 characters: ~50 medium messages
    for (let i = 0; i < 50; i++) {
      messages.push({
        campaign_id: randomInt(1, 4),
        text: mediumText(),
        status: Math.random() < 0.45 ? "replied" : "sent",
        daysAgo: randomInt(1, 60)
      });
    }

    // Bucket 200-300 characters: ~45 medium-long messages
    for (let i = 0; i < 45; i++) {
      messages.push({
        campaign_id: randomInt(1, 4),
        text: mediumText() + " " + shortText(),
        status: Math.random() < 0.5 ? "replied" : "sent",
        daysAgo: randomInt(1, 60)
      });
    }

    // Bucket 300-500 characters: ~40 long messages
    for (let i = 0; i < 40; i++) {
      messages.push({
        campaign_id: randomInt(1, 4),
        text: longText(),
        status: Math.random() < 0.55 ? "replied" : "sent",
        daysAgo: randomInt(1, 60)
      });
    }

    // Bucket 500-800 characters: ~30 very long messages
    for (let i = 0; i < 30; i++) {
      messages.push({
        campaign_id: randomInt(1, 4),
        text: longText() + " " + mediumText(),
        status: Math.random() < 0.4 ? "replied" : "sent",
        daysAgo: randomInt(1, 60)
      });
    }

    // Bucket 800+ characters: ~20 ultra-long messages
    for (let i = 0; i < 20; i++) {
      messages.push({
        campaign_id: randomInt(1, 4),
        text: veryLongText(),
        status: Math.random() < 0.3 ? "replied" : "sent",
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
            `(${m.campaign_id}, ${randomInt(1, 110)}, 'Prospect ${i + idx}', 'Role ${i + idx}', 'Company ${i + idx}', '${m.text.replace(/'/g, "''")}', 'connection', '${m.status}', NOW() - INTERVAL '${m.daysAgo} days')`
        )
        .join(", ");

      await pool.query(`
        INSERT INTO messages (campaign_id, prospect_id, recipient_name, recipient_role, recipient_company, message_text, message_type, status, created_at)
        VALUES ${values}
      `);
    }

    console.log(`✅ ${messages.length} messages of various lengths inserted`);

    // Bucket verification
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
    console.log("\n📊 Distribution by message length:");
    console.log("┌─────────┬───────┬─────────┬──────┐");
    console.log("│ Bucket  │ Total │ Replied │ Rate │");
    console.log("├─────────┼───────┼─────────┼──────┤");
    verifyResult.rows.forEach((row) => {
      console.log(
        `│ ${row.bucket.padEnd(7)} │ ${String(row.total).padStart(5)} │ ${String(row.replied).padStart(7)} │ ${String(row.rate).padStart(4)}% │`
      );
    });
    console.log("└─────────┴───────┴─────────┴──────┘");

    // Total messages
    const totalResult = await pool.query("SELECT COUNT(*) FROM messages");
    console.log(
      `\n📨 Total messages in database: ${totalResult.rows[0].count}`
    );

    console.log("\n🎉 Data inserted successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedMessageLengths();
