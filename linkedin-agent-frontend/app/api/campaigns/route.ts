import { NextResponse } from 'next/server';
import { getCampaigns, createCampaign, query } from '@/lib/db';

// GET /api/campaigns - Récupérer toutes les campagnes
export async function GET() {
  try {
    const campaigns = await getCampaigns();
    return NextResponse.json({ success: true, campaigns });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erreur lors de la récupération des campagnes',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// POST /api/campaigns - Créer une nouvelle campagne
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validation
    if (!data.name) {
      return NextResponse.json(
        { success: false, message: 'Le nom de la campagne est requis' },
        { status: 400 }
      );
    }

    const campaign = await createCampaign({
      name: data.name,
      status: data.status || 'draft',
      target: data.target || '',
      template: data.template || '',
      description: data.description,
      industry: data.industry,
      location: data.location,
      company_size: data.company_size,
    });

    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erreur lors de la création de la campagne',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}