// Script pour combler le gap 200-300 et 300-500
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function text200to300() {
  const texts = [
    "Bonjour, j'ai découvert votre profil et je suis impressionné par votre parcours. Votre expertise en développement web et votre expérience en leadership technique seraient parfaites pour notre équipe en pleine croissance. Nous recherchons un profil senior pour structurer notre pôle technique.",
    "Hello, je suis recruteur chez TechGrowth. Nous avons une opportunité passionnante pour un développeur fullstack avec 5+ ans d'expérience. Notre stack : React, Node.js, PostgreSQL. Remote possible. Salaire compétitif selon profil.",
    "Salut, je vous contacte car votre profil correspond à une offre de CTO chez une startup en série A. Vous aurez l'occasion de construire l'équipe technique from scratch et de définir la vision produit. Equity significative incluse.",
    "Bonjour, nous sommes une scale-up SaaS en hyper-croissance et recherchons un VP Engineering. Vous serez en charge de 3 squads et participerez aux décisions stratégiques. Package : 90-110k€ + BSPCE.",
    "Hello, je suis fondateur d'une startup IA. Nous développons un copilote pour développeurs. Votre background technique et votre réseau nous intéressent beaucoup. On en discute ?"
  ];
  return texts[Math.floor(Math.random() * texts.length)];
}

function text300to500() {
  const texts = [
    "Bonjour Alexandre, j'espère que vous allez bien. Je me permets de vous contacter car votre profil LinkedIn est ressorti dans ma recherche de candidats pour un poste de Lead Developer chez notre client, une fintech en forte croissance basée à Paris. Le poste implique de manager une équipe de 6 développeurs, de participer aux choix d'architecture technique, et de garantir la qualité du code via des code reviews régulières. Notre stack est moderne : React, TypeScript, Node.js, PostgreSQL, Redis, Docker. Le package est attractif : 75-95k€ selon expérience, télétravail hybride (3j/remote), et une enveloppe formation de 3k€ par an. Seriez-vous ouvert à en discuter ?",
    "Hello Isabelle, je suis Head of Talent chez CloudNative, une entreprise qui édite une solution de monitoring cloud pour les équipes DevOps. Nous avons vu votre profil et votre double compétence développement + infrastructure nous impressionne. Nous recherchons un Senior DevOps Engineer pour rejoindre notre équipe de 4 personnes. Vous serez responsable de l'optimisation de nos pipelines CI/CD, de la migration vers Kubernetes, et de l'accompagnement des équipes de développement dans leurs bonnes pratiques. Poste en full remote, package 70-85k€ + intéressement. Votre profil est exactement ce que nous recherchons.",
    "Salut François, je suis consultant indépendant spécialisé dans le recrutement tech. Un de mes clients, éditeur de logiciel B2B en série B, recherche un Engineering Manager pour accompagner leur croissance de 20 à 60 personnes d'ici 18 mois. Vous auriez 2 équipes sous votre responsabilité (8 développeurs au total), avec pour mission de structurer les processus de développement, d'instaurer une culture d'excellence technique, et de recruter de nouveaux profils. Le package est compétitif : 80-100k€ + BSPCE + remote flexible. Votre expérience chez ScaleTech fait de vous un candidat idéal.",
    "Bonjour Catherine, je suis la CTO de DevOpsPro, startup qui développe une plateforme d'automatisation des déploiements pour les PME. Nous venons de lever 4M€ et sommes en phase de recrutement intensif. Nous recherchons un cofondateur technique (CTO) qui prendra la direction de l'équipe engineering (actuellement 3 personnes). Vous serez en charge de la roadmap technique, du recrutement, et de la scalabilité de notre infrastructure. Package : salaire marché + 10-15% d'equity. Poste basé à Bordeaux avec remote possible. Votre profil est très intéressant.",
    "Hello David, je suis le CEO de DataMinds, cabinet de conseil en data science. Nous accompagnons des grands comptes sur leurs projets d'IA et de machine learning. Nous recherchons un Data Lead pour structurer notre équipe data (actuellement 5 personnes). Vous serez en charge de la qualité des livrables, du recrutement, et de la relation client sur les projets les plus stratégiques. Poste basé à Paris, remote 2j/semaine, package 85-105k€ + bonus sur résultats. Votre background technique et votre expérience client sont un atout majeur."
  ];
  return texts[Math.floor(Math.random() * texts.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedGap() {
  console.log(
    "📝 Ajout de messages pour combler les buckets 200-300 et 300-500..."
  );

  try {
    const messages = [];

    // Bucket 200-300 : 35 messages
    for (let i = 0; i < 35; i++) {
      messages.push({
        campaign_id: randomInt(1, 4),
        text: text200to300(),
        status: Math.random() < 0.48 ? "replied" : "sent",
        daysAgo: randomInt(1, 60)
      });
    }

    // Bucket 300-500 : 40 messages
    for (let i = 0; i < 40; i++) {
      messages.push({
        campaign_id: randomInt(1, 4),
        text: text300to500(),
        status: Math.random() < 0.52 ? "replied" : "sent",
        daysAgo: randomInt(1, 60)
      });
    }

    // Insérer par batches
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

    console.log(`✅ ${messages.length} messages insérés pour combler les gaps`);

    // Vérification finale
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
    console.log("\n📊 Distribution finale par longueur:");
    console.log("┌─────────┬───────┬─────────┬──────┐");
    console.log("│ Bucket  │ Total │ Répondu │ Taux │");
    console.log("├─────────┼───────┼─────────┼──────┤");
    verifyResult.rows.forEach((row) => {
      console.log(
        `│ ${row.bucket.padEnd(7)} │ ${String(row.total).padStart(5)} │ ${String(row.replied).padStart(7)} │ ${String(row.rate).padStart(4)}% │`
      );
    });
    console.log("└─────────┴───────┴─────────┴──────┘");

    const totalResult = await pool.query("SELECT COUNT(*) FROM messages");
    console.log(`\n📨 Total messages: ${totalResult.rows[0].count}`);

    console.log("\n🎉 Tous les buckets sont maintenant remplis !");
  } catch (error) {
    console.error("❌ Erreur:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedGap();
