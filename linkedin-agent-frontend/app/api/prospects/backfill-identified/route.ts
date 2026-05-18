import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// POST /api/prospects/backfill-identified
// Marque comme 'identified' tous les prospects 'new' qui ont une action send_connection ou search_and_connection complétée
export async function POST() {
  try {
    // 1) Prospects 'new' dont une action send_connection completed cible leur URL
    const sendConnResult = await query(
      `UPDATE prospects p
       SET status = 'identified', updated_at = NOW()
       FROM linkedin_actions_queue a
       WHERE p.status = 'new'
         AND a.action_type = 'send_connection'
         AND a.status = 'completed'
         AND a.target_url = p.linkedin_url
       RETURNING p.id, p.name, p.linkedin_url`,
      []
    );

    // 2) Prospects 'new' dont le nom/URL apparaît dans sent_profiles d'une action search_and_connection
    const searchConnResult = await query(
      `UPDATE prospects p
       SET status = 'identified', updated_at = NOW()
       FROM linkedin_actions_queue a,
            jsonb_array_elements(
              CASE
                WHEN jsonb_typeof(a.result -> 'sent_profiles') = 'array'
                THEN a.result -> 'sent_profiles'
                ELSE '[]'::jsonb
              END
            ) AS sp
       WHERE p.status = 'new'
         AND a.action_type = 'search_and_connection'
         AND a.status = 'completed'
         AND (
              ((sp ->> 'url') IS NOT NULL AND (sp ->> 'url') = p.linkedin_url)
              OR ((sp ->> 'name') IS NOT NULL AND LOWER(sp ->> 'name') = LOWER(p.name))
         )
       RETURNING p.id, p.name, p.linkedin_url`,
      []
    );

    return NextResponse.json({
      success: true,
      updated_send_connection: sendConnResult.rows.length,
      updated_search_and_connection: searchConnResult.rows.length,
      total: sendConnResult.rows.length + searchConnResult.rows.length,
      prospects: [...sendConnResult.rows, ...searchConnResult.rows],
    });
  } catch (error) {
    console.error("Erreur backfill identified:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
