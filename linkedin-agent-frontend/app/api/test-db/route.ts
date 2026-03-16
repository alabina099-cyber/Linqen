import { NextResponse } from 'next/server';
import { testConnection, query } from '@/lib/db';

export async function GET() {
  try {
    // Test basic connection
    const connectionTest = await testConnection();
    
    if (!connectionTest.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Erreur de connexion à la base de données',
          error: connectionTest.error 
        },
        { status: 500 }
      );
    }

    // Test query to get table list
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    const existingTables = tablesResult.rows.map((row: { table_name: string }) => row.table_name);
    
    // Tables attendues
    const expectedTables = ['campaigns', 'messages', 'prospects', 'users'];
    const missingTables = expectedTables.filter(t => !existingTables.includes(t));
    const foundTables = expectedTables.filter(t => existingTables.includes(t));

    return NextResponse.json({
      success: true,
      message: 'Connexion à Neon DB réussie !',
      timestamp: connectionTest.timestamp,
      tables: {
        existing: existingTables,
        expected: expectedTables,
        found: foundTables,
        missing: missingTables,
        allExist: missingTables.length === 0
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erreur lors du test de connexion',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
