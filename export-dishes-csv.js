// ========================================
// MODULE: Export Dishes to CSV
// DESCRIPTION: Eksportuje dania z bazy do pliku CSV
// DEPENDENCIES: Supabase
// AUTHOR: Claude + Ryszard
// DATE: 2025-01-18
// ========================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pvdtkrduggbwmyenjdsc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Endpoint: GET /api/dishes/export/csv
async function exportDishesToCSV(req, res) {
  try {
    // Pobierz wszystkie dania z komponentami
    const { data: dishes, error } = await supabase
  .from('dishes')
  .select(`
    *,
    dish_components (
      recipe_id,
      ilosc,
      jm,
      kategoria,
      kolejnosc
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
      'nazwa_karta',
      'opis_karta',
      'cena_sugerowana',
      'wegetarianski',
      'weganski',
      'aktywne',
      'komponenty', // JSON z listą
      'created_at',
      'updated_at'
    ].join(','));
    
    // Dane
    for (const dish of dishes) {
      // Komponenty jako JSON
 const komponenty = dish.dish_components?.map(dc => ({
  recipe_id: dc.recipe_id,
  ilosc: dc.ilosc,
  jm: dc.jm,
  kategoria: dc.kategoria,
  kolejnosc: dc.kolejnosc
})) || [];
      
      csvRows.push([
        dish.id,
        escapeCSV(dish.nazwa),
        escapeCSV(dish.nazwa_karta || ''),
        escapeCSV(dish.opis_karta || ''),
        dish.cena_sugerowana || '',
        dish.wegetarianski ? 'tak' : 'nie',
        dish.weganski ? 'tak' : 'nie',
        dish.aktywne ? 'tak' : 'nie',
        escapeCSV(JSON.stringify(komponenty)),
        dish.created_at,
        dish.updated_at
      ].join(','));
    }
    
    const csv = csvRows.join('\n');
    
    // Ustaw nagłówki HTTP
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="dania_${Date.now()}.csv"`);
    
    // BOM dla UTF-8
    res.write('\uFEFF');
    res.end(csv);
    
  } catch (error) {
    console.error('Błąd eksportu dań:', error);
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

module.exports = { exportDishesToCSV };
