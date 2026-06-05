// Script pour insérer les données de test BI directement depuis Node.js
const { Pool } = require("pg");

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://neondb_owner:npg_uzan40Povxwp@ep-tiny-term-ai0m9euo-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
});

async function seedData() {
  console.log("🌱 Début de l'insertion des données de test BI...");

  try {
    // Nettoyage des tables existantes
    console.log("🧹 Nettoyage des tables existantes...");
    await pool.query(
      "TRUNCATE TABLE linkedin_actions_queue, agent_tool_steps, messages, prospects, templates, campaigns CASCADE"
    );
    // Réinitialiser les séquences
    await pool.query("ALTER SEQUENCE campaigns_id_seq RESTART WITH 1");
    await pool.query("ALTER SEQUENCE prospects_id_seq RESTART WITH 1");
    await pool.query("ALTER SEQUENCE messages_id_seq RESTART WITH 1");
    await pool.query("ALTER SEQUENCE templates_id_seq RESTART WITH 1");
    await pool.query("ALTER SEQUENCE agent_tool_steps_id_seq RESTART WITH 1");
    await pool.query(
      "ALTER SEQUENCE linkedin_actions_queue_id_seq RESTART WITH 1"
    );
    await pool.query("ALTER SEQUENCE agent_chat_history_id_seq RESTART WITH 1");
    console.log("✅ Tables nettoyées et séquences réinitialisées");

    // 1. Templates
    console.log("📝 Insertion des templates...");
    await pool.query(`
      INSERT INTO templates (name, tag, text, usage_count, conversion_rate) VALUES
      ('Invitation Pro', 'Invitation', 'Bonjour {{name}}, votre profil sur {{company}} m''a intéressé. J''aimerais échanger sur nos opportunités.', 45, 12),
      ('Follow-up 1', 'Follow-up', 'Suite à notre connexion, je vous partage notre deck sur l''automatisation LinkedIn.', 38, 18),
      ('Follow-up 2', 'Follow-up', 'Avez-vous eu le temps de regarder notre proposition ? Je suis disponible pour un call.', 22, 25),
      ('Opportunité', 'Opportunité', 'Nous recherchons des profils comme le vôtre pour notre équipe growth. Discutons-en ?', 30, 15),
      ('Cold outreach', 'Cold', 'Découvrez comment nos clients ont boosté leur prospection de 300% grâce à l''IA.', 50, 8),
      ('Webinaire', 'Invitation', 'Invitation à notre webinaire sur l''IA dans les ventes B2B.', 25, 20),
      ('Partenariat', 'Opportunité', 'Je pense qu''un partenariat entre nos entreprises pourrait créer de la valeur.', 15, 22),
      ('Lancement produit', 'Cold', 'Notre nouvelle plateforme d''automatisation est en beta. Voulez-vous la tester ?', 35, 10)
    `);
    console.log("✅ Templates insérés");

    // 2. Campagnes
    console.log("📊 Insertion des campagnes...");
    const campaignsResult = await pool.query(`
      INSERT INTO campaigns (name, status, target, industry, location, company_size, connections_sent, connections_accepted, contacted, replied, converted) VALUES
      ('Campagne Tech Paris', 'active', 'CTO, VP Engineering', 'Tech', 'Paris', '50-200', 120, 85, 70, 45, 12),
      ('Campagne Finance Lyon', 'active', 'Directeur Financier', 'Finance', 'Lyon', '200-500', 90, 60, 50, 30, 8),
      ('Campagne SaaS Global', 'draft', 'CEO, Founder', 'SaaS', 'Remote', '10-50', 45, 30, 25, 18, 5),
      ('Campagne Retail Bordeaux', 'paused', 'E-commerce Manager', 'Retail', 'Bordeaux', '100-500', 60, 40, 35, 20, 4)
      RETURNING id
    `);
    console.log(
      "✅ Campagnes insérées, IDs:",
      campaignsResult.rows.map((r) => r.id)
    );

    // 3. Prospects
    console.log("👥 Insertion des prospects...");
    await pool.query(`
      INSERT INTO prospects (linkedin_url, name, role, company, industry, location, company_size, score, status, created_at, updated_at) VALUES
      ('linkedin.com/in/p1', 'Marie Dupont', 'CTO', 'TechCorp', 'Technology', 'Paris', '50-200', 85, 'converted', NOW() - INTERVAL '55 days', NOW() - INTERVAL '40 days'),
      ('linkedin.com/in/p2', 'Jean Martin', 'VP Engineering', 'InnovateTech', 'Technology', 'Lyon', '50-200', 82, 'converted', NOW() - INTERVAL '50 days', NOW() - INTERVAL '35 days'),
      ('linkedin.com/in/p3', 'Sophie Bernard', 'CEO', 'GrowthSaaS', 'SaaS', 'Remote', '10-50', 90, 'converted', NOW() - INTERVAL '45 days', NOW() - INTERVAL '30 days'),
      ('linkedin.com/in/p4', 'Pierre Leroy', 'Founder', 'StartupX', 'SaaS', 'Paris', '10-50', 88, 'converted', NOW() - INTERVAL '40 days', NOW() - INTERVAL '25 days'),
      ('linkedin.com/in/p5', 'Claire Moreau', 'CTO', 'DataFlow', 'Technology', 'Bordeaux', '50-200', 84, 'converted', NOW() - INTERVAL '35 days', NOW() - INTERVAL '20 days'),
      ('linkedin.com/in/p6', 'Lucas Petit', 'VP Engineering', 'CloudScale', 'Technology', 'Paris', '200-500', 75, 'interested', NOW() - INTERVAL '30 days', NOW() - INTERVAL '15 days'),
      ('linkedin.com/in/p7', 'Emma Robert', 'Director of Tech', 'DevOpsInc', 'Technology', 'Lyon', '50-200', 72, 'interested', NOW() - INTERVAL '28 days', NOW() - INTERVAL '12 days'),
      ('linkedin.com/in/p8', 'Thomas Richard', 'CTO', 'AIStartup', 'AI', 'Remote', '10-50', 78, 'interested', NOW() - INTERVAL '25 days', NOW() - INTERVAL '10 days'),
      ('linkedin.com/in/p9', 'Julie Dubois', 'Engineering Manager', 'TechTeam', 'Technology', 'Paris', '50-200', 65, 'responded', NOW() - INTERVAL '22 days', NOW() - INTERVAL '8 days'),
      ('linkedin.com/in/p10', 'Antoine Laurent', 'Tech Lead', 'CodeBase', 'Technology', 'Lyon', '50-200', 62, 'responded', NOW() - INTERVAL '20 days', NOW() - INTERVAL '7 days'),
      ('linkedin.com/in/p11', 'Camille Simon', 'Senior Developer', 'DevWorld', 'Technology', 'Bordeaux', '50-200', 68, 'responded', NOW() - INTERVAL '18 days', NOW() - INTERVAL '6 days'),
      ('linkedin.com/in/p12', 'Hugo Michel', 'CTO', 'ScaleUp', 'SaaS', 'Remote', '10-50', 70, 'responded', NOW() - INTERVAL '15 days', NOW() - INTERVAL '5 days'),
      ('linkedin.com/in/p13', 'Léa Garcia', 'VP Engineering', 'TechGrowth', 'Technology', 'Paris', '200-500', 55, 'contacted', NOW() - INTERVAL '12 days', NOW() - INTERVAL '3 days'),
      ('linkedin.com/in/p14', 'Paul David', 'Director of Engineering', 'CloudFirst', 'Technology', 'Lyon', '50-200', 52, 'contacted', NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 days'),
      ('linkedin.com/in/p15', 'Sarah Bertrand', 'CTO', 'InnovateLab', 'AI', 'Remote', '10-50', 58, 'contacted', NOW() - INTERVAL '8 days', NOW() - INTERVAL '1 day'),
      ('linkedin.com/in/p16', 'Maxime Roux', 'Tech Lead', 'DataDriven', 'Data', 'Paris', '50-200', 50, 'contacted', NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day'),
      ('linkedin.com/in/p17', 'Chloe Vincent', 'Engineering Manager', 'TechVision', 'Technology', 'Bordeaux', '50-200', 45, 'connected', NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),
      ('linkedin.com/in/p18', 'Nicolas Fournier', 'Senior Developer', 'CodeCraft', 'Technology', 'Lyon', '50-200', 42, 'connected', NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day'),
      ('linkedin.com/in/p19', 'Marie Martinez', 'CTO', 'AIWorks', 'AI', 'Remote', '10-50', 48, 'connected', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day'),
      ('linkedin.com/in/p20', 'Alexandre Lefebvre', 'VP Engineering', 'TechNova', 'Technology', 'Paris', '200-500', 35, 'identified', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
      ('linkedin.com/in/p21', 'Isabelle Morel', 'Director of Tech', 'CloudNative', 'Technology', 'Lyon', '50-200', 38, 'identified', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
      ('linkedin.com/in/p22', 'François Henry', 'CTO', 'ScaleTech', 'SaaS', 'Remote', '10-50', 40, 'identified', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
      ('linkedin.com/in/p23', 'Catherine Poulain', 'Engineering Manager', 'DevOpsPro', 'Technology', 'Bordeaux', '50-200', 32, 'identified', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
      ('linkedin.com/in/p24', 'David Lemoine', 'Tech Lead', 'DataMinds', 'Data', 'Paris', '50-200', 36, 'identified', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
      ('linkedin.com/in/p25', 'Anne Fontaine', 'CTO', 'TechMarseille', 'Technology', 'Marseille', '50-200', 55, 'contacted', NOW() - INTERVAL '15 days', NOW() - INTERVAL '5 days'),
      ('linkedin.com/in/p26', 'Marc Garnier', 'VP Engineering', 'NiceTech', 'Technology', 'Nice', '50-200', 52, 'connected', NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 days'),
      ('linkedin.com/in/p27', 'Laura Rousseau', 'CEO', 'LilleStartup', 'SaaS', 'Lille', '10-50', 70, 'interested', NOW() - INTERVAL '20 days', NOW() - INTERVAL '8 days'),
      ('linkedin.com/in/p28', 'Guillaume Blanc', 'CTO', 'NantesTech', 'Technology', 'Nantes', '50-200', 48, 'responded', NOW() - INTERVAL '18 days', NOW() - INTERVAL '6 days'),
      ('linkedin.com/in/p29', 'Valérie Guerin', 'VP Engineering', 'StrasbourgAI', 'AI', 'Strasbourg', '10-50', 65, 'converted', NOW() - INTERVAL '25 days', NOW() - INTERVAL '15 days'),
      ('linkedin.com/in/p30', 'Eric Muller', 'Director of Tech', 'ToulouseData', 'Data', 'Toulouse', '50-200', 58, 'interested', NOW() - INTERVAL '22 days', NOW() - INTERVAL '10 days')
    `);
    console.log("✅ Prospects insérés");

    // 4. Messages
    console.log("💬 Insertion des messages...");
    await pool.query(`
      INSERT INTO messages (campaign_id, prospect_id, recipient_name, recipient_role, recipient_company, message_text, message_type, status, created_at) VALUES
      (1, 1, 'Marie Dupont', 'CTO', 'TechCorp', 'Bonjour Marie, votre profil sur TechCorp m''a intéressé...', 'connection', 'replied', NOW() - INTERVAL '54 days'),
      (1, 1, 'Marie Dupont', 'CTO', 'TechCorp', 'Suite à notre connexion, je vous partage notre deck...', 'message', 'replied', NOW() - INTERVAL '53 days'),
      (1, 2, 'Jean Martin', 'VP Engineering', 'InnovateTech', 'Bonjour Jean, votre profil sur InnovateTech m''a intéressé...', 'connection', 'replied', NOW() - INTERVAL '49 days'),
      (1, 3, 'Sophie Bernard', 'CEO', 'GrowthSaaS', 'Bonjour Sophie, votre profil sur GrowthSaaS m''a intéressé...', 'connection', 'replied', NOW() - INTERVAL '44 days'),
      (2, 4, 'Pierre Leroy', 'Founder', 'StartupX', 'Bonjour Pierre, votre profil sur StartupX m''a intéressé...', 'connection', 'replied', NOW() - INTERVAL '39 days'),
      (1, 5, 'Claire Moreau', 'CTO', 'DataFlow', 'Bonjour Claire, votre profil sur DataFlow m''a intéressé...', 'connection', 'replied', NOW() - INTERVAL '34 days'),
      (1, 6, 'Lucas Petit', 'VP Engineering', 'CloudScale', 'Bonjour Lucas, votre profil sur CloudScale m''a intéressé...', 'connection', 'replied', NOW() - INTERVAL '29 days'),
      (1, 7, 'Emma Robert', 'Director of Tech', 'DevOpsInc', 'Bonjour Emma, votre profil sur DevOpsInc m''a intéressé...', 'connection', 'replied', NOW() - INTERVAL '27 days'),
      (3, 8, 'Thomas Richard', 'CTO', 'AIStartup', 'Bonjour Thomas, votre profil sur AIStartup m''a intéressé...', 'connection', 'replied', NOW() - INTERVAL '24 days'),
      (1, 9, 'Julie Dubois', 'Engineering Manager', 'TechTeam', 'Bonjour Julie, votre profil sur TechTeam m''a intéressé...', 'connection', 'replied', NOW() - INTERVAL '21 days'),
      (2, 10, 'Antoine Laurent', 'Tech Lead', 'CodeBase', 'Bonjour Antoine, votre profil sur CodeBase m''a intéressé...', 'connection', 'replied', NOW() - INTERVAL '19 days'),
      (1, 11, 'Camille Simon', 'Senior Developer', 'DevWorld', 'Bonjour Camille, votre profil sur DevWorld m''a intéressé...', 'connection', 'replied', NOW() - INTERVAL '17 days'),
      (3, 12, 'Hugo Michel', 'CTO', 'ScaleUp', 'Bonjour Hugo, votre profil sur ScaleUp m''a intéressé...', 'connection', 'replied', NOW() - INTERVAL '14 days'),
      (1, 13, 'Léa Garcia', 'VP Engineering', 'TechGrowth', 'Bonjour Léa, votre profil sur TechGrowth m''a intéressé...', 'connection', 'sent', NOW() - INTERVAL '11 days'),
      (2, 14, 'Paul David', 'Director of Engineering', 'CloudFirst', 'Bonjour Paul, votre profil sur CloudFirst m''a intéressé...', 'connection', 'sent', NOW() - INTERVAL '9 days'),
      (1, 15, 'Sarah Bertrand', 'CTO', 'InnovateLab', 'Bonjour Sarah, votre profil sur InnovateLab m''a intéressé...', 'connection', 'sent', NOW() - INTERVAL '7 days'),
      (1, 16, 'Maxime Roux', 'Tech Lead', 'DataDriven', 'Bonjour Maxime, votre profil sur DataDriven m''a intéressé...', 'connection', 'sent', NOW() - INTERVAL '5 days'),
      (1, 17, 'Chloe Vincent', 'Engineering Manager', 'TechVision', 'Bonjour Chloe, votre profil sur TechVision m''a intéressé...', 'connection', 'sent', NOW() - INTERVAL '4 days'),
      (2, 18, 'Nicolas Fournier', 'Senior Developer', 'CodeCraft', 'Bonjour Nicolas, votre profil sur CodeCraft m''a intéressé...', 'connection', 'sent', NOW() - INTERVAL '3 days'),
      (3, 19, 'Marie Martinez', 'CTO', 'AIWorks', 'Bonjour Marie, votre profil sur AIWorks m''a intéressé...', 'connection', 'sent', NOW() - INTERVAL '2 days'),
      (1, 20, 'Alexandre Lefebvre', 'VP Engineering', 'TechNova', 'Bonjour Alexandre, votre profil sur TechNova m''a intéressé...', 'connection', 'sent', NOW() - INTERVAL '1 day' - INTERVAL '8 hours'),
      (2, 21, 'Isabelle Morel', 'Director of Tech', 'CloudNative', 'Bonjour Isabelle, votre profil sur CloudNative m''a intéressé...', 'connection', 'sent', NOW() - INTERVAL '1 day' - INTERVAL '6 hours'),
      (3, 22, 'François Henry', 'CTO', 'ScaleTech', 'Bonjour François, votre profil sur ScaleTech m''a intéressé...', 'connection', 'sent', NOW() - INTERVAL '1 day' - INTERVAL '4 hours'),
      (1, 23, 'Catherine Poulain', 'Engineering Manager', 'DevOpsPro', 'Bonjour Catherine, votre profil sur DevOpsPro m''a intéressé...', 'connection', 'sent', NOW() - INTERVAL '1 day' - INTERVAL '2 hours'),
      (2, 24, 'David Lemoine', 'Tech Lead', 'DataMinds', 'Bonjour David, votre profil sur DataMinds m''a intéressé...', 'connection', 'sent', NOW() - INTERVAL '1 day' - INTERVAL '1 hour'),
      (1, 25, 'Anne Fontaine', 'CTO', 'TechMarseille', 'Bonjour Anne, votre profil sur TechMarseille m''a intéressé...', 'connection', 'replied', NOW() - INTERVAL '14 days'),
      (2, 26, 'Marc Garnier', 'VP Engineering', 'NiceTech', 'Bonjour Marc, votre profil sur NiceTech m''a intéressé...', 'connection', 'sent', NOW() - INTERVAL '9 days'),
      (3, 27, 'Laura Rousseau', 'CEO', 'LilleStartup', 'Bonjour Laura, votre profil sur LilleStartup m''a intéressé...', 'connection', 'replied', NOW() - INTERVAL '19 days'),
      (1, 28, 'Guillaume Blanc', 'CTO', 'NantesTech', 'Bonjour Guillaume, votre profil sur NantesTech m''a intéressé...', 'connection', 'replied', NOW() - INTERVAL '17 days'),
      (2, 29, 'Valérie Guerin', 'VP Engineering', 'StrasbourgAI', 'Bonjour Valérie, votre profil sur StrasbourgAI m''a intéressé...', 'connection', 'replied', NOW() - INTERVAL '24 days'),
      (1, 30, 'Eric Muller', 'Director of Tech', 'ToulouseData', 'Bonjour Eric, votre profil sur ToulouseData m''a intéressé...', 'connection', 'replied', NOW() - INTERVAL '21 days')
    `);
    console.log("✅ Messages insérés");

    // 5. Agent tool steps
    console.log("🤖 Insertion des agent tool steps...");
    await pool.query(`
      INSERT INTO agent_tool_steps (conversation_id, tool_name, args, result, status, created_at) VALUES
      ('conv-001', 'search_prospects', '{"industry": "Technology", "location": "Paris"}', '25 prospects found', 'success', NOW() - INTERVAL '5 days'),
      ('conv-001', 'visit_profile', '{"prospect_id": 1}', 'Profile visited', 'success', NOW() - INTERVAL '5 days'),
      ('conv-001', 'send_connection', '{"prospect_id": 1}', 'Connection sent', 'success', NOW() - INTERVAL '5 days'),
      ('conv-002', 'search_prospects', '{"industry": "SaaS", "location": "Remote"}', '18 prospects found', 'success', NOW() - INTERVAL '4 days'),
      ('conv-002', 'visit_profile', '{"prospect_id": 3}', 'Profile visited', 'success', NOW() - INTERVAL '4 days'),
      ('conv-002', 'send_connection', '{"prospect_id": 3}', 'Connection sent', 'success', NOW() - INTERVAL '4 days'),
      ('conv-003', 'search_prospects', '{"industry": "Finance", "location": "Lyon"}', '12 prospects found', 'success', NOW() - INTERVAL '3 days'),
      ('conv-003', 'visit_profile', '{"prospect_id": 7}', 'Profile visited', 'error', NOW() - INTERVAL '3 days'),
      ('conv-003', 'send_connection', '{"prospect_id": 7}', 'Connection failed', 'error', NOW() - INTERVAL '3 days'),
      ('conv-004', 'search_prospects', '{"industry": "AI", "location": "Remote"}', '20 prospects found', 'success', NOW() - INTERVAL '2 days'),
      ('conv-004', 'visit_profile', '{"prospect_id": 8}', 'Profile visited', 'success', NOW() - INTERVAL '2 days'),
      ('conv-004', 'send_connection', '{"prospect_id": 8}', 'Connection sent', 'success', NOW() - INTERVAL '2 days'),
      ('conv-005', 'search_prospects', '{"industry": "Technology", "location": "Bordeaux"}', '15 prospects found', 'success', NOW() - INTERVAL '1 day'),
      ('conv-005', 'visit_profile', '{"prospect_id": 5}', 'Profile visited', 'success', NOW() - INTERVAL '1 day'),
      ('conv-005', 'send_connection', '{"prospect_id": 5}', 'Connection sent', 'success', NOW() - INTERVAL '1 day'),
      ('conv-006', 'search_prospects', '{"industry": "Data", "location": "Paris"}', '22 prospects found', 'success', NOW() - INTERVAL '1 day'),
      ('conv-006', 'visit_profile', '{"prospect_id": 24}', 'Profile visited', 'success', NOW() - INTERVAL '1 day'),
      ('conv-006', 'send_connection', '{"prospect_id": 24}', 'Connection sent', 'success', NOW() - INTERVAL '1 day')
    `);
    console.log("✅ Agent tool steps insérés");

    // 6. LinkedIn actions queue
    console.log("📋 Insertion des linkedin actions queue...");
    await pool.query(`
      INSERT INTO linkedin_actions_queue (action_type, target_url, target_name, status, executed_at, created_at) VALUES
      ('search', 'linkedin.com/search', 'Technology Paris', 'completed', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
      ('visit_profile', 'linkedin.com/in/p1', 'Marie Dupont', 'completed', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
      ('send_connection', 'linkedin.com/in/p1', 'Marie Dupont', 'completed', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
      ('search', 'linkedin.com/search', 'SaaS Remote', 'completed', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
      ('visit_profile', 'linkedin.com/in/p3', 'Sophie Bernard', 'completed', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
      ('send_connection', 'linkedin.com/in/p3', 'Sophie Bernard', 'completed', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
      ('search', 'linkedin.com/search', 'Finance Lyon', 'completed', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
      ('visit_profile', 'linkedin.com/in/p7', 'Emma Robert', 'failed', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
      ('send_connection', 'linkedin.com/in/p7', 'Emma Robert', 'pending_approval', NULL, NOW() - INTERVAL '3 days'),
      ('search', 'linkedin.com/search', 'AI Remote', 'completed', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
      ('visit_profile', 'linkedin.com/in/p8', 'Thomas Richard', 'completed', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
      ('send_connection', 'linkedin.com/in/p8', 'Thomas Richard', 'completed', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
      ('search', 'linkedin.com/search', 'Technology Bordeaux', 'completed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
      ('visit_profile', 'linkedin.com/in/p5', 'Claire Moreau', 'completed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
      ('send_connection', 'linkedin.com/in/p5', 'Claire Moreau', 'completed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
      ('search', 'linkedin.com/search', 'Data Paris', 'completed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
      ('visit_profile', 'linkedin.com/in/p24', 'David Lemoine', 'pending_approval', NULL, NOW() - INTERVAL '1 day'),
      ('send_connection', 'linkedin.com/in/p24', 'David Lemoine', 'pending_approval', NULL, NOW() - INTERVAL '1 day')
    `);
    console.log("✅ LinkedIn actions queue insérées");

    // 7. Agent chat history
    console.log("💭 Insertion des agent chat history...");
    await pool.query(`
      INSERT INTO agent_chat_history (user_id, role, content, conversation_id, created_at) VALUES
      (1, 'user', 'Trouve-moi des CTO à Paris', 'conv-001', NOW() - INTERVAL '5 days'),
      (1, 'assistant', 'Je vais rechercher des CTO à Paris pour vous.', 'conv-001', NOW() - INTERVAL '5 days'),
      (1, 'user', 'Trouve-moi des CEO en SaaS remote', 'conv-002', NOW() - INTERVAL '4 days'),
      (1, 'assistant', 'Recherche de CEO en SaaS remote en cours...', 'conv-002', NOW() - INTERVAL '4 days'),
      (1, 'user', 'Cherche des directeurs financiers à Lyon', 'conv-003', NOW() - INTERVAL '3 days'),
      (1, 'assistant', 'Je vais chercher des directeurs financiers à Lyon.', 'conv-003', NOW() - INTERVAL '3 days'),
      (1, 'user', 'Trouve des profils IA en remote', 'conv-004', NOW() - INTERVAL '2 days'),
      (1, 'assistant', 'Recherche de profils IA en remote...', 'conv-004', NOW() - INTERVAL '2 days'),
      (1, 'user', 'Cherche des CTO à Bordeaux', 'conv-005', NOW() - INTERVAL '1 day'),
      (1, 'assistant', 'Je vais chercher des CTO à Bordeaux.', 'conv-005', NOW() - INTERVAL '1 day'),
      (1, 'user', 'Trouve des experts data à Paris', 'conv-006', NOW() - INTERVAL '1 day'),
      (1, 'assistant', 'Recherche d''experts data à Paris...', 'conv-006', NOW() - INTERVAL '1 day')
    `);
    console.log("✅ Agent chat history inséré");

    console.log("🎉 Données de test BI insérées avec succès !");

    // Vérification
    const [prospectsCount, messagesCount, templatesCount] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM prospects"),
      pool.query("SELECT COUNT(*) FROM messages"),
      pool.query("SELECT COUNT(*) FROM templates")
    ]);

    console.log("📊 Vérification:");
    console.log(`   - Prospects: ${prospectsCount.rows[0].count}`);
    console.log(`   - Messages: ${messagesCount.rows[0].count}`);
    console.log(`   - Templates: ${templatesCount.rows[0].count}`);
  } catch (error) {
    console.error("❌ Erreur lors de l'insertion:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedData();
