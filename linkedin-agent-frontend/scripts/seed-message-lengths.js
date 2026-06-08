// Script pour ajouter des messages de longueurs variées (pour "Longueur vs taux de réponse")
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Générateurs de textes de différentes longueurs
function shortText() {
  const texts = [
    "Bonjour, intéressé par votre profil.",
    "Hello, aimerais échanger avec vous.",
    "Salut, votre expérience m'intéresse.",
    "Bonjour, parlons opportunités ?",
    "Hi, votre profil est intéressant.",
    "Bonjour, discutons rapidement ?",
    "Hello, un message court pour vous.",
    "Bonjour, vous recrutez en ce moment ?",
    "Salut, une question rapide !",
    "Bonjour, votre poste m'intéresse."
  ];
  return texts[Math.floor(Math.random() * texts.length)];
}

function mediumText() {
  const texts = [
    "Bonjour, votre profil sur LinkedIn a attiré mon attention. J'aimerais discuter d'une opportunité qui correspond à vos compétences en développement et leadership technique.",
    "Hello, je suis impressionné par votre parcours chez votre entreprise actuelle. J'aimerais vous présenter une opportunité dans une scale-up en forte croissance.",
    "Bonjour, nous recherchons un profil comme le vôtre pour notre équipe engineering. Votre expertise en cloud et DevOps serait un vrai plus pour nous.",
    "Salut, je suis responsable du recrutement chez TechGrowth. Votre background en IA et data science correspond parfaitement à nos besoins actuels.",
    "Bonjour, votre entreprise semble très intéressante. J'aimerais comprendre vos défis tech et voir comment notre solution pourrait vous aider.",
    "Hello, je vous contacte car nous lançons un nouveau produit B2B et votre profil correspond à notre persona cible. Pouvons-nous en discuter ?",
    "Bonjour, j'ai vu que vous étiez en poste chez votre société. Une opportunité similaire mais avec plus d'autonomie pourrait vous intéresser ?",
    "Salut, je suis fondateur d'une startup en série A. Votre profil tech + business est exactement ce que nous recherchons pour notre équipe.",
    "Bonjour, votre expertise en architecture cloud est rare. Nous avons un poste de lead architecte qui pourrait vous convenir parfaitement.",
    "Hello, je suis consultant en recrutement tech. Un de nos clients recherche un profil senior comme le vôtre. Intéressé pour en parler ?"
  ];
  return texts[Math.floor(Math.random() * texts.length)];
}

function longText() {
  const texts = [
    "Bonjour Marie, j'espère que vous allez bien. Je me permets de vous contacter car j'ai analysé votre profil LinkedIn en détail et votre expérience chez TechCorp correspond exactement au profil que nous recherchons pour notre nouvelle équipe R&D. Nous sommes une scale-up B2B en forte croissance, actuellement en série B avec 15M€ levés. Notre produit est une plateforme d'automatisation marketing basée sur l'IA générative. Votre double compétence technique et leadership serait un atout majeur pour structurer notre équipe de 8 développeurs. Le poste est en full remote avec un package attractif (80-100k€ + BSPCE). Seriez-vous ouverte à un call de 20 minutes cette semaine pour en discuter ?",
    "Hello Pierre, je suis le CTO de DataFlow, une startup spécialisée dans l'analyse prédictive pour le retail. Nous avons vu votre profil et votre expérience en data engineering chez votre entreprise actuelle nous impressionne beaucoup. Nous recherchons un VP Engineering pour accompagner notre croissance de 50 à 200 personnes d'ici 2026. Vous seriez en charge de toute la stratégie tech, de l'architecture à la culture d'équipe. Nous offrons un package compétitif (90-120k€, BSPCE, remote flexible) et une vraie autonomie décisionnelle. Seriez-vous intéressé par un premier échange informel ?",
    "Bonjour Sophie, votre profil est exactement ce que nous recherchons ! Je suis recruteur chez InnovateTech, cabinet de recrutement spécialisé tech. Nous avons un client, scale-up SaaS en série C, qui recherche une CEO technique pour lancer sa nouvelle business unit IA. Le poste implique de gérer une équipe de 30 personnes, définir la roadmap produit et représenter la société auprès des investisseurs. Package : 120-150k€ + BSPCE significatives + remote complet. Votre expérience chez GrowthSaaS et votre réseau dans l'écosystème startup font de vous une candidate idéale. Puis-je vous proposer un call débrief ?",
    "Salut Thomas, j'ai découvert votre profil via un contact mutualisé et je dois dire que votre parcours est impressionnant. 8 ans d'expérience en devops, certifications AWS et Kubernetes, et surtout cette capacité à structurer des équipes from scratch. Je suis fondateur d'AIStartup, nous développons une solution d'IA conversationnelle pour le service client. Nous passons de 10 à 50 personnes et avons besoin d'un Head of Infrastructure pour garantir la scalabilité de notre plateforme. Poste basé à Paris avec remote 3j/semaine, package 70-90k€ + BSPCE. Votre profil est exactement ce dont nous avons besoin. On en parle ?",
    "Bonjour Claire, je vous écris car votre profil LinkedIn est ressorti dans ma recherche de candidats pour un poste très spécifique. Je suis HR Director chez CloudScale, entreprise en hyper-croissance (x3 en 18 mois). Nous recherchons un Engineering Manager pour notre équipe Data Platform. Vous auriez 6 data engineers sous votre responsabilité, avec pour mission de construire notre lakehouse sur Databricks et de migrer notre infrastructure on-premise vers le cloud. Remote complet possible, package 75-95k€ + bonus + formation continue. Votre expérience chez DataFlow et votre background technique solide sont un match parfait. Un échange vous tente ?"
  ];
  return texts[Math.floor(Math.random() * texts.length)];
}

function veryLongText() {
  const texts = [
    "Bonjour Jean, j'espère que ce message vous trouve bien et que votre semaine se passe agréablement. Je me permets de vous contacter aujourd'hui car j'ai passé un moment considérable à analyser votre parcours professionnel sur LinkedIn, et je dois dire que je suis particulièrement impressionné par la diversité et la richesse de votre expérience. Vos 12 années d'expertise dans l'écosystème startup, en passant par des rôles techniques hands-on à des positions de leadership stratégique, démontrent une capacité d'adaptation et une vision business rares dans notre secteur. Je suis actuellement Head of Talent chez InnovateTech, une scale-up en série C qui développe une plateforme collaborative d'analyse de données pour les équipes produit et growth. Nous avons récemment levé 25 millions d'euros et sommes en phase de recrutement intensif pour accompagner notre expansion européenne. Concrètement, nous recherchons un VP of Engineering qui sera responsable de la définition et de l'exécution de notre stratégie technologique sur les 3 prochaines années. Cela inclut la structuration de nos 4 squads actuelles (32 personnes), le recrutement de 20 nouveaux profils d'ici fin d'année, la migration de notre architecture monolithique vers une architecture microservices, et l'instauration d'une culture d'excellence technique (code reviews, tech talks, hackathons internes). Le package que nous proposons est compétitif : 110-140k€ brut annuel, BSPCE représentant 0.5% du capital, remote hybride (2j Paris / 3j remote), et une enveloppe formation de 5k€ par an. Je serais ravi d'échanger avec vous sur cette opportunité, même si ce n'est que pour discuter de la direction que prend le marché tech actuellement. Seriez-vous disponible pour un call de 30 minutes cette semaine ou la semaine prochaine ?",
    "Hello Camille, je suis tombée sur votre profil par hasard en parcourant les connections d'un contact mutualisé, et j'ai été immédiatement captivée par la cohérence de votre parcours. Votre transition réussie du développement pur vers le product management, puis vers le leadership d'équipe engineering, est exactement le type de trajectoire que nous valorisons chez DevWorld. Je suis la CEO et cofondatrice de cette startup qui édite une solution no-code d'automatisation des processus métier pour les PME. Après 3 ans de bootstrapping, nous venons de finaliser notre première levée de fonds de 3M€ et nous entamons une phase de croissance ambitieuse. Notre stack technique est moderne (Next.js, Node.js, PostgreSQL, Redis, Kubernetes sur GCP) et notre codebase est relativement jeune et propre. Nous recherchons un CTO co-fondateur (status de partner avec equity significative) qui prendra la direction technique de l'entreprise. Vos responsabilités incluraient : définir la roadmap technique sur 12-18 mois, recruter et structurer l'équipe dev (objectif : 8 personnes d'ici 6 mois), mettre en place les bonnes pratiques de développement (CI/CD, testing, documentation), et représenter la tech auprès de nos clients et investisseurs. En termes de compensation : un salaire de marché (60-75k€) + 15 à 20% d'equity selon votre expérience et votre apport. Le poste est basé à Lyon mais le remote est possible si vous êtes dans un fuseau horaire européen. Je sais que ce type d'opportunité est très spécifique et demande une vraie réflexion, mais je suis convaincue que votre profil correspond parfaitement à ce que nous recherchons. Puis-je vous proposer un café virtuel pour en discuter de manière informelle ?"
  ];
  return texts[Math.floor(Math.random() * texts.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedMessageLengths() {
  console.log(
    "📝 Ajout de messages de longueurs variées pour 'Longueur vs taux de réponse'..."
  );

  try {
    const messages = [];

    // Bucket 0-100 caractères : ~40 messages courts
    for (let i = 0; i < 40; i++) {
      messages.push({
        campaign_id: randomInt(1, 4),
        text: shortText(),
        status: Math.random() < 0.35 ? "replied" : "sent",
        daysAgo: randomInt(1, 60)
      });
    }

    // Bucket 100-200 caractères : ~50 messages moyens
    for (let i = 0; i < 50; i++) {
      messages.push({
        campaign_id: randomInt(1, 4),
        text: mediumText(),
        status: Math.random() < 0.45 ? "replied" : "sent",
        daysAgo: randomInt(1, 60)
      });
    }

    // Bucket 200-300 caractères : ~45 messages moyens-longs
    for (let i = 0; i < 45; i++) {
      messages.push({
        campaign_id: randomInt(1, 4),
        text: mediumText() + " " + shortText(),
        status: Math.random() < 0.5 ? "replied" : "sent",
        daysAgo: randomInt(1, 60)
      });
    }

    // Bucket 300-500 caractères : ~40 messages longs
    for (let i = 0; i < 40; i++) {
      messages.push({
        campaign_id: randomInt(1, 4),
        text: longText(),
        status: Math.random() < 0.55 ? "replied" : "sent",
        daysAgo: randomInt(1, 60)
      });
    }

    // Bucket 500-800 caractères : ~30 messages très longs
    for (let i = 0; i < 30; i++) {
      messages.push({
        campaign_id: randomInt(1, 4),
        text: longText() + " " + mediumText(),
        status: Math.random() < 0.4 ? "replied" : "sent",
        daysAgo: randomInt(1, 60)
      });
    }

    // Bucket 800+ caractères : ~20 messages ultra-longs
    for (let i = 0; i < 20; i++) {
      messages.push({
        campaign_id: randomInt(1, 4),
        text: veryLongText(),
        status: Math.random() < 0.3 ? "replied" : "sent",
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
            `(${m.campaign_id}, ${randomInt(1, 110)}, 'Prospect ${i + idx}', 'Role ${i + idx}', 'Company ${i + idx}', '${m.text.replace(/'/g, "''")}', 'connection', '${m.status}', NOW() - INTERVAL '${m.daysAgo} days')`
        )
        .join(", ");

      await pool.query(`
        INSERT INTO messages (campaign_id, prospect_id, recipient_name, recipient_role, recipient_company, message_text, message_type, status, created_at)
        VALUES ${values}
      `);
    }

    console.log(`✅ ${messages.length} messages de longueurs variées insérés`);

    // Vérification des buckets
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
    console.log("\n📊 Distribution par longueur de message:");
    console.log("┌─────────┬───────┬─────────┬──────┐");
    console.log("│ Bucket  │ Total │ Répondu │ Taux │");
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
      `\n📨 Total messages dans la base: ${totalResult.rows[0].count}`
    );

    console.log("\n🎉 Données insérées avec succès !");
  } catch (error) {
    console.error("❌ Erreur:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedMessageLengths();
