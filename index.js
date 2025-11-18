const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

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

app.listen(3000, () => console.log('Serwer dziaÅ‚a na http://localhost:3000'));
