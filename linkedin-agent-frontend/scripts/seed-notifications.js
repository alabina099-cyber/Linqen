const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_uzan40Povxwp@ep-tiny-term-ai0m9euo-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false },
});

const notifications = [
  {
    type: 'connection',
    title: 'Nouvelle connexion LinkedIn',
    message: 'Marie Dubois a accepté votre demande de connexion. Elle occupe le poste de Directrice Marketing chez TechCorp.',
    read: false,
    data: { prospect_id: 1, prospect_name: 'Marie Dubois' },
  },
  {
    type: 'reply',
    title: 'Nouvelle réponse reçue',
    message: 'Jean Martin a répondu à votre message de la campagne "Recrutement Tech Q3". Réponse : "Intéressé, parlons-en la semaine prochaine."',
    read: false,
    data: { campaign_id: 1, prospect_id: 2, prospect_name: 'Jean Martin' },
  },
  {
    type: 'message',
    title: 'Message envoyé avec succès',
    message: 'Votre message à Sarah Lefebvre a été envoyé via l\'extension Chrome. Statut : envoyé.',
    read: true,
    data: { prospect_id: 3, prospect_name: 'Sarah Lefebvre' },
  },
  {
    type: 'alert',
    title: 'Taux de réponse en baisse',
    message: 'Le taux de réponse de la campagne "SaaS France" a chuté de 18% à 12% cette semaine. Pensez à réviser vos templates.',
    read: false,
    data: { campaign_id: 2, campaign_name: 'SaaS France', old_rate: 18, new_rate: 12 },
  },
  {
    type: 'connection',
    title: 'Nouvelle connexion LinkedIn',
    message: 'Pierre Garnier a accepté votre demande de connexion. CTO @ StartupFlow.',
    read: false,
    data: { prospect_id: 4, prospect_name: 'Pierre Garnier' },
  },
  {
    type: 'reply',
    title: 'Conversion détectée !',
    message: 'Sophie Bernard a montré un fort intérêt pour votre offre. Elle a demandé une démo pour mardi prochain.',
    read: false,
    data: { campaign_id: 1, prospect_id: 5, prospect_name: 'Sophie Bernard', status: 'converted' },
  },
  {
    type: 'alert',
    title: 'Quota d\'envoi presque atteint',
    message: 'Vous avez envoyé 45 messages aujourd\'hui sur votre limite de 50. Ralentissez pour éviter les restrictions LinkedIn.',
    read: true,
    data: { sent: 45, limit: 50 },
  },
  {
    type: 'message',
    title: 'Follow-up automatique envoyé',
    message: 'L\'agent IA a envoyé un follow-up à Luc Moreau après 3 jours sans réponse. Template : "Relance douce".',
    read: false,
    data: { prospect_id: 6, prospect_name: 'Luc Moreau', template: 'Relance douce' },
  },
  {
    type: 'connection',
    title: 'Profil consulté',
    message: 'Votre profil a été consulté par 12 prospects ciblés cette semaine. Top secteur : Technologie.',
    read: true,
    data: { views: 12, top_industry: 'Technologie' },
  },
  {
    type: 'reply',
    title: 'Nouvelle réponse reçue',
    message: 'Claire Rousseau : "Merci pour votre message, je ne suis pas intéressée pour le moment mais gardez le contact."',
    read: false,
    data: { campaign_id: 3, prospect_id: 7, prospect_name: 'Claire Rousseau', sentiment: 'neutre' },
  },
  {
    type: 'alert',
    title: 'Agent IA en pause',
    message: 'L\'agent IA a été mis en pause automatiquement après 5 erreurs consécutives. Vérifiez la connexion LinkedIn.',
    read: false,
    data: { errors: 5, reason: 'connexion' },
  },
  {
    type: 'message',
    title: 'Campagne terminée',
    message: 'La campagne "Lancement Produit B2B" est terminée. Résultats : 200 envoyés, 45 réponses, 12 conversions.',
    read: true,
    data: { campaign_id: 4, sent: 200, replies: 45, conversions: 12 },
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    // Clear existing notifications first
    await client.query('DELETE FROM notifications');
    console.log('🗑️  Anciennes notifications supprimées');

    for (const n of notifications) {
      await client.query(
        `INSERT INTO notifications (type, title, message, read, data, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${Math.floor(Math.random() * 72)} minutes')`,
        [n.type, n.title, n.message, n.read, JSON.stringify(n.data)]
      );
    }

    const countRes = await client.query('SELECT COUNT(*) FROM notifications');
    console.log(`✅ ${countRes.rows[0].count} notifications insérées avec succès`);
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
