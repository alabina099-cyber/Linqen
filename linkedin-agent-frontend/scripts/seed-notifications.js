const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const notifications = [
  {
    type: "connection",
    title: "New LinkedIn connection",
    message:
      "Marie Dubois accepted your connection request. She holds the position of Marketing Director at TechCorp.",
    read: false,
    data: { prospect_id: 1, prospect_name: "Marie Dubois" }
  },
  {
    type: "reply",
    title: "New reply received",
    message:
      'Jean Martin replied to your message from the "Recruitment Tech Q3" campaign. Reply: "Interested, let\'s talk next week."',
    read: false,
    data: { campaign_id: 1, prospect_id: 2, prospect_name: "Jean Martin" }
  },
  {
    type: "message",
    title: "Message sent successfully",
    message:
      "Your message to Sarah Lefebvre was sent via the Chrome extension. Status: sent.",
    read: true,
    data: { prospect_id: 3, prospect_name: "Sarah Lefebvre" }
  },
  {
    type: "alert",
    title: "Reply rate declining",
    message:
      'The reply rate for the "SaaS France" campaign dropped from 18% to 12% this week. Consider reviewing your templates.',
    read: false,
    data: {
      campaign_id: 2,
      campaign_name: "SaaS France",
      old_rate: 18,
      new_rate: 12
    }
  },
  {
    type: "connection",
    title: "New LinkedIn connection",
    message:
      "Pierre Garnier accepted your connection request. CTO @ StartupFlow.",
    read: false,
    data: { prospect_id: 4, prospect_name: "Pierre Garnier" }
  },
  {
    type: "reply",
    title: "Conversion detected!",
    message:
      "Sophie Bernard showed strong interest in your offer. She requested a demo for next Tuesday.",
    read: false,
    data: {
      campaign_id: 1,
      prospect_id: 5,
      prospect_name: "Sophie Bernard",
      status: "converted"
    }
  },
  {
    type: "alert",
    title: "Send quota almost reached",
    message:
      "You have sent 45 messages today out of your limit of 50. Slow down to avoid LinkedIn restrictions.",
    read: true,
    data: { sent: 45, limit: 50 }
  },
  {
    type: "message",
    title: "Automatic follow-up sent",
    message:
      'The AI agent sent a follow-up to Luc Moreau after 3 days without reply. Template: "Soft nudge".',
    read: false,
    data: {
      prospect_id: 6,
      prospect_name: "Luc Moreau",
      template: "Soft nudge"
    }
  },
  {
    type: "connection",
    title: "Profile viewed",
    message:
      "Your profile was viewed by 12 targeted prospects this week. Top industry: Technology.",
    read: true,
    data: { views: 12, top_industry: "Technology" }
  },
  {
    type: "reply",
    title: "New reply received",
    message:
      'Claire Rousseau: "Thank you for your message, I am not interested at the moment but keep in touch."',
    read: false,
    data: {
      campaign_id: 3,
      prospect_id: 7,
      prospect_name: "Claire Rousseau",
      sentiment: "neutral"
    }
  },
  {
    type: "alert",
    title: "AI agent paused",
    message:
      "The AI agent was automatically paused after 5 consecutive errors. Check the LinkedIn connection.",
    read: false,
    data: { errors: 5, reason: "connection" }
  },
  {
    type: "message",
    title: "Campaign completed",
    message:
      'The "B2B Product Launch" campaign is finished. Results: 200 sent, 45 replies, 12 conversions.',
    read: true,
    data: { campaign_id: 4, sent: 200, replies: 45, conversions: 12 }
  }
];

async function seed() {
  const client = await pool.connect();
  try {
    // Clear existing notifications first
    await client.query("DELETE FROM notifications");
    console.log("🗑️  Old notifications deleted");

    for (const n of notifications) {
      await client.query(
        `INSERT INTO notifications (type, title, message, read, data, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${Math.floor(Math.random() * 72)} minutes')`,
        [n.type, n.title, n.message, n.read, JSON.stringify(n.data)]
      );
    }

    const countRes = await client.query("SELECT COUNT(*) FROM notifications");
    console.log(
      `✅ ${countRes.rows[0].count} notifications inserted successfully`
    );
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
