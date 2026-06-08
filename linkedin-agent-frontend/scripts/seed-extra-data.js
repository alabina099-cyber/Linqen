// Script pour ajouter des données supplémentaires pour ProspectMap et Heatmap
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Villes françaises et internationales pour la diversité géo
const cities = [
  { name: "Paris", country: "France" },
  { name: "Lyon", country: "France" },
  { name: "Marseille", country: "France" },
  { name: "Bordeaux", country: "France" },
  { name: "Nantes", country: "France" },
  { name: "Strasbourg", country: "France" },
  { name: "Lille", country: "France" },
  { name: "Toulouse", country: "France" },
  { name: "Nice", country: "France" },
  { name: "Rennes", country: "France" },
  { name: "Montpellier", country: "France" },
  { name: "Grenoble", country: "France" },
  { name: "Tours", country: "France" },
  { name: "Nancy", country: "France" },
  { name: "Metz", country: "France" },
  { name: "Dijon", country: "France" },
  { name: "Reims", country: "France" },
  { name: "Le Havre", country: "France" },
  { name: "Toulon", country: "France" },
  { name: "Angers", country: "France" },
  { name: "Brest", country: "France" },
  { name: "Caen", country: "France" },
  { name: "Clermont-Ferrand", country: "France" },
  { name: "Limoges", country: "France" },
  { name: "Amiens", country: "France" },
  { name: "Perpignan", country: "France" },
  { name: "Besançon", country: "France" },
  { name: "Orléans", country: "France" },
  { name: "Mulhouse", country: "France" },
  { name: "Rouen", country: "France" },
  { name: "Bruxelles", country: "Belgique" },
  { name: "Genève", country: "Suisse" },
  { name: "Luxembourg", country: "Luxembourg" },
  { name: "Montréal", country: "Canada" },
  { name: "Genève", country: "Suisse" },
  { name: "Lausanne", country: "Suisse" },
  { name: "Marrakech", country: "Maroc" },
  { name: "Casablanca", country: "Maroc" },
  { name: "Tunis", country: "Tunisie" },
  { name: "Dakar", country: "Sénégal" },
  { name: "Abidjan", country: "Côte d'Ivoire" },
  { name: "Yaoundé", country: "Cameroun" },
  { name: "Libreville", country: "Gabon" },
  { name: "Beyrouth", country: "Liban" },
  { name: "Dubai", country: "UAE" }
];

const industries = [
  "Technology",
  "SaaS",
  "AI",
  "Data",
  "Finance",
  "Retail",
  "Healthcare",
  "Education",
  "Consulting",
  "Media",
  "Real Estate",
  "Energy",
  "Transport",
  "Food",
  "Legal",
  "Marketing",
  "Telecom",
  "Insurance",
  "Construction",
  "Automotive"
];

const roles = [
  "CTO",
  "VP Engineering",
  "CEO",
  "Founder",
  "Director of Tech",
  "Engineering Manager",
  "Tech Lead",
  "Senior Developer",
  "Product Manager",
  "Head of Growth",
  "CIO",
  "IT Director",
  "DevOps Engineer",
  "Data Scientist",
  "Full Stack Developer",
  "Cloud Architect",
  "Security Engineer",
  "Scrum Master",
  "Product Owner",
  "Business Analyst"
];

const companies = [
  "TechCorp",
  "InnovateTech",
  "GrowthSaaS",
  "StartupX",
  "DataFlow",
  "CloudScale",
  "DevOpsInc",
  "AIStartup",
  "TechTeam",
  "CodeBase",
  "DevWorld",
  "ScaleUp",
  "TechGrowth",
  "CloudFirst",
  "InnovateLab",
  "DataDriven",
  "TechVision",
  "CodeCraft",
  "AIWorks",
  "TechNova",
  "CloudNative",
  "ScaleTech",
  "DevOpsPro",
  "DataMinds",
  "TechMarseille",
  "NiceTech",
  "LilleStartup",
  "NantesTech",
  "StrasbourgAI",
  "ToulouseData",
  "RennesTech",
  "MontpellierDev",
  "GrenobleAI",
  "ToursCloud",
  "NancyTech",
  "MetzData",
  "DijonSoft",
  "ReimsWeb",
  "HavreDigital",
  "ToulonSys",
  "AngersCode",
  "BrestTech",
  "CaenSoft",
  "ClermontDev",
  "LimogesData",
  "AmiensWeb",
  "PerpignanTech",
  "BesançonSoft",
  "OrléansCloud",
  "MulhouseDev"
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomStatus() {
  const statuses = [
    "identified",
    "connected",
    "contacted",
    "responded",
    "interested",
    "converted"
  ];
  const weights = [0.15, 0.15, 0.2, 0.2, 0.15, 0.15];
  const rand = Math.random();
  let cum = 0;
  for (let i = 0; i < statuses.length; i++) {
    cum += weights[i];
    if (rand < cum) return statuses[i];
  }
  return "identified";
}

function generateProspectName(index) {
  const firstNames = [
    "Marie",
    "Jean",
    "Sophie",
    "Pierre",
    "Claire",
    "Lucas",
    "Emma",
    "Thomas",
    "Julie",
    "Antoine",
    "Camille",
    "Hugo",
    "Léa",
    "Paul",
    "Sarah",
    "Maxime",
    "Chloe",
    "Nicolas",
    "Alexandre",
    "Isabelle",
    "François",
    "Catherine",
    "David",
    "Anne",
    "Marc",
    "Laura",
    "Guillaume",
    "Valérie",
    "Eric",
    "Nathalie",
    "Olivier",
    "Sandrine",
    "Philippe",
    "Charlotte",
    "Mathieu",
    "Audrey",
    "Sylvain",
    "Caroline",
    "Damien",
    "Elodie",
    "Jérôme",
    "Bénédicte",
    "Romain",
    "Virginie",
    "Fabien",
    "Céline",
    "Grégory",
    "Mélanie",
    "Christophe",
    "Jessica",
    "Anthony",
    "Aurélie",
    "Kevin",
    "Laëtitia",
    "Sébastien",
    "Manon",
    "Alexis",
    "Marion",
    "Quentin",
    "Justine",
    "Baptiste",
    "Amandine",
    "Florian",
    "Margaux",
    "Thibault",
    "Stéphanie",
    "Adrien",
    "Laurine",
    "Vincent",
    "Solène",
    "Jonathan",
    "Émilie",
    "Benjamin",
    "Pauline",
    "Loïc",
    "Marine",
    "Cédric",
    "Juliette",
    "Gauthier",
    "Inès",
    "Yannick",
    "Léna",
    "Maxence",
    "Alice",
    "Kévin",
    "Zoé",
    "Raphaël",
    "Eva",
    "Samuel",
    "Noémie",
    "Théo",
    "Louna",
    "Tom",
    "Maëlle",
    "Noah",
    "Capucine",
    "Enzo",
    "Lilou",
    "Mathis",
    "Elena",
    "Nathan",
    "Julia",
    "Liam",
    "Lisa",
    "Gabriel",
    "Anna",
    "Adam",
    "Sarah",
    "Rayan",
    "Manon",
    "Youssef",
    "Fatima",
    "Omar",
    "Aïcha",
    "Karim",
    "Yasmin",
    "Mehdi",
    "Salma",
    "Amine",
    "Nadia",
    "Hamza",
    "Rania",
    "Tariq",
    "Lina",
    "Idriss",
    "Dounia",
    "Sofiane",
    "Samira",
    "Bilal",
    "Khadija",
    "Reda"
  ];
  const lastNames = [
    "Dupont",
    "Martin",
    "Bernard",
    "Leroy",
    "Moreau",
    "Petit",
    "Robert",
    "Richard",
    "Dubois",
    "Laurent",
    "Simon",
    "Michel",
    "Garcia",
    "David",
    "Bertrand",
    "Roux",
    "Vincent",
    "Fournier",
    "Lefebvre",
    "Mercier",
    "Blanc",
    "Chevalier",
    "Rousseau",
    "Guerin",
    "Muller",
    "Fontaine",
    "Garnier",
    "Rousseau",
    "Blanc",
    "Guerin",
    "Muller",
    "Fontaine",
    "Garnier",
    "Perrin",
    "Morin",
    "Nicolas",
    "Marchand",
    "Duval",
    "Brunet",
    "Hubert",
    "Louis",
    "Deschamps",
    "Meyer",
    "André",
    "Masson",
    "Faure",
    "Lemaire",
    "Roy",
    "Barbier",
    "Dumas",
    "Brun",
    "François",
    "Gérard",
    "Caron",
    "Philippe",
    "Chevallier",
    "Aubert",
    "Denis",
    "Bourgeois",
    "Renard",
    "Lacroix",
    "Leclerc",
    "Girard",
    "Joly",
    "Picard",
    "Gaillard",
    "Roger",
    "Sanchez",
    "Dupuis",
    "Colin",
    "Leroux",
    "Clement",
    "Gauthier",
    "Sutherland",
    "Nguyen",
    "Lefort",
    "Dufour",
    "Rolland",
    "Moulin",
    "Jacquet",
    "Valentin",
    "Bouvier",
    "Lamy",
    "Rey",
    "Benoit",
    "Pons",
    "Hamel",
    "Delaunay",
    "Maillard",
    "Poulain",
    "Tessier",
    "Legros",
    "Weber",
    "Fernandez",
    "Lopes",
    "Imbert",
    "Chartier",
    "Pelletier",
    "Bouchet",
    "Maury",
    "Cohen",
    "Lejeune",
    "Klein",
    "Jacques",
    "Boulanger",
    "Prevost",
    "Marchal",
    "Carpentier",
    "Didier",
    "Becker",
    "Gosselin",
    "Michaud",
    "Lemoine",
    "Hervé",
    "Cordier",
    "Monnier",
    "Pereira",
    "Marques",
    "Ribeiro",
    "Ferreira",
    "Alves",
    "Santos",
    "Oliveira",
    "Silva",
    "Souza",
    "Lima",
    "Costa",
    "Martins",
    "Rodrigues",
    "Almeida",
    "Nascimento",
    "Carvalho",
    "Araujo",
    "Moreira",
    "Benoit",
    "Pelletier",
    "Gagnon",
    "Roy",
    "Tremblay",
    "Côté",
    "Gauthier",
    "Morin",
    "Lavoie",
    "Fortin",
    "Gagné",
    "Ouellet",
    "Petit",
    "Bouchard",
    "Poirier",
    "Lemieux",
    "Renaud",
    "Savard",
    "Lessard",
    "Hénault",
    "Bérubé",
    "Dubé",
    "Lachance",
    "Ménard",
    "Villeneuve",
    "Rivard",
    "Laplante",
    "Marchand",
    "Plante",
    "Bédard",
    "Bernier",
    "Maltais",
    "Dion",
    "Labonté",
    "Champagne",
    "Fortier",
    "Giroux",
    "Martel",
    "Blais",
    "Dufresne",
    "Couture",
    "Larose",
    "Laliberté",
    "Vachon",
    "Paquette",
    "Gervais",
    "Desjardins",
    "Beaudoin",
    "Lauzon",
    "Houde",
    "Lemire",
    "Perreault",
    "Gravel",
    "Thibault",
    "Gagné",
    "Beaulieu",
    "Paradis",
    "Boucher",
    "Lacroix",
    "Caron",
    "Lévesque",
    "Perron",
    "Lepage",
    "Rochon",
    "Goulet",
    "Audet",
    "Cyr",
    "Parent",
    "Giguère",
    "Langevin",
    "Pilon",
    "Jacques"
  ];
  return `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]}`;
}

async function seedExtraData() {
  console.log(
    "🌱 Ajout de données supplémentaires pour ProspectMap et Heatmap..."
  );

  try {
    // 1. Ajouter 80 prospects supplémentaires répartis géographiquement
    console.log("👥 Ajout de 80 prospects supplémentaires...");
    const prospectValues = [];
    for (let i = 31; i <= 110; i++) {
      const city = randomChoice(cities);
      const industry = randomChoice(industries);
      const role = randomChoice(roles);
      const company = randomChoice(companies);
      const status = randomStatus();
      const score = randomInt(25, 95);
      const daysAgo = randomInt(1, 60);
      const updatedDaysAgo = Math.max(1, daysAgo - randomInt(0, 20));

      prospectValues.push(
        `('linkedin.com/in/p${i}', '${generateProspectName(i)}', '${role}', '${company}', '${industry}', '${city.name}', '50-200', ${score}, '${status}', NOW() - INTERVAL '${daysAgo} days', NOW() - INTERVAL '${updatedDaysAgo} days')`
      );
    }

    await pool.query(`
      INSERT INTO prospects (linkedin_url, name, role, company, industry, location, company_size, score, status, created_at, updated_at)
      VALUES ${prospectValues.join(", ")}
    `);
    console.log("✅ 80 prospects supplémentaires insérés");

    // 2. Ajouter 150 messages avec horaires variés pour la heatmap
    console.log("💬 Ajout de 150 messages pour la heatmap...");
    const messageValues = [];
    const statuses = ["sent", "replied"];
    const statusWeights = [0.55, 0.45]; // 55% sent, 45% replied

    for (let i = 0; i < 150; i++) {
      const campaignId = randomInt(1, 4);
      const prospectId = randomInt(1, 110);
      const daysAgo = randomInt(1, 60);
      const hour = randomInt(8, 18); // Heures de bureau
      const minute = randomInt(0, 59);
      const dayOfWeek = randomInt(0, 6); // 0=dimanche, 6=samedi

      // Choisir le statut avec les poids
      const rand = Math.random();
      let status = "sent";
      let cum = 0;
      for (let j = 0; j < statuses.length; j++) {
        cum += statusWeights[j];
        if (rand < cum) {
          status = statuses[j];
          break;
        }
      }

      // Privilégier les jours de semaine (lundi-vendredi)
      const finalDayOfWeek = Math.random() < 0.75 ? randomInt(1, 5) : dayOfWeek;

      // Construire la date avec le bon jour de la semaine
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() - daysAgo);
      // Ajuster pour avoir le bon jour de la semaine
      const currentDay = baseDate.getDay();
      const diff = finalDayOfWeek - currentDay;
      baseDate.setDate(baseDate.getDate() + diff);

      const timestamp = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, "0")}-${String(baseDate.getDate()).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;

      messageValues.push(
        `(${campaignId}, ${prospectId}, 'Prospect ${prospectId}', 'Role ${prospectId}', 'Company ${prospectId}', 'Message de test pour la heatmap...', 'connection', '${status}', '${timestamp}')`
      );
    }

    // Insérer par batches de 50 pour éviter les requêtes trop longues
    for (let i = 0; i < messageValues.length; i += 50) {
      const batch = messageValues.slice(i, i + 50);
      await pool.query(`
        INSERT INTO messages (campaign_id, prospect_id, recipient_name, recipient_role, recipient_company, message_text, message_type, status, created_at)
        VALUES ${batch.join(", ")}
      `);
    }
    console.log("✅ 150 messages supplémentaires insérés");

    // 3. Ajouter plus de tool steps
    console.log("🤖 Ajout de tool steps supplémentaires...");
    const tools = [
      "search_prospects",
      "visit_profile",
      "send_connection",
      "send_message",
      "analyze_profile"
    ];
    const toolValues = [];
    for (let i = 0; i < 50; i++) {
      const convId = `conv-${100 + i}`;
      const tool = randomChoice(tools);
      const status = Math.random() < 0.85 ? "success" : "error";
      const daysAgo = randomInt(1, 30);
      toolValues.push(
        `('${convId}', '${tool}', '{"param": "value"}', 'Result ${i}', '${status}', NOW() - INTERVAL '${daysAgo} days')`
      );
    }

    for (let i = 0; i < toolValues.length; i += 50) {
      const batch = toolValues.slice(i, i + 50);
      await pool.query(`
        INSERT INTO agent_tool_steps (conversation_id, tool_name, args, result, status, created_at)
        VALUES ${batch.join(", ")}
      `);
    }
    console.log("✅ 50 tool steps supplémentaires insérés");

    // 4. Ajouter plus d'actions LinkedIn
    console.log("📋 Ajout d'actions LinkedIn supplémentaires...");
    const actionTypes = [
      "search",
      "visit_profile",
      "send_connection",
      "send_message"
    ];
    const actionStatuses = ["completed", "pending_approval", "failed"];
    const actionWeights = [0.7, 0.2, 0.1];
    const actionValues = [];

    for (let i = 0; i < 40; i++) {
      const type = randomChoice(actionTypes);
      const daysAgo = randomInt(1, 30);

      const rand = Math.random();
      let status = actionStatuses[0];
      let cum = 0;
      for (let j = 0; j < actionStatuses.length; j++) {
        cum += actionWeights[j];
        if (rand < cum) {
          status = actionStatuses[j];
          break;
        }
      }

      const executedAt =
        status === "completed" ? `NOW() - INTERVAL '${daysAgo} days'` : "NULL";

      actionValues.push(
        `('${type}', 'linkedin.com/in/extra${i}', 'Extra User ${i}', '${status}', ${executedAt}, NOW() - INTERVAL '${daysAgo} days')`
      );
    }

    await pool.query(`
      INSERT INTO linkedin_actions_queue (action_type, target_url, target_name, status, executed_at, created_at)
      VALUES ${actionValues.join(", ")}
    `);
    console.log("✅ 40 actions LinkedIn supplémentaires insérées");

    // Vérification
    const [prospectsCount, messagesCount, toolStepsCount, actionsCount] =
      await Promise.all([
        pool.query("SELECT COUNT(*) FROM prospects"),
        pool.query("SELECT COUNT(*) FROM messages"),
        pool.query("SELECT COUNT(*) FROM agent_tool_steps"),
        pool.query("SELECT COUNT(*) FROM linkedin_actions_queue")
      ]);

    console.log("\n📊 Vérification finale:");
    console.log(`   - Total prospects: ${prospectsCount.rows[0].count}`);
    console.log(`   - Total messages: ${messagesCount.rows[0].count}`);
    console.log(`   - Total tool steps: ${toolStepsCount.rows[0].count}`);
    console.log(`   - Total actions: ${actionsCount.rows[0].count}`);

    // Stats par ville
    const cityStats = await pool.query(`
      SELECT location, COUNT(*) as count, COUNT(*) FILTER (WHERE status = 'converted') as converted
      FROM prospects
      GROUP BY location
      ORDER BY count DESC
      LIMIT 15
    `);
    console.log("\n🏙️  Top 15 villes:");
    cityStats.rows.forEach((row) => {
      console.log(
        `   ${row.location}: ${row.count} prospects (${row.converted} convertis)`
      );
    });

    // Stats heatmap
    const heatmapStats = await pool.query(`
      SELECT
        EXTRACT(DOW FROM created_at) as day_of_week,
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'replied') as replies
      FROM messages
      WHERE created_at > NOW() - INTERVAL '60 days'
      GROUP BY day_of_week, hour
      ORDER BY day_of_week, hour
    `);
    console.log("\n🔥 Heatmap (jour × heure) - nombre de messages:");
    const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    for (let d = 0; d < 7; d++) {
      const dayData = heatmapStats.rows.filter(
        (r) => parseInt(r.day_of_week) === d
      );
      if (dayData.length > 0) {
        const total = dayData.reduce((s, r) => s + parseInt(r.count), 0);
        const replies = dayData.reduce((s, r) => s + parseInt(r.replies), 0);
        console.log(`   ${days[d]}: ${total} messages (${replies} réponses)`);
      }
    }

    console.log("\n🎉 Données supplémentaires insérées avec succès !");
  } catch (error) {
    console.error("❌ Erreur:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedExtraData();
