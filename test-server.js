const express = require('express');
const path = require('path');
const app = express();
const port = 5001;

app.use(express.static('.'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-auth.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Test server running at http://localhost:${port}`);
});