// app.js
const http = require('http');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const multer = require('multer');
const upload = multer({ dest: path.resolve(__dirname, 'public/uploads/') });


const fs = require('fs');
const fn = path.join(__dirname, 'config.json');
const data = fs.readFileSync(fn);

// our configuration file will be in json, so parse it and get our salt
const conf = JSON.parse(data);
const sessionSecret = conf.secret;
const authorPassword = conf.password;

//console.log('secret:', sessionSecret);

const app = express();
require('./db.js');

const User = mongoose.model('User');
const Article = mongoose.model('Article');

//TODO: implement tagging system
const IssueTag = mongoose.model('IssueTag'); //eslint-disable-line
const IndustryTag = mongoose.model('IndustryTag'); //eslint-disable-line

app.use(bodyParser.urlencoded({ extended: false }));
const publicPath = path.resolve(__dirname, 'public');
app.use(express.static(publicPath));
const sessionOptions = {
  secret: sessionSecret,
  saveUninitialized: false,
  resave: false,
};
app.use(session(sessionOptions));


function getUser (sessionID) {
  return new Promise( (resolve, reject) => {
    let user;
    User.findOne({sessionID: sessionID}).exec()
      .then(function (qUser) {
        if (qUser === null) {
          user = new User({
            sessionID: sessionID,
            liked: [],
            disliked: []
          });
        }
        else {
          user = qUser;
        }
        resolve(user);
      })
      .catch(function (err) {
        reject(err);
      });
    });
}

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

  let user, articles;

  getUser(req.session.id)

    .then(function (qUser) {
      user = qUser;

      return Article
        .where('createdAt').gte(starting).lte(until)
        .sort('-createdAt')
        .exec();
    })

    .then(function (qArticles) {

      if (qArticles === null) {
        throw 'no articles found';
      }

      articles = qArticles;

      articles.map(function (article) {
        let state;
        if (user.liked.includes(article._id)) {
          state = 'liked';
        }
        else if (user.disliked.includes(article._id)) {
          state = 'disliked';
        }
        else {
          state = 'neutral';
        }

        article.state = state;
        return article;
      });
      return user.save();
    })

    .then(function (result) {
      res.json({ articles: articles });
    })

    .catch(function (err) {
      console.log(err);
      res.send(500);
    });
});

app.post('/api/like', function(req, res) {

  let user, article;

  getUser(req.session.id)

    .then(function (qUser) {
      return Article
        .findById(req.body.article._id)
        .exec();
    })

    .then(function (qArticle) {
      if (qArticle === null) {
        throw 'no article found';
      }
      article = qArticle;

      user.liked.push(article._id);
      article.likes++;
    })

    .then(function () {
      return user.save();
    })

    .then(function (result) {
      return article.save();
    })

    .then(function (result) {
      res.json({result: 'ok'});
    })

    .catch(function (err) {
      console.log(err);
      res.send(500);
    });
});

app.post('/api/dislike', function(req, res) {

  let user, article;

  getUser(req.session.id)

    .then(function (qUser) {
      return Article
        .findById(req.body.article._id)
        .exec();
    })

    .then(function (qArticle) {
      if (qArticle === null) {
        throw 'no article found';
      }
      article = qArticle;

      user.disliked.push(article._id);
      article.dislikes++;
    })

    .then(function () {
      return user.save();
    })

    .then(function (result) {
      return article.save();
    })

    .then(function (result) {
      res.json({result: 'ok'});
    })

    .catch(function (err) {
      console.log(err);
      res.send(500);
    });
});

const cpUpload = upload.fields([{name: 'coverImg', maxCount: 1}, {name: 'proImgs'}, {name: 'conImgs'}]);
app.post('/api/articles', cpUpload, function (req, res) {
  if (req.body.password !== authorPassword) {
    res.send(403);
  }
  else {

    //TODO: implement tagging here (each article has industry tags and issue tags -- those tags have to be searched for, and created if they are not found, then this article's _id needs to be added to them to maintain associativity)

    const conBlurbs = [];
    for (const blurb in req.body.conBlurbs) {
      conBlurbs.push({
        imageURL: path.join('/uploads', req.files.conImgs[blurb].name),
        content: req.body.conBlurbs[blurb].content
      });
    }

    const proBlurbs = [];
    for (const blurb in req.body.proBlurbs) {
      proBlurbs.push({
        imageURL: path.join('/uploads', req.files.proImgs[blurb].name),
        content: req.body.proBlurbs[blurb].content
      });
    }

    const article = new Article({
      title: req.body.title,
      content: req.body.content,
      imageURL: path.join('/uploads', req.files.coverImg.name),
      conBlurbs: conBlurbs,
      proBlurbs: proBlurbs,
      likes: 0,
      dislikes: 0
    });

    article.save()
      .then(function (result) {
        res.send(200);
      })
      .catch(function (err) {
        res.send(500);
      });
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
