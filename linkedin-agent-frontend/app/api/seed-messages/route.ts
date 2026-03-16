import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// POST /api/seed-messages - Insert test messages for dashboard demo
export async function POST() {
  try {
    // Get existing prospects
    const prospectsResult = await pool.query("SELECT id, name, role, company FROM prospects LIMIT 10");
    const prospects = prospectsResult.rows;

    // Get existing campaigns
    const campaignsResult = await pool.query("SELECT id, name FROM campaigns LIMIT 5");
    const campaigns = campaignsResult.rows;

    if (prospects.length === 0) {
      return NextResponse.json({ error: "Aucun prospect trouvé. Créez d'abord des prospects." }, { status: 400 });
    }

    const statuses = ["sent", "delivered", "read", "replied", "clicked", "converted"];
    const messageTemplates = [
      "Bonjour {name}, je souhaiterais échanger avec vous au sujet de votre expertise en {industry}.",
      "Merci pour votre connexion {name} ! J'ai remarqué votre parcours chez {company} et j'aimerais discuter.",
      "Suite à notre échange, je voulais vous partager cette ressource qui pourrait vous intéresser.",
      "Bonjour {name}, avez-vous eu l'occasion de consulter mon message précédent ?",
      "{name}, ravi de vous compter dans mon réseau ! Seriez-vous disponible pour un échange rapide ?",
      "Merci pour votre réponse {name}. Je serais ravi de planifier un appel cette semaine.",
      "Bonjour {name}, je vous contacte car votre profil correspond parfaitement à notre recherche.",
      "Suite à notre conversation, voici le lien vers notre plateforme pour en savoir plus.",
      "{name}, je me permets de revenir vers vous concernant notre proposition.",
      "Excellent échange {name} ! Je vous envoie le récapitulatif par email.",
      "Bonjour {name}, j'ai vu que vous travaillez chez {company}. Votre expertise m'intéresse.",
      "Merci {name} ! Je vous confirme notre rendez-vous de mardi prochain.",
    ];

    const insertedMessages = [];

    for (let i = 0; i < 12; i++) {
      const prospect = prospects[i % prospects.length];
      const campaign = campaigns.length > 0 ? campaigns[i % campaigns.length] : null;
      const status = statuses[i % statuses.length];
      const template = messageTemplates[i % messageTemplates.length];
      const messageText = template
        .replace("{name}", prospect.name?.split(" ")[0] || "Prospect")
        .replace("{company}", prospect.company || "votre entreprise")
        .replace("{industry}", "votre domaine");

      // Spread messages over the last 7 days
      const hoursAgo = Math.floor(Math.random() * 168); // 0 to 7 days in hours

      const result = await pool.query(
        `INSERT INTO messages (
          prospect_id, campaign_id, recipient_name, recipient_role, recipient_company,
          message_text, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '${hoursAgo} hours')
        RETURNING *`,
        [
          prospect.id,
          campaign?.id || null,
          prospect.name,
          prospect.role || "Professionnel",
          prospect.company || "Entreprise",
          messageText,
          status,
        ]
      );

      insertedMessages.push(result.rows[0]);
    }

    // Also update campaign stats to reflect messages
    if (campaigns.length > 0) {
      for (const campaign of campaigns) {
        const msgStats = await pool.query(
          `SELECT 
            COUNT(*) FILTER (WHERE status IN ('sent','delivered','read','replied','clicked','converted')) as contacted,
            COUNT(*) FILTER (WHERE status = 'replied') as replied,
            COUNT(*) FILTER (WHERE status = 'clicked') as clicked,
            COUNT(*) FILTER (WHERE status = 'converted') as converted
          FROM messages WHERE campaign_id = $1`,
          [campaign.id]
        );
        
        const s = msgStats.rows[0];
        await pool.query(
          `UPDATE campaigns SET 
            contacted = $1, replied = $2, clicked = $3, converted = $4
          WHERE id = $5`,
          [
            parseInt(s.contacted) || 0,
            parseInt(s.replied) || 0,
            parseInt(s.clicked) || 0,
            parseInt(s.converted) || 0,
            campaign.id,
          ]
        );
      }
    }

    return NextResponse.json({
      success: true,
      count: insertedMessages.length,
      messages: insertedMessages,
    });
  } catch (error) {
    console.error("POST /api/seed-messages error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'insertion des messages test", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
