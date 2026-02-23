const express = require('express');
const path = require('path');
const app = express();
const PORT = 8080;

// Serve os arquivos estáticos (HTML, CSS, JS, Imagens)
app.use(express.static(__dirname));

// Rota principal para abrir o index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Chatbot online em http://localhost:${PORT}`);
});