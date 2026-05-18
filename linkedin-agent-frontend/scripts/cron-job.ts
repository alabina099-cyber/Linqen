#!/usr/bin/env ts-node

/**
 * Cron Job pour automatiser les tâches des campagnes
 * Ce script doit être exécuté périodiquement (ex: toutes les heures)
 */

import { query } from "../lib/db";

// Configuration des endpoints
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

async function executeFollowups() {
  try {
    console.log("🔄 Exécution des relances planifiées...");
    const response = await fetch(`${BASE_URL}/api/followups/execute`, {
      method: "POST",
    });
    const data = await response.json();
    console.log(`✅ Relances exécutées: ${data.executed?.length || 0}, Ignorées: ${data.skipped?.length || 0}`);
  } catch (error) {
    console.error("❌ Erreur lors de l'exécution des relances:", error);
  }
}

async function checkCampaignFollowups() {
  try {
    // Récupérer toutes les campagnes actives
    const campaignsResult = await query(
      `SELECT id FROM campaigns WHERE status = 'active' AND follow_up_days IS NOT NULL`
    );
    
    const campaigns = campaignsResult.rows;
    console.log(`🔍 Vérification des relances pour ${campaigns.length} campagnes actives...`);
    
    for (const campaign of campaigns) {
      try {
        const response = await fetch(`${BASE_URL}/api/campaigns/${campaign.id}/check-followups`, {
          method: "POST",
        });
        const data = await response.json();
        if (data.followups_scheduled > 0) {
          console.log(`✅ Campagne ${campaign.id}: ${data.followups_scheduled} relance(s) planifiée(s)`);
        }
      } catch (error) {
        console.error(`❌ Erreur pour la campagne ${campaign.id}:`, error);
      }
    }
  } catch (error) {
    console.error("❌ Erreur lors de la vérification des campagnes:", error);
  }
}

async function updateProspectPipeline() {
  try {
    console.log("🔄 Mise à jour du pipeline des prospects...");
    const response = await fetch(`${BASE_URL}/api/prospects/update-pipeline`, {
      method: "POST",
    });
    const data = await response.json();
    console.log("✅ Pipeline mis à jour:", data.stats);
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour du pipeline:", error);
  }
}

async function autoApproveCampaignActions() {
  try {
    console.log("🔄 Auto-approbation des actions des campagnes actives...");
    const response = await fetch(`${BASE_URL}/api/linkedin-actions/auto-approve`, {
      method: "POST",
    });
    const data = await response.json();
    console.log(`✅ Actions auto-approuvées: ${data.approved_count || 0}`);
  } catch (error) {
    console.error("❌ Erreur lors de l'auto-approbation:", error);
  }
}

async function main() {
  console.log("🚀 Démarrage du cron job...");
  console.log(`⏰ ${new Date().toISOString()}`);

  // Exécuter les tâches dans l'ordre
  await autoApproveCampaignActions();
  await executeFollowups();
  await checkCampaignFollowups();
  await updateProspectPipeline();

  console.log("✅ Cron job terminé");
  console.log(`⏰ ${new Date().toISOString()}`);
}

// Exécuter le cron job
if (require.main === module) {
  main().catch(console.error);
}

export { main, executeFollowups, checkCampaignFollowups, updateProspectPipeline };
