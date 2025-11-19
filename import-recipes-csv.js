// ========================================
// MODULE: Import Recipes from CSV
// DESCRIPTION: Importuje receptury z pliku CSV do bazy
// DEPENDENCIES: Supabase, multer (upload), papaparse (CSV parser)
// AUTHOR: Claude + Ryszard
// DATE: 2025-01-18
// ========================================

const { createClient } = require('@supabase/supabase-js');
const Papa = require('papaparse');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pvdtkrduggbwmyenjdsc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Endpoint: POST /api/recipes/import/csv
// Wymaga: multipart/form-data z plikiem CSV
async function importRecipesFromCSV(req, res) {
  try {
    // req.file zawiera przesłany plik (dzięki multer middleware)
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
        // Sprawdź czy receptura już istnieje
        const { data: existing } = await supabase
          .from('recipes')
          .select('id')
          .eq('nazwa', row.nazwa)
          .single();
        
        if (existing) {
          results.skipped++;
          continue; // Pomijamy duplikaty
        }
        
        // Wstaw recepturę
        const { data: recipe, error: recipeError } = await supabase
          .from('recipes')
          .insert({
            nazwa: row.nazwa,
            typ: row.typ || 'polprodukt',
            wydajnosc_ilosc: parseFloat(row.wydajnosc_ilosc) || null,
            wydajnosc_jm: row.wydajnosc_jm || null,
            opis: row.opis || null,
            wegetarianski: row.wegetarianski === 'tak',
            weganski: row.weganski === 'tak'
          })
          .select()
          .single();
        
        if (recipeError) throw recipeError;
        
        // Wstaw składniki (jeśli są)
        if (row.skladniki) {
          try {
            const skladniki = JSON.parse(row.skladniki);
            for (const skladnik of skladniki) {
              await supabase
                .from('recipe_ingredients')
                .insert({
                  recipe_id: recipe.id,
                  ingredient_id: skladnik.ingredient_id,
                  ilosc: skladnik.ilosc,
                  jm: skladnik.jm,
                  kolejnosc: skladnik.kolejnosc || 0
                });
            }
          } catch (e) {
            console.warn(`Błąd składników dla ${row.nazwa}:`, e.message);
          }
        }
        
        // Wstaw kroki (jeśli są)
        if (row.kroki) {
          try {
            const kroki = JSON.parse(row.kroki);
            for (const krok of kroki) {
              await supabase
                .from('recipe_steps')
                .insert({
                  recipe_id: recipe.id,
                  krok: krok.krok,
                  opis: krok.opis,
                  czas_min: krok.czas_min || null
                });
            }
          } catch (e) {
            console.warn(`Błąd kroków dla ${row.nazwa}:`, e.message);
          }
        }
        
        results.success++;
        
      } catch (error) {
        results.errors.push({
          row: i + 2, // +2 bo header + index od 0
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
    console.error('Błąd importu receptur:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { importRecipesFromCSV };
