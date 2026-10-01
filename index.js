const dns = require('dns');

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));

app.use('/public', express.static(`${process.cwd()}/public`));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

// URL Schema
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});

const Url = mongoose.model('Url', urlSchema);

// Home page
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Create Short URL
app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;

  let url;

  try {
    url = new URL(originalUrl);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return res.json({ error: 'invalid url' });
    }
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }

  // Check if the domain exists
  dns.lookup(url.hostname, async (err) => {
    if (err) {
      return res.json({ error: 'invalid url' });
    }

    try {
      // Check if URL already exists
      const existingUrl = await Url.findOne({
        original_url: originalUrl
      });

      if (existingUrl) {
        return res.json(existingUrl);
      }

      // Get the next short URL number
      const count = await Url.countDocuments({});

      // Create new URL
      const newUrl = new Url({
        original_url: originalUrl,
        short_url: count + 1
      });

      const data = await newUrl.save();

      res.json(data);

    } catch (error) {
      res.json({ error: 'database error' });
    }
  });
});

// Redirect Short URL
app.get('/api/shorturl/:short_url', async (req, res) => {
  const shortUrl = req.params.short_url;

  try {
    const data = await Url.findOne({
      short_url: shortUrl
    });

    if (!data) {
      return res.json({ error: 'No short URL found' });
    }

    res.redirect(data.original_url);

  } catch (error) {
    res.json({ error: 'database error' });
  }
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// Start server
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});