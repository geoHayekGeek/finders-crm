const express = require('express');
const cors = require('cors');
require('dotenv').config();

const indexRoutes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

app.use('/', indexRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
