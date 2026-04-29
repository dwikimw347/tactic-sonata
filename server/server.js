const path = require('path');
const express = require('express');
const gameRoutes = require('./routes/gameRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client')));
app.use('/api/game', gameRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Phrolova conducts the game at http://localhost:${PORT}`);
  });
}

module.exports = app;
