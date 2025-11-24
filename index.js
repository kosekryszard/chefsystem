const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const multer = require('multer');
const Papa = require('papaparse');
const { exportRecipesToCSV } = require('./export-recipes-csv');
const { exportDishesToCSV } = require('./export-dishes-csv');
const { importRecipesFromCSV } = require('./import-recipes-csv');
const { importDishesFromCSV } = require('./import-dishes-csv');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Inicjalizacja Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Konfiguracja uploadu plików
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // max 10MB
});

// Test endpoint
app.get('/', (req, res) => {
  res.send('ChefSystent API v1.0 - connected to database!');
});

// GET wszystkie surowce
app.get('/api/ingredients', async (req, res) => {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('nazwa');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET jeden surowiec po ID
app.get('/api/ingredients/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .eq('id', req.params.id)
    .single();
  
  if (error) return res.status(404).json({ error: 'Nie znaleziono surowca' });
  res.json(data);
});

// POST nowy surowiec
app.post('/api/ingredients', async (req, res) => {
  const { data, error } = await supabase
    .from('ingredients')
    .insert([req.body])
    .select()
    .single();
  
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PUT edycja surowca
app.put('/api/ingredients/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('ingredients')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();
  
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// DELETE usuniÄ™cie surowca
app.delete('/api/ingredients/:id', async (req, res) => {
  const { error } = await supabase
    .from('ingredients')
    .delete()
    .eq('id', req.params.id);
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Surowiec usuniÄ™ty' });
});

// ========================================
// RECEPTURY (RECIPES)
// ========================================

// GET wszystkie receptury
app.get('/api/recipes', async (req, res) => {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('nazwa');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET receptura po ID (ze skÅ‚adnikami)
app.get('/api/recipes/:id', async (req, res) => {
  // Pobierz recepturÄ™
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', req.params.id)
    .single();
  
  if (recipeError) return res.status(404).json({ error: 'Nie znaleziono receptury' });
  
  // Pobierz skÅ‚adniki
  const { data: ingredients, error: ingError } = await supabase
    .from('recipe_ingredients')
    .select(`
      id,
      ilosc,
      jm,
      kolejnosc,
      ingredients (
        id,
        nazwa,
        jm_podstawowa,
        typ
      )
    `)
    .eq('recipe_id', req.params.id)
    .order('kolejnosc');
  
  if (ingError) return res.status(500).json({ error: ingError.message });
  
  res.json({ ...recipe, skladniki: ingredients });
});

// POST nowa receptura
app.post('/api/recipes', async (req, res) => {
  const { skladniki, instrukcja, ...recipeData } = req.body;
  
  // Dodaj instrukcję do danych receptury
  if (instrukcja) {
    recipeData.instrukcja = instrukcja;
  }
  
  // Dodaj recepturÄ™
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .insert([recipeData])
    .select()
    .single();
  
  if (recipeError) return res.status(400).json({ error: recipeError.message });
  
  // Dodaj skÅ‚adniki jeÅ›li sÄ…
  if (skladniki && skladniki.length > 0) {
    const ingredientsData = skladniki.map((s, idx) => ({
      recipe_id: recipe.id,
      ingredient_id: s.ingredient_id,
      ilosc: s.ilosc,
      jm: s.jm,
      kolejnosc: idx + 1
    }));
    
    const { error: ingError } = await supabase
      .from('recipe_ingredients')
      .insert(ingredientsData);
    
    if (ingError) return res.status(400).json({ error: ingError.message });
  }
  
  res.status(201).json(recipe);
});

// PUT edycja receptury
app.put('/api/recipes/:id', async (req, res) => {
  const { skladniki, instrukcja, ...recipeData } = req.body;
  
  // Dodaj instrukcję do danych receptury
  if (instrukcja !== undefined) {
    recipeData.instrukcja = instrukcja;
  }
  
  // Aktualizuj recepturÄ™
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .update(recipeData)
    .eq('id', req.params.id)
    .select()
    .single();
  
  if (recipeError) return res.status(400).json({ error: recipeError.message });
  
  // JeÅ›li sÄ… nowe skÅ‚adniki, usuÅ„ stare i dodaj nowe
  if (skladniki) {
    await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('recipe_id', req.params.id);
    
    if (skladniki.length > 0) {
      const ingredientsData = skladniki.map((s, idx) => ({
        recipe_id: recipe.id,
        ingredient_id: s.ingredient_id,
        ilosc: s.ilosc,
        jm: s.jm,
        kolejnosc: idx + 1
      }));
      
      await supabase
        .from('recipe_ingredients')
        .insert(ingredientsData);
    }
  }
  
  res.json(recipe);
});

// DELETE receptura
app.delete('/api/recipes/:id', async (req, res) => {
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', req.params.id);
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Receptura usuniÄ™ta' });
});

// ========================================
// KONWERSJE JEDNOSTEK
// ========================================

// GET wszystkie konwersje dla surowca
app.get('/api/ingredients/:id/conversions', async (req, res) => {
  const { data, error } = await supabase
    .from('ingredient_conversions')
    .select('*')
    .eq('ingredient_id', req.params.id);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST nowa konwersja
app.post('/api/conversions', async (req, res) => {
  const { data, error } = await supabase
    .from('ingredient_conversions')
    .insert([req.body])
    .select()
    .single();
  
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE konwersja
app.delete('/api/conversions/:id', async (req, res) => {
  const { error } = await supabase
    .from('ingredient_conversions')
    .delete()
    .eq('id', req.params.id);
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Konwersja usunięta' });
});

// ========================================
// ZAMIENNIKI
// ========================================

// GET wszystkie zamienniki dla surowca
app.get('/api/ingredients/:id/substitutes', async (req, res) => {
  const { data, error } = await supabase
    .from('ingredient_substitutes')
    .select(`
      id,
      ratio,
      from_unit,
      to_unit,
      notes,
      substitute:substitute_id (
        id,
        nazwa,
        jm_podstawowa
      )
    `)
    .eq('ingredient_id', req.params.id);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST nowy zamiennik
app.post('/api/substitutes', async (req, res) => {
  const { data, error } = await supabase
    .from('ingredient_substitutes')
    .insert([req.body])
    .select()
    .single();
  
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE zamiennik
app.delete('/api/substitutes/:id', async (req, res) => {
  const { error } = await supabase
    .from('ingredient_substitutes')
    .delete()
    .eq('id', req.params.id);
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Zamiennik usunięty' });
});

// ========================================
// DANIA ZŁOŻONE (DISHES)
// ========================================

// GET wszystkie dania
app.get('/api/dishes', async (req, res) => {
  const { data, error } = await supabase
    .from('dishes')
    .select('*')
    .order('nazwa');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET jedno danie po ID (z recepturami)
app.get('/api/dishes/:id', async (req, res) => {
  // Pobierz danie
  const { data: dish, error: dishError } = await supabase
    .from('dishes')
    .select('*')
    .eq('id', req.params.id)
    .single();
  
  if (dishError) return res.status(404).json({ error: 'Nie znaleziono dania' });
  
  // Pobierz komponenty (receptury)
  const { data: components, error: compError } = await supabase
    .from('dish_components')
    .select(`
      id,
      ilosc,
      jm,
      kategoria,
      kolejnosc,
      recipes (
        id,
        nazwa,
        typ,
        wydajnosc_ilosc,
        wydajnosc_jm
      )
    `)
    .eq('dish_id', req.params.id)
    .order('kolejnosc');
  
  if (compError) return res.status(500).json({ error: compError.message });
  
  res.json({ ...dish, komponenty: components });
});

// POST nowe danie
app.post('/api/dishes', async (req, res) => {
  const { komponenty, ...dishData } = req.body;
  
  // Dodaj danie
  const { data: dish, error: dishError } = await supabase
    .from('dishes')
    .insert([dishData])
    .select()
    .single();
  
  if (dishError) return res.status(400).json({ error: dishError.message });
  
  // Dodaj komponenty jeśli są
  if (komponenty && komponenty.length > 0) {
    const componentsData = komponenty.map((k, idx) => ({
      dish_id: dish.id,
      recipe_id: k.recipe_id,
      ilosc: k.ilosc,
      jm: k.jm,
      kategoria: k.kategoria || 'glowne',
      kolejnosc: idx + 1
    }));
    
    const { error: compError } = await supabase
      .from('dish_components')
      .insert(componentsData);
    
    if (compError) return res.status(400).json({ error: compError.message });
  }
  
  res.status(201).json(dish);
});

// PUT edycja dania
app.put('/api/dishes/:id', async (req, res) => {
  const { komponenty, ...dishData } = req.body;
  
  // Aktualizuj danie
  const { data: dish, error: dishError } = await supabase
    .from('dishes')
    .update(dishData)
    .eq('id', req.params.id)
    .select()
    .single();
  
  if (dishError) return res.status(400).json({ error: dishError.message });
  
  // Jeśli są nowe komponenty, usuń stare i dodaj nowe
  if (komponenty) {
    await supabase
      .from('dish_components')
      .delete()
      .eq('dish_id', req.params.id);
    
    if (komponenty.length > 0) {
      const componentsData = komponenty.map((k, idx) => ({
        dish_id: dish.id,
        recipe_id: k.recipe_id,
        ilosc: k.ilosc,
        jm: k.jm,
        kategoria: k.kategoria || 'glowne',
        kolejnosc: idx + 1
      }));
      
      await supabase
        .from('dish_components')
        .insert(componentsData);
    }
  }
  
  res.json(dish);
});

// DELETE danie
app.delete('/api/dishes/:id', async (req, res) => {
  const { error } = await supabase
    .from('dishes')
    .delete()
    .eq('id', req.params.id);
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Danie usunięte' });
});

// ========================================
// IMPORT/EXPORT
// ========================================

// Eksport surowców do CSV
app.get('/api/ingredients/export/csv', async (req, res) => {
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('nazwa');
  
  if (error) return res.status(500).json({ error: error.message });
  
  // Generuj CSV
  const headers = ['id', 'nazwa', 'typ', 'grupa', 'dzial', 'jm_podstawowa', 'wegetarianski', 'weganski', 'alergeny'];
  let csv = headers.join(',') + '\n';
  
  data.forEach(row => {
    const values = headers.map(h => {
      if (h === 'alergeny') return JSON.stringify(row[h] || []);
      return row[h] || '';
    });
    csv += values.join(',') + '\n';
  });
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
res.setHeader('Content-Disposition', 'attachment; filename=surowce_export.csv');
res.send('\uFEFF' + csv);
});

// ========================================
// EKSPORT/IMPORT RECEPTUR I DAŃ
// ========================================

// Eksport receptur do CSV
app.get('/api/recipes/export/csv', exportRecipesToCSV);

// Eksport dań do CSV
app.get('/api/dishes/export/csv', exportDishesToCSV);

// Import receptur z CSV
app.post('/api/recipes/import/csv', upload.single('file'), importRecipesFromCSV);

// Import dań z CSV
app.post('/api/dishes/import/csv', upload.single('file'), importDishesFromCSV);

// ========================================
// MODUŁ JADŁOSPISÓW - Backend API
// Dodaj te endpointy do index.js
// ========================================

// ========== SZABLONY SCHEMATÓW ==========

// GET - pobierz wszystkie szablony
app.get('/api/meal-templates', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('meal_templates')
      .select('*')
      .order('nazwa');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - pobierz jeden szablon po ID
app.get('/api/meal-templates/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('meal_templates')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - utwórz nowy szablon
app.post('/api/meal-templates', async (req, res) => {
  try {
    const { nazwa, klient, opis, struktura } = req.body;
    
    const { data, error } = await supabase
      .from('meal_templates')
      .insert([{ nazwa, klient, opis, struktura }])
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT - aktualizuj szablon
app.put('/api/meal-templates/:id', async (req, res) => {
  try {
    const { nazwa, klient, opis, struktura } = req.body;
    
    const { data, error } = await supabase
      .from('meal_templates')
      .update({ nazwa, klient, opis, struktura })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE - usuń szablon
app.delete('/api/meal-templates/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('meal_templates')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== GRUPY ==========

// GET - pobierz wszystkie grupy
app.get('/api/groups', async (req, res) => {
  try {
    const { status } = req.query; // opcjonalny filtr po statusie
    
    let query = supabase
      .from('groups')
      .select('*, meal_templates(nazwa)')
      .order('data_pierwszy_posilek', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - pobierz jedną grupę po ID (z pełnymi danymi)
app.get('/api/groups/:id', async (req, res) => {
  try {
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*, meal_templates(nazwa, struktura)')
      .eq('id', req.params.id)
      .single();
    
    if (groupError) throw groupError;
    
    // Pobierz posiłki dla tej grupy
    const { data: meals, error: mealsError } = await supabase
      .from('group_meals')
      .select('*, dishes(id, nazwa, typ)')
      .eq('group_id', req.params.id)
      .order('dzien_numer')
      .order('typ_posilku');
    
    if (mealsError) throw mealsError;
    
    // Dodaj posiłki do grupy
    group.meals = meals;
    
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Usuń grupę i wszystkie powiązane posiłki
app.delete('/api/groups/:id', async (req, res) => {
  try {
      const groupId = req.params.id;
      
      // Sprawdź czy grupa istnieje
      const { data: group, error: checkError } = await supabase
          .from('groups')
          .select('id')
          .eq('id', groupId)
          .single();
      
      if (checkError || !group) {
          return res.status(404).json({ error: 'Grupa nie znaleziona' });
      }
      
      // Usuń wszystkie posiłki grupy
      const { error: mealsError } = await supabase
          .from('group_meals')
          .delete()
          .eq('group_id', groupId);
      
      if (mealsError) {
          console.error('Error deleting meals:', mealsError);
          throw mealsError;
      }
      
      // Usuń grupę
      const { error: deleteError } = await supabase
          .from('groups')
          .delete()
          .eq('id', groupId);
      
      if (deleteError) {
          console.error('Error deleting group:', deleteError);
          throw deleteError;
      }
      
      res.json({ message: 'Grupa usunięta pomyślnie' });
      
  } catch (error) {
      console.error('Error deleting group:', error);
      console.error('Error details:', error.message);
      res.status(500).json({ 
          error: 'Błąd usuwania grupy',
          details: error.message 
      });
  }
});

// POST - utwórz nową grupę
app.post('/api/groups', async (req, res) => {
  try {
    const {
      nazwa,
      organizator_nazwa,
      organizator_kontakt,
      liczba_uczestnikow,
      liczba_opiekunow,
      liczba_pilotow,
      liczba_kierowcow,
      liczba_kadry,
      wiek_grupy,
      data_pierwszy_posilek,
      data_ostatni_posilek,
      pierwszy_posilek_typ,
      ostatni_posilek_typ,
      schemat_id,
      meal_types,  // DODANE
      status
    } = req.body;
    
    const { data, error } = await supabase
      .from('groups')
      .insert([{
        nazwa,
        organizator_nazwa,
        organizator_kontakt,
        liczba_uczestnikow,
        liczba_opiekunow,
        liczba_pilotow,
        liczba_kierowcow,
        liczba_kadry,
        wiek_grupy,
        data_pierwszy_posilek,
        data_ostatni_posilek,
        pierwszy_posilek_typ,
        ostatni_posilek_typ,
        schemat_id,
        meal_types,  // DODANE
        status: status || 'draft'
      }])
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT - aktualizuj grupę
app.put('/api/groups/:id', async (req, res) => {
  try {
    const {
      nazwa,
      organizator_nazwa,
      organizator_kontakt,
      liczba_uczestnikow,
      liczba_opiekunow,
      liczba_pilotow,
      liczba_kierowcow,
      liczba_kadry,
      wiek_grupy,
      data_pierwszy_posilek,
      data_ostatni_posilek,
      pierwszy_posilek_typ,
      ostatni_posilek_typ,
      schemat_id,
      meal_types,  // DODANE
      status
    } = req.body;
    
    const { data, error } = await supabase
    .from('groups')
    .update({
      nazwa,
      organizator_nazwa,
      organizator_kontakt,
      liczba_uczestnikow,
      liczba_opiekunow,
      liczba_pilotow,
      liczba_kierowcow,
      liczba_kadry,
      wiek_grupy,
      data_pierwszy_posilek,
      data_ostatni_posilek,
      pierwszy_posilek_typ,
      ostatni_posilek_typ,
      schemat_id,
      meal_types,  // DODANE
      status
    })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE - usuń grupę
app.delete('/api/groups/:id', async (req, res) => {
  try {
    // Cascade delete posiłków działa automatycznie (ON DELETE CASCADE)
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== POSIŁKI W GRUPIE ==========

// GET - pobierz posiłki dla grupy
app.get('/api/groups/:groupId/meals', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('group_meals')
      .select('*, dishes(id, nazwa, typ)')
      .eq('group_id', req.params.groupId)
      .order('dzien_numer')
      .order('typ_posilku')
      .order('kolejnosc'); // DODANE
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - dodaj posiłek do grupy
app.post('/api/groups/:groupId/meals', async (req, res) => {
  try {
    const { dzien_numer, data, typ_posilku, dish_id, liczba_porcji, uwagi, kolejnosc } = req.body;
    
    const { data: meal, error } = await supabase
      .from('group_meals')
      .insert([{
        group_id: req.params.groupId,
        dzien_numer,
        data,
        typ_posilku,
        dish_id,
        liczba_porcji,
        uwagi,
        kolejnosc: kolejnosc || 1
      }])
      .select('*, dishes(id, nazwa, typ)')
      .single();
    
    if (error) throw error;
    res.status(201).json(meal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT - aktualizuj posiłek
app.put('/api/group-meals/:id', async (req, res) => {
  try {
    const { dzien_numer, data, typ_posilku, dish_id, liczba_porcji, uwagi, kolejnosc } = req.body;
    
    const { data: meal, error } = await supabase
      .from('group_meals')
      .update({
        dzien_numer,
        data,
        typ_posilku,
        dish_id,
        liczba_porcji,
        uwagi,
        kolejnosc
      })
      .eq('id', req.params.id)
      .select('*, dishes(id, nazwa, typ)')
      .single();
    
    if (error) throw error;
    res.json(meal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE - usuń posiłek
app.delete('/api/group-meals/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('group_meals')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET - domyślne godziny typów posiłków dla grupy
app.get('/api/groups/:groupId/meal-type-defaults', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('group_meal_type_defaults')
      .select('*')
      .eq('group_id', req.params.groupId);
    
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - ustaw domyślną godzinę dla typu posiłku w grupie
app.post('/api/groups/:groupId/meal-type-defaults', async (req, res) => {
  try {
    const { typ_posilku, domyslna_godzina } = req.body;
    
    const { data, error } = await supabase
      .from('group_meal_type_defaults')
      .upsert({
        group_id: req.params.groupId,
        typ_posilku,
        domyslna_godzina
      }, {
        onConflict: 'group_id,typ_posilku'
      })
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// ========== GENEROWANIE LISTY ZAKUPÓW ==========

// GET - wygeneruj listę zakupów dla grupy
app.get('/api/groups/:groupId/shopping-list', async (req, res) => {
  try {
    // Pobierz dane grupy
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', req.params.groupId)
      .single();
    
    if (groupError) throw groupError;
    
    // Oblicz łączną liczbę osób
    const liczbaOsob = (group.liczba_uczestnikow || 0) + 
                       (group.liczba_opiekunow || 0) + 
                       (group.liczba_pilotow || 0) + 
                       (group.liczba_kierowcow || 0) + 
                       (group.liczba_kadry || 0);
    
    // Pobierz wszystkie posiłki z componentami
    const { data: meals, error: mealsError } = await supabase
      .from('group_meals')
      .select(`
        *,
        dishes (
          id,
          nazwa,
          dish_components (
            recipe_id,
            ilosc,
            jm,
            kategoria,
            recipes (
              nazwa,
              recipe_ingredients (
                ingredient_id,
                ilosc,
                jm,
                ingredients (nazwa)
              )
            )
          )
        )
      `)
      .eq('group_id', req.params.groupId);
    
    if (mealsError) throw mealsError;
    
    // Agreguj składniki
    const skladniki = {};
    
    meals.forEach(meal => {
      const porcje = meal.liczba_porcji || liczbaOsob;
      
      if (meal.dishes && meal.dishes.dish_components) {
        meal.dishes.dish_components.forEach(component => {
          if (component.recipes && component.recipes.recipe_ingredients) {
            component.recipes.recipe_ingredients.forEach(ri => {
              const key = ri.ingredient_id;
              const nazwa = ri.ingredients?.nazwa || 'Nieznany';
              const ilosc = (ri.ilosc || 0) * porcje;
              
              if (!skladniki[key]) {
                skladniki[key] = {
                  nazwa,
                  ilosc: 0,
                  jm: ri.jm
                };
              }
              
              skladniki[key].ilosc += ilosc;
            });
          }
        });
      }
    });
    
    // Konwertuj do array i posortuj
    const lista = Object.values(skladniki).sort((a, b) => 
      a.nazwa.localeCompare(b.nazwa, 'pl')
    );
    
    res.json({
      group_id: req.params.groupId,
      group_nazwa: group.nazwa,
      liczba_osob: liczbaOsob,
      liczba_dni: meals.length > 0 ? Math.max(...meals.map(m => m.dzien_numer)) : 0,
      skladniki: lista
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ALERGENY =====
app.get('/api/allergens', async (req, res) => {
  try {
      // Hardcoded lista 14 alergenów UE (działa bez tabeli w bazie)
      const allergens = [
          { id: 1, kod: 'GLUTEN', nazwa: 'Gluten', nazwa_pelna: 'Zboża zawierające gluten', kolejnosc: 1 },
          { id: 2, kod: 'CRUST', nazwa: 'Skorupiaki', nazwa_pelna: 'Skorupiaki i produkty pochodne', kolejnosc: 2 },
          { id: 3, kod: 'EGGS', nazwa: 'Jaja', nazwa_pelna: 'Jaja i produkty pochodne', kolejnosc: 3 },
          { id: 4, kod: 'FISH', nazwa: 'Ryby', nazwa_pelna: 'Ryby i produkty pochodne', kolejnosc: 4 },
          { id: 5, kod: 'PEANUTS', nazwa: 'Orzeszki ziemne', nazwa_pelna: 'Orzeszki ziemne (arachidowe) i produkty pochodne', kolejnosc: 5 },
          { id: 6, kod: 'SOY', nazwa: 'Soja', nazwa_pelna: 'Soja i produkty pochodne', kolejnosc: 6 },
          { id: 7, kod: 'MILK', nazwa: 'Mleko', nazwa_pelna: 'Mleko i produkty pochodne (łącznie z laktozą)', kolejnosc: 7 },
          { id: 8, kod: 'NUTS', nazwa: 'Orzechy', nazwa_pelna: 'Orzechy', kolejnosc: 8 },
          { id: 9, kod: 'CELERY', nazwa: 'Seler', nazwa_pelna: 'Seler i produkty pochodne', kolejnosc: 9 },
          { id: 10, kod: 'MUSTARD', nazwa: 'Gorczyca', nazwa_pelna: 'Gorczyca i produkty pochodne', kolejnosc: 10 },
          { id: 11, kod: 'SESAME', nazwa: 'Sezam', nazwa_pelna: 'Nasiona sezamu i produkty pochodne', kolejnosc: 11 },
          { id: 12, kod: 'SO2', nazwa: 'Dwutlenek siarki', nazwa_pelna: 'Dwutlenek siarki i siarczyny', kolejnosc: 12 },
          { id: 13, kod: 'LUPIN', nazwa: 'Łubin', nazwa_pelna: 'Łubin i produkty pochodne', kolejnosc: 13 },
          { id: 14, kod: 'MOLLUSCS', nazwa: 'Mięczaki', nazwa_pelna: 'Mięczaki i produkty pochodne', kolejnosc: 14 }
      ];
      
      res.json(allergens);
  } catch (err) {
      console.error('Błąd alergenów:', err);
      res.status(500).json({ error: err.message });
  }
});

// ===== SPRAWDZANIE DUPLIKATÓW (dla importu CSV) =====
app.post('/api/ingredients/check-duplicates', async (req, res) => {
  try {
      const { names } = req.body;
      
      if (!Array.isArray(names) || names.length === 0) {
          return res.json({ duplicates: [], existingIds: {} });
      }
      
      // Pobierz istniejące surowce o tych nazwach
      const { data, error } = await supabase
          .from('ingredients')
          .select('id, nazwa')
          .in('nazwa', names);
      
      if (error) {
          console.error('Błąd sprawdzania duplikatów:', error);
          return res.status(500).json({ error: error.message });
      }
      
      // Zwróć listę duplikatów i mapę nazwa -> id
      const duplicates = data.map(item => item.nazwa);
      const existingIds = {};
      data.forEach(item => {
          existingIds[item.nazwa] = item.id;
      });
      
      res.json({ duplicates, existingIds });
  } catch (err) {
      console.error('Błąd:', err);
      res.status(500).json({ error: err.message });
  }
});

// ===== EKSPORT CSV =====
app.get('/api/ingredients/export/csv', async (req, res) => {
  try {
      // Pobierz wszystkie składniki
      const { data: ingredients, error } = await supabase
          .from('ingredients')
          .select('*')
          .order('id');
      
      if (error) throw error;
      
      // Generuj CSV
      const headers = 'id,nazwa,typ,grupa,dzial,jm_podstawowa,wegetarianski,weganski,alergeny\n';
      
      const rows = ingredients.map(ing => {
          const alergeny = Array.isArray(ing.alergeny) ? JSON.stringify(ing.alergeny) : '[]';
          return [
              ing.id,
              `"${(ing.nazwa || '').replace(/"/g, '""')}"`, // Escape quotes
              ing.typ || '',
              ing.grupa || '',
              ing.dzial || '',
              ing.jm_podstawowa || '',
              ing.wegetarianski ? 'true' : '',
              ing.weganski ? 'true' : '',
              alergeny
          ].join(',');
      }).join('\n');
      
      const csv = '\uFEFF' + headers + rows; // BOM dla polskich znaków
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="surowce_export.csv"`);
      res.send(csv);
  } catch (err) {
      console.error('Błąd eksportu CSV:', err);
      res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Serwer dziaÅ‚a na http://localhost:3000'));