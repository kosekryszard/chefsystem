// ========================================
// MODULE: Import Dishes from CSV
// DESCRIPTION: Importuje dania z pliku CSV do bazy
// DEPENDENCIES: Supabase, multer, papaparse
// AUTHOR: Claude + Ryszard
// DATE: 2025-01-18
// ========================================

const { createClient } = require('@supabase/supabase-js');
const Papa = require('papaparse');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pvdtkrduggbwmyenjdsc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Endpoint: POST /api/dishes/import/csv
async function importDishesFromCSV(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Brak pliku CSV' });
    }
    
    const csvData = req.file.buffer.toString('utf-8');
    
    // Parsuj CSV
    const parsed = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    });
    
    if (parsed.errors.length > 0) {
      return res.status(400).json({ 
        error: 'Błąd parsowania CSV', 
        details: parsed.errors 
      });
    }
    
    const rows = parsed.data;
    const results = {
      success: 0,
      errors: [],
      skipped: 0
    };
    
    // Importuj po kolei
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        // Sprawdź duplikaty
        const { data: existing } = await supabase
          .from('dishes')
          .select('id')
          .eq('nazwa', row.nazwa)
          .single();
        
        if (existing) {
          results.skipped++;
          continue;
        }
        
        // Wstaw danie
        const { data: dish, error: dishError } = await supabase
          .from('dishes')
          .insert({
            nazwa: row.nazwa,
            nazwa_karta: row.nazwa_karta || null,
            opis_karta: row.opis_karta || null,
            cena_sugerowana: parseFloat(row.cena_sugerowana) || null,
            wegetarianski: row.wegetarianski === 'tak',
            weganski: row.weganski === 'tak',
            aktywne: row.aktywne !== 'nie' // domyślnie true
          })
          .select()
          .single();
        
        if (dishError) throw dishError;
        
        // Wstaw komponenty (jeśli są)
        if (row.komponenty) {
          try {
            const komponenty = JSON.parse(row.komponenty);
            for (const komp of komponenty) {
              await supabase
                .from('dish_components')
                .insert({
                  dish_id: dish.id,
                  typ: komp.typ,
                  recipe_id: komp.recipe_id || null,
                  ingredient_id: komp.ingredient_id || null,
                  ilosc: komp.ilosc,
                  jm: komp.jm,
                  kategoria: komp.kategoria || 'glowne',
                  kolejnosc: komp.kolejnosc || 0
                });
            }
          } catch (e) {
            console.warn(`Błąd komponentów dla ${row.nazwa}:`, e.message);
          }
        }
        
        results.success++;
        
      } catch (error) {
        results.errors.push({
          row: i + 2,
          nazwa: row.nazwa,
          error: error.message
        });
      }
    }
    
    res.json({
      message: 'Import zakończony',
      ...results
    });
    
  } catch (error) {
    console.error('Błąd importu dań:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { importDishesFromCSV };
