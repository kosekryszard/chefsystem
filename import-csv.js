const fs = require('fs');

// Konfiguracja Supabase
const SUPABASE_URL = 'https://pvdtkrduggbwmyenjdsc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2ZHRrcmR1Z2did215ZW5qZHNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNjg5NTksImV4cCI6MjA3ODk0NDk1OX0.FfA2cYguwKKkRdQ2e2mAn8MyufI6Ccgz84M_MLc9bsY';

// Helper do zapytań Supabase
async function supabaseQuery(endpoint, method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const options = {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${response.status} - ${error}`);
  }
  
  if (method === 'GET') {
    return await response.json();
  }
  
  return null;
}

// Funkcja parsowania CSV
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const headers = lines[0].split(',');
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] ? values[index].trim() : null;
    });
    data.push(row);
  }
  
  return data;
}

// Mapowanie danych z CSV na strukturę bazy
function mapToDatabase(csvRow) {
  // Importuj tylko surowce
  if (csvRow.lista_typ !== 'surowiec') return null;
  
  return {
    nazwa: csvRow.lista_nazwa_wew,
    typ: csvRow.lista_grupa || 'inne',
    grupa: csvRow.lista_grupa || null,
    dzial: csvRow.lista_dział || 'kuchnia',
    jm_podstawowa: csvRow.lista_jm_wew || 'kg',
    wegetarianski: false, // domyślnie false, można uzupełnić ręcznie później
    weganski: false,
    alergeny: []
  };
}

async function importIngredients() {
  console.log('🔄 Rozpoczynam import surowców z CSV...\n');
  
  try {
    // Parsuj CSV
    const csvPath = './Surowce_Towary_Usługi_-_lista.csv';
    console.log('📖 Czytam plik CSV...');
    const csvData = parseCSV(csvPath);
    console.log(`✅ Wczytano ${csvData.length} wierszy\n`);
    
    // Mapuj tylko surowce
    const ingredients = csvData
      .map(mapToDatabase)
      .filter(item => item !== null);
    
    console.log(`🎯 Znaleziono ${ingredients.length} surowców do importu\n`);
    
    // Pobierz istniejące surowce z bazy
    console.log('🔍 Sprawdzam istniejące surowce w bazie...');
    const existing = await supabaseQuery('ingredients?select=nazwa');
    
    const existingNames = new Set(existing.map(i => i.nazwa));
    console.log(`📊 W bazie jest już ${existingNames.size} surowców\n`);
    
    // Filtruj - importuj tylko nowe
    const newIngredients = ingredients.filter(
      ing => !existingNames.has(ing.nazwa)
    );
    
    if (newIngredients.length === 0) {
      console.log('✅ Wszystkie surowce z CSV są już w bazie!');
      return;
    }
    
    console.log(`➕ Do dodania: ${newIngredients.length} nowych surowców\n`);
    
    // Import partiami po 50 (żeby nie przeciążyć API)
    const batchSize = 50;
    let imported = 0;
    let errors = 0;
    
    for (let i = 0; i < newIngredients.length; i += batchSize) {
      const batch = newIngredients.slice(i, i + batchSize);
      
      console.log(`📦 Importuję partię ${Math.floor(i/batchSize) + 1}/${Math.ceil(newIngredients.length/batchSize)} (${batch.length} surowców)...`);
      
      try {
        await supabaseQuery('ingredients', 'POST', batch);
        imported += batch.length;
        console.log(`✅ Zaimportowano ${imported}/${newIngredients.length}`);
      } catch (error) {
        console.error(`❌ Błąd w partii ${Math.floor(i/batchSize) + 1}:`, error.message);
        errors += batch.length;
      }
      
      // Krótka przerwa między partiami
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 IMPORT ZAKOŃCZONY');
    console.log('='.repeat(50));
    console.log(`✅ Zaimportowano: ${imported} surowców`);
    console.log(`❌ Błędy: ${errors} surowców`);
    console.log(`📊 Surowców w CSV: ${ingredients.length}`);
    console.log(`📊 Już było w bazie: ${ingredients.length - newIngredients.length}`);
    console.log('='.repeat(50));
    
  } catch (err) {
    console.error('💥 Krytyczny błąd:', err);
  }
}

// Uruchom import
importIngredients();
