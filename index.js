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
  res.send('ChefSystem API v1.0 - connected to database!');
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

// DELETE usunięcie surowca
app.delete('/api/ingredients/:id', async (req, res) => {
  const { error } = await supabase
    .from('ingredients')
    .delete()
    .eq('id', req.params.id);
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Surowiec usunięty' });
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

// GET receptura po ID (ze składnikami)
app.get('/api/recipes/:id', async (req, res) => {
  // Pobierz recepturę
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', req.params.id)
    .single();
  
  if (recipeError) return res.status(404).json({ error: 'Nie znaleziono receptury' });
  
  // Pobierz składniki
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
  const { skladniki, ...recipeData } = req.body;
  
  // Dodaj recepturę
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .insert([recipeData])
    .select()
    .single();
  
  if (recipeError) return res.status(400).json({ error: recipeError.message });
  
  // Dodaj składniki jeśli są
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
  const { skladniki, ...recipeData } = req.body;
  
  // Aktualizuj recepturę
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .update(recipeData)
    .eq('id', req.params.id)
    .select()
    .single();
  
  if (recipeError) return res.status(400).json({ error: recipeError.message });
  
  // Jeśli są nowe składniki, usuń stare i dodaj nowe
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
  res.json({ message: 'Receptura usunięta' });
});

app.listen(3000, () => console.log('Serwer działa na http://localhost:3000'));