// Script pour ajouter des messages spécifiquement dans le bucket 300-500 caractères
const { Pool } = require("pg");

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://neondb_owner:npg_uzan40Povxwp@ep-tiny-term-ai0m9euo-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
});

// Textes calibrés pour être entre 300 et 500 caractères
const texts300to500 = [
  "Bonjour, j'ai découvert votre profil LinkedIn et je suis particulièrement impressionné par votre parcours professionnel. Votre expérience en développement web fullstack ainsi que votre capacité à manager des équipes techniques seraient un atout majeur pour notre entreprise. Nous recherchons actuellement un Lead Developer pour notre équipe Produit qui compte déjà 8 développeurs talentueux. Notre stack technique est moderne : React, TypeScript, Node.js, PostgreSQL et Redis. Le poste est en télétravail hybride avec 3 jours de remote par semaine. Le package est attractif : 75-95k€ brut annuel selon votre expérience, avec des BSPCE et une enveloppe formation de 3k€ par an. Seriez-vous ouvert à un call de 20 minutes pour en discuter de manière informelle ?",
  "Hello, je suis Head of Talent chez TechGrowth, une scale-up SaaS en série C qui développe une solution d'automatisation marketing pour les équipes B2B. Nous avons récemment levé 25M€ et sommes en phase d'expansion européenne. Nous recherchons un VP of Engineering qui sera responsable de notre stratégie technique sur les 3 prochaines années. Cela inclut la structuration de nos 4 squads actuelles (32 personnes au total), le recrutement de 20 nouveaux profils d'ici fin d'année, et la migration de notre architecture monolithique vers des microservices. Le package est compétitif : 110-140k€ brut, BSPCE représentant 0.5% du capital, remote hybride, et 5k€ de formation par an. Votre profil est exactement ce que nous recherchons. Un échange vous tente ?",
  "Salut, je suis la CEO et cofondatrice de CloudNative, startup qui édite une solution de monitoring cloud pour les équipes DevOps. Après 3 ans de bootstrapping, nous venons de finaliser notre première levée de 3M€ et entamons une phase de croissance ambitieuse. Notre stack est moderne : Next.js, Node.js, PostgreSQL, Redis, Kubernetes sur GCP. Nous recherchons un CTO cofondateur qui prendra la direction technique de l'entreprise. Vos responsabilités incluent : définir la roadmap technique sur 18 mois, recruter et structurer l'équipe dev (objectif : 8 personnes d'ici 6 mois), mettre en place les bonnes pratiques de développement (CI/CD, testing, documentation), et représenter la tech auprès des clients et investisseurs. Compensation : salaire marché (60-75k€) + 15 à 20% d'equity selon votre apport. Poste basé à Lyon mais remote possible dans un fuseau horaire européen.",
  "Bonjour, je suis consultant en recrutement tech spécialisé dans les profils seniors. Un de mes clients, éditeur de logiciel B2B en série B avec 200 collaborateurs, recherche un Engineering Manager pour accompagner leur croissance jusqu'à 500 personnes d'ici 2 ans. Vous aurez 2 équipes sous votre responsabilité (soit 8 développeurs au total), avec pour mission de structurer les processus de développement, d'instaurer une culture d'excellence technique via des tech talks et hackathons internes, et de recruter activement de nouveaux profils. Le package est attractif : 80-100k€ + BSPCE significatives + remote flexible. Votre expérience passée et votre capacité à structurer des équipes from scratch font de vous un candidat idéal. Puis-je vous proposer un café virtuel pour en parler ?",
  "Hello, je suis fondateur d'AIStartup, startup qui développe un copilote intelligent pour développeurs basé sur l'IA générative. Nous venons de lever 4M€ en série A et sommes en phase de recrutement intensif. Nous recherchons un cofondateur technique (CTO) qui prendra la direction de notre équipe engineering actuellement composée de 3 personnes très talentueuses. Vous serez en charge de toute la roadmap produit et technique, du recrutement de 10 nouveaux développeurs d'ici fin d'année, et de la scalabilité de notre infrastructure cloud sur AWS. Le package inclut un salaire de marché (70-90k€) + 10-15% d'equity significative. Poste basé à Bordeaux avec remote complet possible. Votre double compétence dev + product fait de vous le candidat idéal.",
  "Bonjour, nous sommes une fintech en forte croissance basée à Paris et recherchons un Lead Developer pour notre équipe Core Banking. Vous serez en charge de manager une équipe de 6 développeurs seniors, de participer aux choix d'architecture technique (nous migrons vers une architecture event-driven), et de garantir la qualité du code via des code reviews systématiques et une couverture de tests supérieure à 80%. Notre stack est moderne : React, TypeScript, Node.js, PostgreSQL, Redis, Docker, Kubernetes. Le package est très attractif : 85-105k€ selon expérience, télétravail hybride (3 jours remote), prime d'intéressement, et enveloppe formation de 4k€ par an. Votre profil est exactement ce dont nous avons besoin pour accélérer.",
  "Salut, je suis le CTO de DataMinds, cabinet de conseil en data science et intelligence artificielle. Nous accompagnons des grands comptes du CAC40 sur leurs projets d'IA et de machine learning les plus stratégiques. Nous recherchons un Data Lead pour structurer notre équipe data actuellement composée de 5 personnes très talentueuses. Vous serez en charge de la qualité des livrables sur les projets clients, du recrutement de nouveaux profils data scientists et data engineers, et de la relation client sur les dossiers les plus stratégiques. Poste basé à Paris avec 2 jours de télétravail par semaine, package 85-105k€ + bonus sur résultats + voiture de fonction. Votre background technique solide et votre expérience client sont un atout majeur pour ce poste.",
  "Hello, je suis recruteur chez DevOpsPro, entreprise en hyper-croissance qui édite une plateforme d'automatisation des déploiements pour les PME et ETI. Nous avons vu votre profil et votre double compétence développement + infrastructure nous impressionne beaucoup. Nous recherchons un Senior DevOps Engineer pour rejoindre notre équipe infrastructure de 4 personnes. Vous serez responsable de l'optimisation de nos pipelines CI/CD sur GitLab, de la migration progressive de notre infrastructure vers Kubernetes sur GCP, et de l'accompagnement des équipes de développement dans leurs bonnes pratiques DevOps. Poste en full remote depuis la France, package 70-85k€ + intéressement + participation aux frais de coworking. Votre expertise est exactement ce que nous recherchons.",
  "Bonjour, votre profil est exactement ce que nous recherchons ! Je suis HR Director chez InnovateTech, cabinet de recrutement spécialisé dans les profils tech seniors. Nous avons un client, scale-up SaaS en série C qui développe une solution collaborative pour les équipes produit, qui recherche une CEO technique pour lancer sa nouvelle business unit dédiée à l'intelligence artificielle. Le poste implique de gérer une équipe de 30 personnes dès le départ, de définir la roadmap produit IA sur 18 mois, et de représenter la société auprès des investisseurs et des clients. Package : 120-150k€ + BSPCE très significatives + remote complet depuis l'Europe. Votre expérience entrepreneuriale et votre réseau dans l'écosystème startup sont des atouts majeurs. Un premier échange vous tente ?",
  "Hello, je suis le CEO de ScaleTech, startup qui développe une plateforme no-code d'automatisation des processus métier pour les PME. Après 2 ans de développement et un premier produit validé par le marché, nous venons de finaliser notre première levée de fonds de 5M€ et entamons une phase de croissance ambitieuse. Nous recherchons un CTO qui sera mon bras droit technique et prendra la direction de toute l'ingénierie produit. Vous serez en charge de la roadmap technique, du recrutement et de la fidélisation des équipes dev (objectif : 12 personnes d'ici 12 mois), de la qualité et de la scalabilité de notre infrastructure, et de la veille technologique. Package : 80-100k€ + 8-12% d'equity selon votre expérience et votre capacité à nous rejoindre rapidement. Poste basé à Paris avec remote flexible.",
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  console.log("📝 Ajout de messages calibrés 300-500 caractères...");

  try {
    const messages = [];

    // 45 messages entre 300 et 500 caractères
    for (let i = 0; i < 45; i++) {
      const baseText = texts300to500[i % texts300to500.length];
      // Ajouter un peu de variation pour éviter les doublons exacts
      const suffix = ` (ref: ${i + 100})`;
      const text = baseText + suffix;
      messages.push({
        campaign_id: randomInt(1, 4),
        text: text,
        status: Math.random() < 0.5 ? "replied" : "sent",
        daysAgo: randomInt(1, 60),
      });
    }

    // Insérer par batches
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

    console.log(`✅ ${messages.length} messages insérés`);

    // Vérification
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

    console.log("\n📊 Distribution finale:");
    console.log("┌─────────┬───────┬─────────┬──────┐");
    console.log("│ Bucket  │ Total │ Répondu │ Taux │");
    console.log("├─────────┼───────┼─────────┼──────┤");
    verify.rows.forEach((row) => {
      console.log(`│ ${row.bucket.padEnd(7)} │ ${String(row.total).padStart(5)} │ ${String(row.replied).padStart(7)} │ ${String(row.rate).padStart(4)}% │`);
    });
    console.log("└─────────┴───────┴─────────┴──────┘");

    const totalResult = await pool.query("SELECT COUNT(*) FROM messages");
    console.log(`\n📨 Total messages: ${totalResult.rows[0].count}`);
    console.log("\n🎉 Terminé !");
  } catch (error) {
    console.error("❌ Erreur:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();
