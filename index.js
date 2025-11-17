const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(express.json());

// Inicjalizacja Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Test endpoint
app.get('/', (req, res) => {
  res.send('ChefSystem API działa!');
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

app.listen(3000, () => console.log('Serwer działa na http://localhost:3000'));