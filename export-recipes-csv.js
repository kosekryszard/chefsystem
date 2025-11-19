// ========================================
// MODULE: Export Recipes to CSV
// DESCRIPTION: Eksportuje receptury z bazy do pliku CSV
// DEPENDENCIES: Supabase
// AUTHOR: Claude + Ryszard
// DATE: 2025-01-18
// ========================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pvdtkrduggbwmyenjdsc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Endpoint: GET /api/recipes/export/csv
async function exportRecipesToCSV(req, res) {
  try {
    // Pobierz wszystkie receptury z składnikami
    const { data: recipes, error } = await supabase
  .from('recipes')
  .select(`
    *,
    recipe_ingredients (
      ingredient_id,
      ilosc,
      jm,
      kolejnosc,
      ingredients (nazwa)
    )
  `)
  .order('id');
    
    if (error) throw error;
    
    // Generuj CSV
    const csvRows = [];
    
    // Nagłówki
    csvRows.push([
      'id',
      'nazwa',
      'typ',
      'wydajnosc_ilosc',
      'wydajnosc_jm',
      'opis',
      'wegetarianski',
      'weganski',
      'skladniki', // JSON z listą
      'kroki', // JSON z listą
      'created_at',
      'updated_at'
    ].join(','));
    
    // Dane
    for (const recipe of recipes) {
      // Składniki jako JSON
      const skladniki = recipe.recipe_ingredients.map(ri => ({
        ingredient_id: ri.ingredient_id,
        nazwa: ri.ingredients?.nazwa || '',
        ilosc: ri.ilosc,
        jm: ri.jm,
        kolejnosc: ri.kolejnosc
      }));
      
      // Kroki jako JSON
      const kroki = recipe.recipe_steps?.map(rs => ({
        krok: rs.krok,
        opis: rs.opis,
        czas_min: rs.czas_min
      })) || [];
      
      csvRows.push([
        recipe.id,
        escapeCSV(recipe.nazwa),
        escapeCSV(recipe.typ || ''),
        recipe.wydajnosc_ilosc || '',
        escapeCSV(recipe.wydajnosc_jm || ''),
        escapeCSV(recipe.opis || ''),
        recipe.wegetarianski ? 'tak' : 'nie',
        recipe.weganski ? 'tak' : 'nie',
        escapeCSV(JSON.stringify(skladniki)),
        escapeCSV(JSON.stringify(kroki)),
        recipe.created_at,
        recipe.updated_at
      ].join(','));
    }
    
    const csv = csvRows.join('\n');
    
    // Ustaw nagłówki HTTP
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="receptury_${Date.now()}.csv"`);
    
    // BOM dla UTF-8 (żeby Excel rozpoznał polskie znaki)
    res.write('\uFEFF');
    res.end(csv);
    
  } catch (error) {
    console.error('Błąd eksportu receptur:', error);
    res.status(500).json({ error: error.message });
  }
}

// Pomocnicza funkcja - escape CSV
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

module.exports = { exportRecipesToCSV };
