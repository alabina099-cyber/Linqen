// Script to enrich Prospect Intelligence Map (geo, industries, scores, quadrant)
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Rich cities for the geo map
const geoLocations = [
  // Mainland France
  "Paris",
  "Lyon",
  "Marseille",
  "Bordeaux",
  "Nantes",
  "Strasbourg",
  "Lille",
  "Toulouse",
  "Nice",
  "Rennes",
  "Montpellier",
  "Grenoble",
  "Tours",
  "Nancy",
  "Metz",
  "Dijon",
  "Reims",
  "Le Havre",
  "Toulon",
  "Angers",
  "Brest",
  "Caen",
  "Clermont-Ferrand",
  "Limoges",
  "Amiens",
  "Perpignan",
  "Besancon",
  "Orleans",
  "Mulhouse",
  "Rouen",
  "La Rochelle",
  "Poitiers",
  "Blois",
  // Switzerland
  "Geneva",
  "Lausanne",
  "Zurich",
  "Basel",
  "Berne",
  // Belgium
  "Brussels",
  "Antwerp",
  "Ghent",
  "Liege",
  "Namur",
  // Luxembourg
  "Luxembourg",
  // Canada
  "Montreal",
  "Quebec",
  "Toronto",
  "Vancouver",
  "Ottawa",
  // Overseas territories + French-speaking Africa
  "Abidjan",
  "Dakar",
  "Yaounde",
  "Libreville",
  "Casablanca",
  "Tunis",
  "Pointe-a-Pitre",
  "Saint-Denis",
  "Fort-de-France",
  "Noumea",
  // Europe
  "London",
  "Berlin",
  "Amsterdam",
  "Madrid",
  "Barcelona",
  "Milan",
  "Rome",
  "Lisbon",
  "Dublin",
  "Vienna",
  "Copenhagen",
  "Stockholm",
  "Oslo",
  "Helsinki",
  "Prague",
  "Varsovie",
  "Budapest",
  "Athens",
  // Remote
  "Remote"
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
  "Automotive",
  "E-commerce",
  "Gaming",
  "Cybersecurity",
  "Cloud",
  "Blockchain",
  "Biotech",
  "AgriTech",
  "CleanTech",
  "EdTech",
  "PropTech",
  "LegalTech",
  "HealthTech",
  "InsurTech",
  "Martech",
  "Fintech"
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
  "Business Analyst",
  "Machine Learning Engineer",
  "Site Reliability Engineer",
  "Platform Engineer",
  "Backend Developer",
  "Frontend Developer",
  "Mobile Developer",
  "UI/UX Designer",
  "QA Engineer",
  "Release Manager",
  "Solutions Architect",
  "Enterprise Architect",
  "Data Engineer",
  "BI Developer",
  "CRM Manager",
  "Growth Hacker"
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
  "MulhouseDev",
  "RouenData",
  "GenevaTech",
  "LausanneSoft",
  "ZurichCloud",
  "BaselDev",
  "BrusselsTech",
  "AntwerpData",
  "GhentSoft",
  "LiegeDev",
  "LuxCloud",
  "MontrealTech",
  "QuebecSoft",
  "TorontoData",
  "VancouverDev",
  "OttawaCloud",
  "AbidjanTech",
  "DakarSoft",
  "YaoundeData",
  "LibrevilleDev",
  "CasablancaCloud",
  "LondonTech",
  "BerlinSoft",
  "AmsterdamData",
  "MadridDev",
  "BarcelonaCloud"
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
  const weights = [0.12, 0.13, 0.18, 0.2, 0.17, 0.2];
  const rand = Math.random();
  let cum = 0;
  for (let i = 0; i < statuses.length; i++) {
    cum += weights[i];
    if (rand < cum) return statuses[i];
  }
  return "identified";
}

function generateName(index) {
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
    "Francois",
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
    "Laetitia",
    "Sebastien",
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
    "Noah"
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
    "Francois",
    "Gérard",
    "Caron",
    "Philippe",
    "Chevallier"
  ];
  return `${firstNames[index % firstNames.length]} ${lastNames[(index * 3) % lastNames.length]}`;
}

async function seedProspectMap() {
  console.log("🌍 Adding prospects to enrich Prospect Intelligence Map...");

  try {
    const prospectValues = [];

    // Generate 200 additional prospects with targeted distribution
    for (let i = 111; i <= 310; i++) {
      const location = randomChoice(geoLocations);
      const industry = randomChoice(industries);
      const role = randomChoice(roles);
      const company = randomChoice(companies);
      const status = randomStatus();

      // Score distribution to fill the ICP quadrant
      // Champions: score 80-100, status advanced
      // Hot: score 60-79, status advanced
      // Warm: score 40-59, status medium
      // Cold: score 0-39, status early
      let score;
      const rand = Math.random();
      if (rand < 0.15)
        score = randomInt(85, 100); // Champions
      else if (rand < 0.35)
        score = randomInt(70, 84); // Hot
      else if (rand < 0.6)
        score = randomInt(50, 69); // Warm
      else if (rand < 0.8)
        score = randomInt(35, 49); // Cold/Warm
      else score = randomInt(20, 34); // Cold

      const daysAgo = randomInt(1, 60);
      const updatedDaysAgo = Math.max(1, daysAgo - randomInt(0, 20));

      prospectValues.push(
        `('linkedin.com/in/p${i}', '${generateName(i)}', '${role}', '${company}', '${industry}', '${location}', '50-200', ${score}, '${status}', NOW() - INTERVAL '${daysAgo} days', NOW() - INTERVAL '${updatedDaysAgo} days')`
      );
    }

    // Insert in batches
    const batchSize = 50;
    for (let i = 0; i < prospectValues.length; i += batchSize) {
      const batch = prospectValues.slice(i, i + batchSize);
      await pool.query(`
        INSERT INTO prospects (linkedin_url, name, role, company, industry, location, company_size, score, status, created_at, updated_at)
        VALUES ${batch.join(", ")}
      `);
    }
    console.log(`✅ 200 additional prospects inserted`);

    // Verification by city
    const cityStats = await pool.query(`
      SELECT location, COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'converted') as converted
      FROM prospects
      GROUP BY location
      ORDER BY count DESC
      LIMIT 20
    `);
    console.log("\n🏙️  Top 20 cities:");
    cityStats.rows.forEach((row) => {
      console.log(
        `   ${row.location}: ${row.count} prospects (${row.converted} converted)`
      );
    });

    // Verification by industry
    const industryStats = await pool.query(`
      SELECT industry, COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'converted') as converted,
        ROUND(AVG(score)::numeric, 1) as avg_score
      FROM prospects
      GROUP BY industry
      ORDER BY count DESC
      LIMIT 15
    `);
    console.log("\n🏭 Top 15 industries:");
    industryStats.rows.forEach((row) => {
      console.log(
        `   ${row.industry}: ${row.count} prospects, average score ${row.avg_score} (${row.converted} converted)`
      );
    });

    // Verification by score (for the ICP quadrant)
    const scoreStats = await pool.query(`
      SELECT
        CASE
          WHEN score >= 80 THEN 'Champions (80-100)'
          WHEN score >= 60 THEN 'Hot (60-79)'
          WHEN score >= 40 THEN 'Warm (40-59)'
          ELSE 'Cold (0-39)'
        END AS quadrant,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'converted') as converted
      FROM prospects
      GROUP BY
        CASE
          WHEN score >= 80 THEN 'Champions (80-100)'
          WHEN score >= 60 THEN 'Hot (60-79)'
          WHEN score >= 40 THEN 'Warm (40-59)'
          ELSE 'Cold (0-39)'
        END
      ORDER BY
        CASE
          WHEN MIN(score) >= 80 THEN 1
          WHEN MIN(score) >= 60 THEN 2
          WHEN MIN(score) >= 40 THEN 3
          ELSE 4
        END
    `);
    console.log("\n🎯 ICP Quadrant:");
    scoreStats.rows.forEach((row) => {
      console.log(
        `   ${row.quadrant}: ${row.count} prospects (${row.converted} converted)`
      );
    });

    // Total
    const totalResult = await pool.query("SELECT COUNT(*) FROM prospects");
    console.log(`\n👥 Total prospects: ${totalResult.rows[0].count}`);
    console.log("\n🎉 Prospect Intelligence Map enriched!");
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedProspectMap();
