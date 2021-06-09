require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const dns = require('dns');
const mongoose = require('mongoose');

// Basic Configuration
const port = process.env.PORT || 3000;
mongoose.connect(process.env['MONGODB_URI'], { useNewUrlParser: true, useUnifiedTopology: true });

const Schema = mongoose.Schema;
const URLShortenerSchema = new Schema({
  original_url: { type: String, required: true },
  short_url: Number
});

const URLShortenerModel = mongoose.model("URLShortenerModel", URLShortenerSchema);

const findByOriginalUrl = (url, done) => {
  URLShortenerModel.findOne({original_url: url}, function(error, model) {
    if (error) return console.log(error);
    done(null, model);
  });
};
const findByShortUrl = (url, done) => {
  URLShortenerModel.findOne({short_url: url}, function(error, model) {
    if (error) return console.log(error);
    done(null, model);
  });
};
const createAndSaveShortUrl = (url, done) => {
  URLShortenerModel.find().estimatedDocumentCount((error, count) => {
    if (error) return console.error(error);
    var model = new URLShortenerModel({original_url: url, short_url: count+1});
    model.save(function(error, data){
      if (error) return console.error(error);  
      done(null, data);
    });
  });
};

app.use(bodyParser.urlencoded({extended: false}));
app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/shorturl', function(req, res) {
  let url = req.body.url;
  let parsedURL = new URL(url);

  dns.lookup(parsedURL.hostname, (err, address, family) => {
    if (err) return res.json({"error": "invalid url"});

    findByOriginalUrl(url, (error, model) => {
      if (err) return res.json({"error": error});
      if (model) {
        res.json({
          "original_url": model.original_url,
          "short_url": model.short_url
        });
      } else {
        createAndSaveShortUrl(url, (error, model) => {
          if (err) return res.json({"error": error});
          res.json({
            "original_url": model.original_url,
            "short_url": model.short_url
          });
        });
      }
    });
  });
});

app.get('/api/shorturl/:short_url', function(req, res) {
  findByShortUrl(req.params.short_url, (error, model) => {
    if (error) return res.json({"error": error});
    if (model) {
      res.redirect(model.original_url);
    } else {
      res.json({"error": "No short URL found for the given input"});
    }
  });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
