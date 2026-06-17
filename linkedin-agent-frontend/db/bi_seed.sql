-- Test data for BI Dashboard
-- Run this script in Neon DB to generate 60 days of data
-- Delete existing data (optional)
-- TRUNCATE TABLE linkedin_actions_queue, agent_tool_steps, messages, prospects, templates, campaigns CASCADE;
-- 1. Message templates
INSERT INTO templates (name, tag, text, usage_count, conversion_rate)
VALUES (
        'Invitation Pro',
        'Invitation',
        'Hello {{name}}, your profile at {{company}} caught my attention. I would love to connect and explore opportunities together.',
        45,
        12
    ),
    (
        'Follow-up 1',
        'Follow-up',
        'Following our connection, I am sharing our deck on LinkedIn automation.',
        38,
        18
    ),
    (
        'Follow-up 2',
        'Follow-up',
        'Have you had a chance to review our proposal? I am available for a quick call.',
        22,
        25
    ),
    (
        'Opportunity',
        'Opportunity',
        'We are looking for profiles like yours for our growth team. Shall we discuss it?',
        30,
        15
    ),
    (
        'Cold outreach',
        'Cold',
        'Discover how our clients boosted their prospecting by 300% with AI.',
        50,
        8
    ),
    (
        'Webinar',
        'Invitation',
        'Invitation to our webinar on AI in B2B sales.',
        25,
        20
    ),
    (
        'Partnership',
        'Opportunity',
        'I believe a partnership between our companies could create value.',
        15,
        22
    ),
    (
        'Product launch',
        'Cold',
        'Our new automation platform is in beta. Would you like to try it?',
        35,
        10
    );
-- 2. Campaigns
INSERT INTO campaigns (
        name,
        status,
        target,
        industry,
        location,
        company_size,
        connections_sent,
        connections_accepted,
        contacted,
        replied,
        converted
    )
VALUES (
        'Tech Paris Campaign',
        'active',
        'CTO, VP Engineering',
        'Tech',
        'Paris',
        '50-200',
        120,
        85,
        70,
        45,
        12
    ),
    (
        'Finance Lyon Campaign',
        'active',
        'CFO',
        'Finance',
        'Lyon',
        '200-500',
        90,
        60,
        50,
        30,
        8
    ),
    (
        'SaaS Global Campaign',
        'draft',
        'CEO, Founder',
        'SaaS',
        'Remote',
        '10-50',
        45,
        30,
        25,
        18,
        5
    ),
    (
        'Retail Bordeaux Campaign',
        'paused',
        'E-commerce Manager',
        'Retail',
        'Bordeaux',
        '100-500',
        60,
        40,
        35,
        20,
        4
    );
-- 3. Prospects (generated over 60 days with various statuses and scores)
INSERT INTO prospects (
        linkedin_url,
        name,
        role,
        company,
        industry,
        location,
        company_size,
        score,
        status,
        created_at,
        updated_at
    )
VALUES -- Status: converted (high score)
    (
        'linkedin.com/in/p1',
        'Marie Dupont',
        'CTO',
        'TechCorp',
        'Technology',
        'Paris',
        '50-200',
        85,
        'converted',
        NOW() - INTERVAL '55 days',
        NOW() - INTERVAL '40 days'
    ),
    (
        'linkedin.com/in/p2',
        'Jean Martin',
        'VP Engineering',
        'InnovateTech',
        'Technology',
        'Lyon',
        '50-200',
        82,
        'converted',
        NOW() - INTERVAL '50 days',
        NOW() - INTERVAL '35 days'
    ),
    (
        'linkedin.com/in/p3',
        'Sophie Bernard',
        'CEO',
        'GrowthSaaS',
        'SaaS',
        'Remote',
        '10-50',
        90,
        'converted',
        NOW() - INTERVAL '45 days',
        NOW() - INTERVAL '30 days'
    ),
    (
        'linkedin.com/in/p4',
        'Pierre Leroy',
        'Founder',
        'StartupX',
        'SaaS',
        'Paris',
        '10-50',
        88,
        'converted',
        NOW() - INTERVAL '40 days',
        NOW() - INTERVAL '25 days'
    ),
    (
        'linkedin.com/in/p5',
        'Claire Moreau',
        'CTO',
        'DataFlow',
        'Technology',
        'Bordeaux',
        '50-200',
        84,
        'converted',
        NOW() - INTERVAL '35 days',
        NOW() - INTERVAL '20 days'
    ),
    -- Status: interested
    (
        'linkedin.com/in/p6',
        'Lucas Petit',
        'VP Engineering',
        'CloudScale',
        'Technology',
        'Paris',
        '200-500',
        75,
        'interested',
        NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '15 days'
    ),
    (
        'linkedin.com/in/p7',
        'Emma Robert',
        'Director of Tech',
        'DevOpsInc',
        'Technology',
        'Lyon',
        '50-200',
        72,
        'interested',
        NOW() - INTERVAL '28 days',
        NOW() - INTERVAL '12 days'
    ),
    (
        'linkedin.com/in/p8',
        'Thomas Richard',
        'CTO',
        'AIStartup',
        'AI',
        'Remote',
        '10-50',
        78,
        'interested',
        NOW() - INTERVAL '25 days',
        NOW() - INTERVAL '10 days'
    ),
    -- Status: responded
    (
        'linkedin.com/in/p9',
        'Julie Dubois',
        'Engineering Manager',
        'TechTeam',
        'Technology',
        'Paris',
        '50-200',
        65,
        'responded',
        NOW() - INTERVAL '22 days',
        NOW() - INTERVAL '8 days'
    ),
    (
        'linkedin.com/in/p10',
        'Antoine Laurent',
        'Tech Lead',
        'CodeBase',
        'Technology',
        'Lyon',
        '50-200',
        62,
        'responded',
        NOW() - INTERVAL '20 days',
        NOW() - INTERVAL '7 days'
    ),
    (
        'linkedin.com/in/p11',
        'Camille Simon',
        'Senior Developer',
        'DevWorld',
        'Technology',
        'Bordeaux',
        '50-200',
        68,
        'responded',
        NOW() - INTERVAL '18 days',
        NOW() - INTERVAL '6 days'
    ),
    (
        'linkedin.com/in/p12',
        'Hugo Michel',
        'CTO',
        'ScaleUp',
        'SaaS',
        'Remote',
        '10-50',
        70,
        'responded',
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '5 days'
    ),
    -- Status: contacted
    (
        'linkedin.com/in/p13',
        'Lea Garcia',
        'VP Engineering',
        'TechGrowth',
        'Technology',
        'Paris',
        '200-500',
        55,
        'contacted',
        NOW() - INTERVAL '12 days',
        NOW() - INTERVAL '3 days'
    ),
    (
        'linkedin.com/in/p14',
        'Paul David',
        'Director of Engineering',
        'CloudFirst',
        'Technology',
        'Lyon',
        '50-200',
        52,
        'contacted',
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '2 days'
    ),
    (
        'linkedin.com/in/p15',
        'Sarah Bertrand',
        'CTO',
        'InnovateLab',
        'AI',
        'Remote',
        '10-50',
        58,
        'contacted',
        NOW() - INTERVAL '8 days',
        NOW() - INTERVAL '1 day'
    ),
    (
        'linkedin.com/in/p16',
        'Maxime Roux',
        'Tech Lead',
        'DataDriven',
        'Data',
        'Paris',
        '50-200',
        50,
        'contacted',
        NOW() - INTERVAL '6 days',
        NOW() - INTERVAL '1 day'
    ),
    -- Status: connected
    (
        'linkedin.com/in/p17',
        'Chloe Vincent',
        'Engineering Manager',
        'TechVision',
        'Technology',
        'Bordeaux',
        '50-200',
        45,
        'connected',
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '1 day'
    ),
    (
        'linkedin.com/in/p18',
        'Nicolas Fournier',
        'Senior Developer',
        'CodeCraft',
        'Technology',
        'Lyon',
        '50-200',
        42,
        'connected',
        NOW() - INTERVAL '4 days',
        NOW() - INTERVAL '1 day'
    ),
    (
        'linkedin.com/in/p19',
        'Marie Martinez',
        'CTO',
        'AIWorks',
        'AI',
        'Remote',
        '10-50',
        48,
        'connected',
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '1 day'
    ),
    -- Status: identified (new prospects)
    (
        'linkedin.com/in/p20',
        'Alexandre Lefebvre',
        'VP Engineering',
        'TechNova',
        'Technology',
        'Paris',
        '200-500',
        35,
        'identified',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '2 days'
    ),
    (
        'linkedin.com/in/p21',
        'Isabelle Morel',
        'Director of Tech',
        'CloudNative',
        'Technology',
        'Lyon',
        '50-200',
        38,
        'identified',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    ),
    (
        'linkedin.com/in/p22',
        'Francois Henry',
        'CTO',
        'ScaleTech',
        'SaaS',
        'Remote',
        '10-50',
        40,
        'identified',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    ),
    (
        'linkedin.com/in/p23',
        'Catherine Poulain',
        'Engineering Manager',
        'DevOpsPro',
        'Technology',
        'Bordeaux',
        '50-200',
        32,
        'identified',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    ),
    (
        'linkedin.com/in/p24',
        'David Lemoine',
        'Tech Lead',
        'DataMinds',
        'Data',
        'Paris',
        '50-200',
        36,
        'identified',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    ),
    -- Additional prospects for geographic density
    (
        'linkedin.com/in/p25',
        'Anne Fontaine',
        'CTO',
        'TechMarseille',
        'Technology',
        'Marseille',
        '50-200',
        55,
        'contacted',
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '5 days'
    ),
    (
        'linkedin.com/in/p26',
        'Marc Garnier',
        'VP Engineering',
        'NiceTech',
        'Technology',
        'Nice',
        '50-200',
        52,
        'connected',
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '2 days'
    ),
    (
        'linkedin.com/in/p27',
        'Laura Rousseau',
        'CEO',
        'LilleStartup',
        'SaaS',
        'Lille',
        '10-50',
        70,
        'interested',
        NOW() - INTERVAL '20 days',
        NOW() - INTERVAL '8 days'
    ),
    (
        'linkedin.com/in/p28',
        'Guillaume Blanc',
        'CTO',
        'NantesTech',
        'Technology',
        'Nantes',
        '50-200',
        48,
        'responded',
        NOW() - INTERVAL '18 days',
        NOW() - INTERVAL '6 days'
    ),
    (
        'linkedin.com/in/p29',
        'Valerie Guerin',
        'VP Engineering',
        'StrasbourgAI',
        'AI',
        'Strasbourg',
        '10-50',
        65,
        'converted',
        NOW() - INTERVAL '25 days',
        NOW() - INTERVAL '15 days'
    ),
    (
        'linkedin.com/in/p30',
        'Eric Muller',
        'Director of Tech',
        'ToulouseData',
        'Data',
        'Toulouse',
        '50-200',
        58,
        'interested',
        NOW() - INTERVAL '22 days',
        NOW() - INTERVAL '10 days'
    );
-- 4. Messages (generated over 60 days with various statuses and times)
INSERT INTO messages (
        campaign_id,
        prospect_id,
        recipient_name,
        recipient_role,
        recipient_company,
        message_text,
        message_type,
        status,
        created_at
    )
VALUES -- Converted messages (replied then converted)
    (
        1,
        1,
        'Marie Dupont',
        'CTO',
        'TechCorp',
        'Hello Marie, your profile at TechCorp caught my attention...',
        'connection',
        'replied',
        NOW() - INTERVAL '54 days'
    ),
    (
        1,
        1,
        'Marie Dupont',
        'CTO',
        'TechCorp',
        'Following our connection, I am sharing our deck...',
        'message',
        'replied',
        NOW() - INTERVAL '53 days'
    ),
    (
        1,
        2,
        'Jean Martin',
        'VP Engineering',
        'InnovateTech',
        'Hello Jean, your profile at InnovateTech caught my attention...',
        'connection',
        'replied',
        NOW() - INTERVAL '49 days'
    ),
    (
        1,
        3,
        'Sophie Bernard',
        'CEO',
        'GrowthSaaS',
        'Hello Sophie, your profile at GrowthSaaS caught my attention...',
        'connection',
        'replied',
        NOW() - INTERVAL '44 days'
    ),
    (
        2,
        4,
        'Pierre Leroy',
        'Founder',
        'StartupX',
        'Hello Pierre, your profile at StartupX caught my attention...',
        'connection',
        'replied',
        NOW() - INTERVAL '39 days'
    ),
    (
        1,
        5,
        'Claire Moreau',
        'CTO',
        'DataFlow',
        'Hello Claire, your profile at DataFlow caught my attention...',
        'connection',
        'replied',
        NOW() - INTERVAL '34 days'
    ),
    -- Messages with replies (but not yet converted)
    (
        1,
        6,
        'Lucas Petit',
        'VP Engineering',
        'CloudScale',
        'Hello Lucas, your profile at CloudScale caught my attention...',
        'connection',
        'replied',
        NOW() - INTERVAL '29 days'
    ),
    (
        1,
        7,
        'Emma Robert',
        'Director of Tech',
        'DevOpsInc',
        'Hello Emma, your profile at DevOpsInc caught my attention...',
        'connection',
        'replied',
        NOW() - INTERVAL '27 days'
    ),
    (
        3,
        8,
        'Thomas Richard',
        'CTO',
        'AIStartup',
        'Hello Thomas, your profile at AIStartup caught my attention...',
        'connection',
        'replied',
        NOW() - INTERVAL '24 days'
    ),
    (
        1,
        9,
        'Julie Dubois',
        'Engineering Manager',
        'TechTeam',
        'Hello Julie, your profile at TechTeam caught my attention...',
        'connection',
        'replied',
        NOW() - INTERVAL '21 days'
    ),
    (
        2,
        10,
        'Antoine Laurent',
        'Tech Lead',
        'CodeBase',
        'Hello Antoine, your profile at CodeBase caught my attention...',
        'connection',
        'replied',
        NOW() - INTERVAL '19 days'
    ),
    (
        1,
        11,
        'Camille Simon',
        'Senior Developer',
        'DevWorld',
        'Hello Camille, your profile at DevWorld caught my attention...',
        'connection',
        'replied',
        NOW() - INTERVAL '17 days'
    ),
    (
        3,
        12,
        'Hugo Michel',
        'CTO',
        'ScaleUp',
        'Hello Hugo, your profile at ScaleUp caught my attention...',
        'connection',
        'replied',
        NOW() - INTERVAL '14 days'
    ),
    -- Messages sent but without reply
    (
        1,
        13,
        'Lea Garcia',
        'VP Engineering',
        'TechGrowth',
        'Hello Lea, your profile at TechGrowth caught my attention...',
        'connection',
        'sent',
        NOW() - INTERVAL '11 days'
    ),
    (
        2,
        14,
        'Paul David',
        'Director of Engineering',
        'CloudFirst',
        'Hello Paul, your profile at CloudFirst caught my attention...',
        'connection',
        'sent',
        NOW() - INTERVAL '9 days'
    ),
    (
        1,
        15,
        'Sarah Bertrand',
        'CTO',
        'InnovateLab',
        'Hello Sarah, your profile at InnovateLab caught my attention...',
        'connection',
        'sent',
        NOW() - INTERVAL '7 days'
    ),
    (
        1,
        16,
        'Maxime Roux',
        'Tech Lead',
        'DataDriven',
        'Hello Maxime, your profile at DataDriven caught my attention...',
        'connection',
        'sent',
        NOW() - INTERVAL '5 days'
    ),
    -- Recent messages (for hourly heatmap)
    (
        1,
        17,
        'Chloe Vincent',
        'Engineering Manager',
        'TechVision',
        'Hello Chloe, your profile at TechVision caught my attention...',
        'connection',
        'sent',
        NOW() - INTERVAL '4 days'
    ),
    (
        2,
        18,
        'Nicolas Fournier',
        'Senior Developer',
        'CodeCraft',
        'Hello Nicolas, your profile at CodeCraft caught my attention...',
        'connection',
        'sent',
        NOW() - INTERVAL '3 days'
    ),
    (
        3,
        19,
        'Marie Martinez',
        'CTO',
        'AIWorks',
        'Hello Marie, your profile at AIWorks caught my attention...',
        'connection',
        'sent',
        NOW() - INTERVAL '2 days'
    ),
    -- Messages with specific times for heatmap (Tuesday 10am, Thursday 2pm, etc.)
    (
        1,
        20,
        'Alexandre Lefebvre',
        'VP Engineering',
        'TechNova',
        'Hello Alexandre, your profile at TechNova caught my attention...',
        'connection',
        'sent',
        NOW() - INTERVAL '1 day' - INTERVAL '8 hours'
    ),
    -- Tuesday 10am
    (
        2,
        21,
        'Isabelle Morel',
        'Director of Tech',
        'CloudNative',
        'Hello Isabelle, your profile at CloudNative caught my attention...',
        'connection',
        'sent',
        NOW() - INTERVAL '1 day' - INTERVAL '6 hours'
    ),
    -- Tuesday 12pm
    (
        3,
        22,
        'Francois Henry',
        'CTO',
        'ScaleTech',
        'Hello Francois, your profile at ScaleTech caught my attention...',
        'connection',
        'sent',
        NOW() - INTERVAL '1 day' - INTERVAL '4 hours'
    ),
    -- Tuesday 2pm
    (
        1,
        23,
        'Catherine Poulain',
        'Engineering Manager',
        'DevOpsPro',
        'Hello Catherine, your profile at DevOpsPro caught my attention...',
        'connection',
        'sent',
        NOW() - INTERVAL '1 day' - INTERVAL '2 hours'
    ),
    -- Tuesday 4pm
    (
        2,
        24,
        'David Lemoine',
        'Tech Lead',
        'DataMinds',
        'Hello David, your profile at DataMinds caught my attention...',
        'connection',
        'sent',
        NOW() - INTERVAL '1 day' - INTERVAL '1 hour'
    ),
    -- Tuesday 5pm
    -- Additional messages for volume
    (
        1,
        25,
        'Anne Fontaine',
        'CTO',
        'TechMarseille',
        'Hello Anne, your profile at TechMarseille caught my attention...',
        'connection',
        'replied',
        NOW() - INTERVAL '14 days'
    ),
    (
        2,
        26,
        'Marc Garnier',
        'VP Engineering',
        'NiceTech',
        'Hello Marc, your profile at NiceTech caught my attention...',
        'connection',
        'sent',
        NOW() - INTERVAL '9 days'
    ),
    (
        3,
        27,
        'Laura Rousseau',
        'CEO',
        'LilleStartup',
        'Hello Laura, your profile at LilleStartup caught my attention...',
        'connection',
        'replied',
        NOW() - INTERVAL '19 days'
    ),
    (
        1,
        28,
        'Guillaume Blanc',
        'CTO',
        'NantesTech',
        'Hello Guillaume, your profile at NantesTech caught my attention...',
        'connection',
        'replied',
        NOW() - INTERVAL '17 days'
    ),
    (
        2,
        29,
        'Valerie Guerin',
        'VP Engineering',
        'StrasbourgAI',
        'Hello Valerie, your profile at StrasbourgAI caught my attention...',
        'connection',
        'replied',
        NOW() - INTERVAL '24 days'
    ),
    (
        1,
        30,
        'Eric Muller',
        'Director of Tech',
        'ToulouseData',
        'Hello Eric, your profile at ToulouseData caught my attention...',
        'connection',
        'replied',
        NOW() - INTERVAL '21 days'
    );
-- 5. Agent tool steps (for agent analytics)
INSERT INTO agent_tool_steps (
        conversation_id,
        tool_name,
        args,
        result,
        status,
        created_at
    )
VALUES (
        'conv-001',
        'search_prospects',
        '{"industry": "Technology", "location": "Paris"}',
        '25 prospects found',
        'success',
        NOW() - INTERVAL '5 days'
    ),
    (
        'conv-001',
        'visit_profile',
        '{"prospect_id": 1}',
        'Profile visited',
        'success',
        NOW() - INTERVAL '5 days'
    ),
    (
        'conv-001',
        'send_connection',
        '{"prospect_id": 1}',
        'Connection sent',
        'success',
        NOW() - INTERVAL '5 days'
    ),
    (
        'conv-002',
        'search_prospects',
        '{"industry": "SaaS", "location": "Remote"}',
        '18 prospects found',
        'success',
        NOW() - INTERVAL '4 days'
    ),
    (
        'conv-002',
        'visit_profile',
        '{"prospect_id": 3}',
        'Profile visited',
        'success',
        NOW() - INTERVAL '4 days'
    ),
    (
        'conv-002',
        'send_connection',
        '{"prospect_id": 3}',
        'Connection sent',
        'success',
        NOW() - INTERVAL '4 days'
    ),
    (
        'conv-003',
        'search_prospects',
        '{"industry": "Finance", "location": "Lyon"}',
        '12 prospects found',
        'success',
        NOW() - INTERVAL '3 days'
    ),
    (
        'conv-003',
        'visit_profile',
        '{"prospect_id": 7}',
        'Profile visited',
        'error',
        NOW() - INTERVAL '3 days'
    ),
    (
        'conv-003',
        'send_connection',
        '{"prospect_id": 7}',
        'Connection failed',
        'error',
        NOW() - INTERVAL '3 days'
    ),
    (
        'conv-004',
        'search_prospects',
        '{"industry": "AI", "location": "Remote"}',
        '20 prospects found',
        'success',
        NOW() - INTERVAL '2 days'
    ),
    (
        'conv-004',
        'visit_profile',
        '{"prospect_id": 8}',
        'Profile visited',
        'success',
        NOW() - INTERVAL '2 days'
    ),
    (
        'conv-004',
        'send_connection',
        '{"prospect_id": 8}',
        'Connection sent',
        'success',
        NOW() - INTERVAL '2 days'
    ),
    (
        'conv-005',
        'search_prospects',
        '{"industry": "Technology", "location": "Bordeaux"}',
        '15 prospects found',
        'success',
        NOW() - INTERVAL '1 day'
    ),
    (
        'conv-005',
        'visit_profile',
        '{"prospect_id": 5}',
        'Profile visited',
        'success',
        NOW() - INTERVAL '1 day'
    ),
    (
        'conv-005',
        'send_connection',
        '{"prospect_id": 5}',
        'Connection sent',
        'success',
        NOW() - INTERVAL '1 day'
    ),
    (
        'conv-006',
        'search_prospects',
        '{"industry": "Data", "location": "Paris"}',
        '22 prospects found',
        'success',
        NOW() - INTERVAL '1 day'
    ),
    (
        'conv-006',
        'visit_profile',
        '{"prospect_id": 24}',
        'Profile visited',
        'success',
        NOW() - INTERVAL '1 day'
    ),
    (
        'conv-006',
        'send_connection',
        '{"prospect_id": 24}',
        'Connection sent',
        'success',
        NOW() - INTERVAL '1 day'
    );
-- 6. LinkedIn actions queue (for approvals)
INSERT INTO linkedin_actions_queue (
        action_type,
        target_url,
        target_name,
        status,
        executed_at,
        created_at
    )
VALUES (
        'search',
        'linkedin.com/search',
        'Technology Paris',
        'completed',
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '5 days'
    ),
    (
        'visit_profile',
        'linkedin.com/in/p1',
        'Marie Dupont',
        'completed',
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '5 days'
    ),
    (
        'send_connection',
        'linkedin.com/in/p1',
        'Marie Dupont',
        'completed',
        NOW() - INTERVAL '5 days',
        NOW() - INTERVAL '5 days'
    ),
    (
        'search',
        'linkedin.com/search',
        'SaaS Remote',
        'completed',
        NOW() - INTERVAL '4 days',
        NOW() - INTERVAL '4 days'
    ),
    (
        'visit_profile',
        'linkedin.com/in/p3',
        'Sophie Bernard',
        'completed',
        NOW() - INTERVAL '4 days',
        NOW() - INTERVAL '4 days'
    ),
    (
        'send_connection',
        'linkedin.com/in/p3',
        'Sophie Bernard',
        'completed',
        NOW() - INTERVAL '4 days',
        NOW() - INTERVAL '4 days'
    ),
    (
        'search',
        'linkedin.com/search',
        'Finance Lyon',
        'completed',
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '3 days'
    ),
    (
        'visit_profile',
        'linkedin.com/in/p7',
        'Emma Robert',
        'failed',
        NOW() - INTERVAL '3 days',
        NOW() - INTERVAL '3 days'
    ),
    (
        'send_connection',
        'linkedin.com/in/p7',
        'Emma Robert',
        'pending_approval',
        NULL,
        NOW() - INTERVAL '3 days'
    ),
    (
        'search',
        'linkedin.com/search',
        'AI Remote',
        'completed',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '2 days'
    ),
    (
        'visit_profile',
        'linkedin.com/in/p8',
        'Thomas Richard',
        'completed',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '2 days'
    ),
    (
        'send_connection',
        'linkedin.com/in/p8',
        'Thomas Richard',
        'completed',
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '2 days'
    ),
    (
        'search',
        'linkedin.com/search',
        'Technology Bordeaux',
        'completed',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    ),
    (
        'visit_profile',
        'linkedin.com/in/p5',
        'Claire Moreau',
        'completed',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    ),
    (
        'send_connection',
        'linkedin.com/in/p5',
        'Claire Moreau',
        'completed',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    ),
    (
        'search',
        'linkedin.com/search',
        'Data Paris',
        'completed',
        NOW() - INTERVAL '1 day',
        NOW() - INTERVAL '1 day'
    ),
    (
        'visit_profile',
        'linkedin.com/in/p24',
        'David Lemoine',
        'pending_approval',
        NULL,
        NOW() - INTERVAL '1 day'
    ),
    (
        'send_connection',
        'linkedin.com/in/p24',
        'David Lemoine',
        'pending_approval',
        NULL,
        NOW() - INTERVAL '1 day'
    );
-- 7. Agent chat history (for conversations)
INSERT INTO agent_chat_history (
        user_id,
        role,
        content,
        conversation_id,
        created_at
    )
VALUES (
        1,
        'user',
        'Find CTOs in Paris',
        'conv-001',
        NOW() - INTERVAL '5 days'
    ),
    (
        1,
        'assistant',
        'I will search for CTOs in Paris for you.',
        'conv-001',
        NOW() - INTERVAL '5 days'
    ),
    (
        1,
        'user',
        'Find CEOs in SaaS remote',
        'conv-002',
        NOW() - INTERVAL '4 days'
    ),
    (
        1,
        'assistant',
        'Searching for CEOs in SaaS remote...',
        'conv-002',
        NOW() - INTERVAL '4 days'
    ),
    (
        1,
        'user',
        'Search for CFOs in Lyon',
        'conv-003',
        NOW() - INTERVAL '3 days'
    ),
    (
        1,
        'assistant',
        'I will search for CFOs in Lyon.',
        'conv-003',
        NOW() - INTERVAL '3 days'
    ),
    (
        1,
        'user',
        'Find AI profiles in remote',
        'conv-004',
        NOW() - INTERVAL '2 days'
    ),
    (
        1,
        'assistant',
        'Searching for AI profiles in remote...',
        'conv-004',
        NOW() - INTERVAL '2 days'
    ),
    (
        1,
        'user',
        'Search for CTOs in Bordeaux',
        'conv-005',
        NOW() - INTERVAL '1 day'
    ),
    (
        1,
        'assistant',
        'I will search for CTOs in Bordeaux.',
        'conv-005',
        NOW() - INTERVAL '1 day'
    ),
    (
        1,
        'user',
        'Find data experts in Paris',
        'conv-006',
        NOW() - INTERVAL '1 day'
    ),
    (
        1,
        'assistant',
        'Searching for data experts in Paris...',
        'conv-006',
        NOW() - INTERVAL '1 day'
    );