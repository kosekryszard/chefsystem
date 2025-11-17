const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('ChefSystem API działa!'));
app.listen(3000, () => console.log('Serwer działa na http://localhost:3000'));