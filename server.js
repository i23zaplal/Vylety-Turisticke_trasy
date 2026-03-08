const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.urlencoded({ extended: true })); 
app.use(express.static('public')); 

const DATA_PATH = path.join(__dirname, 'data', 'trasy.json');

// Pomocné funkce pro práci se souborem
const nactiData = () => JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
const ulozData = (data) => fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

// Funkce pro obalení obsahu do HTML (vzhled stránek)
const obalHtml = (obsah) => `
    <!DOCTYPE html>
    <html lang="cs">
    <head>
        <meta charset="UTF-8">
        <link rel="stylesheet" href="/style.css">
        <title>Plánovač tras</title>
    </head>
    <body>
        <div class="container">
            <nav><a href="/">📍 Seznam tras</a> | <a href="/add">➕ Přidat novou trasu</a></nav>
            ${obsah}
        </div>
    </body>
    </html>
`;

// --- ROUTY / ENDPOINTY ---

// Zobrazení seznamu a filtrace (GET /items)
app.get('/', (req, res) => {
    let trasy = nactiData();
    const { hledat, stav } = req.query;

    if (hledat) trasy = trasy.filter(t => t.nazev.toLowerCase().includes(hledat.toLowerCase()));
    if (stav) trasy = trasy.filter(t => t.stav === stav);

    let seznamHtml = `
        <h1>Moje turistické trasy</h1>
        <form method="GET" class="filter-form">
            <input type="text" name="hledat" placeholder="Hledat podle názvu..." value="${hledat || ''}">
            <select name="stav">
                <option value="">-- Všechny stavy --</option>
                <option value="plánováno" ${stav === 'plánováno' ? 'selected' : ''}>Plánováno</option>
                <option value="hotovo" ${stav === 'hotovo' ? 'selected' : ''}>Hotovo</option>
            </select>
            <button type="submit">Filtrovat</button>
        </form>
        <div class="seznam">
            ${trasy.map(t => `
                <div class="karta">
                    <div>
                        <strong>${t.nazev}</strong> (${t.delka} km) <br>
                        <small>Náročnost: ${t.narocnost} | Stav: ${t.stav}</small>
                    </div>
                    <div>
                        <a href="/edit/${t.id}" class="btn-upravit">Upravit</a>
                        <a href="/delete/${t.id}" class="btn-smazat">Smazat</a>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    res.send(obalHtml(seznamHtml));
});

// Formulář pro přidání
app.get('/add', (req, res) => {
    res.send(obalHtml(`
        <h1>Přidat novou trasu</h1>
        <form action="/items" method="POST">
            <input type="text" name="nazev" placeholder="Název trasy" required>
            <input type="number" name="delka" placeholder="Délka v km" required min="1">
            <select name="narocnost">
                <option value="lehká">Lehká</option>
                <option value="střední">Střední</option>
                <option value="těžká">Těžká</option>
            </select>
            <select name="stav">
                <option value="plánováno">Plánováno</option>
                <option value="hotovo">Hotovo</option>
            </select>
            <button type="submit">Uložit trasu</button>
        </form>
    `));
});

// Vytvoření záznamu (POST /items)
app.post('/items', (req, res) => {
    const trasy = nactiData();
    const nova = { id: Date.now().toString(), ...req.body, delka: parseInt(req.body.delka) };
    trasy.push(nova);
    ulozData(trasy);
    res.redirect('/');
});

// Formulář pro editaci
app.get('/edit/:id', (req, res) => {
    const trasa = nactiData().find(t => t.id === req.params.id);
    if (!trasa) return res.send("Trasa neexistuje");
    res.send(obalHtml(`
        <h1>Upravit trasu</h1>
        <form action="/edit/${trasa.id}" method="POST">
            <input type="text" name="nazev" value="${trasa.nazev}" required>
            <input type="number" name="delka" value="${trasa.delka}" required>
            <select name="narocnost">
                <option value="lehká" ${trasa.narocnost === 'lehká' ? 'selected' : ''}>Lehká</option>
                <option value="střední" ${trasa.narocnost === 'střední' ? 'selected' : ''}>Střední</option>
                <option value="těžká" ${trasa.narocnost === 'těžká' ? 'selected' : ''}>Těžká</option>
            </select>
            <select name="stav">
                <option value="plánováno" ${trasa.stav === 'plánováno' ? 'selected' : ''}>Plánováno</option>
                <option value="hotovo" ${trasa.stav === 'hotovo' ? 'selected' : ''}>Hotovo</option>
            </select>
            <button type="submit">Uložit změny</button>
        </form>
    `));
});

// Uložení úprav (POST /edit/:id)
app.post('/edit/:id', (req, res) => {
    let trasy = nactiData();
    const index = trasy.findIndex(t => t.id === req.params.id);
    if (index !== -1) {
        trasy[index] = { id: req.params.id, ...req.body, delka: parseInt(req.body.delka) };
        ulozData(trasy);
    }
    res.redirect('/');
});

// Smazání (GET /delete/:id)
app.get('/delete/:id', (req, res) => {
    const trasy = nactiData().filter(t => t.id !== req.params.id);
    ulozData(trasy);
    res.redirect('/');
});

app.listen(3000, () => console.log('Server běží na http://localhost:3000'));