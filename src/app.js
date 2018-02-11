// app.js
const http = require('http');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const session = require('express-session');


const fs = require('fs');
const fn = path.join(__dirname, 'config.json');
const data = fs.readFileSync(fn);

// our configuration file will be in json, so parse it and get our salt
const conf = JSON.parse(data);
const sessionSecret = conf.secret;

//console.log('secret:', sessionSecret);

const app = express();
require('./db.js');

const User = mongoose.model('User');
const Article = mongoose.model('Article');
const IssueTag = mongoose.model('IssueTag');
const IndustryTag = mongoose.model('IndustryTag');

app.use(bodyParser.urlencoded({ extended: false }));
const publicPath = path.resolve(__dirname, 'public');
app.use(express.static(publicPath));
const sessionOptions = {
  secret: sessionSecret,
  saveUninitialized: false,
  resave: false,
};
app.use(session(sessionOptions));


app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.get('/api/articles', function(req, res) {
  let starting = new Date('Sat Feb 10 2018 23:57:38 GMT-0500 (EST)');
  let until = new Date();

  if (req.query.starting) {
    starting = new Date(req.query.starting);
  }
  if (req.query.until) {
    until = new Date(req.query.until);
  }

  

});


let portHTTP = 8000, portHTTPS = 8000;

let options = {};

if (process.env.NODE_ENV === 'PRODUCTION') {
  portHTTP = 80;
  portHTTPS = 443;

  options = {
    key: fs.readFileSync(conf.key),
    cert: fs.readFileSync(conf.cert)
  };
}

http.createServer(app).listen(portHTTP);
if (process.env.NODE_ENV === 'PRODUCTION') {
  https.createServer(options, app).listen(portHTTPS);
}
