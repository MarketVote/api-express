// app.js
const http = require('http');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const multer = require('multer');
const mime = require('mime-types');

const fs = require('fs');
const fn = path.join(__dirname, 'config.json');
const data = fs.readFileSync(fn);

//here, we're generating the counter that will be used in the non-colliding file names
let files = fs.readdirSync(path.resolve(__dirname, 'public/uploads/'));
//we take the maximum of all the filenames without their extensions
files = files.map((e) => { return Number.parseInt(e.split('.')[0], 16); });
files = files.filter(e => (e < 0 || e === 0 || e > 0));
//console.log('files:', files);
let max = Math.max( ... files );
if (max === -Infinity) {
  max = 0;
}
//console.log('max:', max);
// we devide by 100000 because that is the offset that we're giving to our numbers
//and then we add one to make up for the fact that the server was previously off
let counter = Math.floor(max/1000000)+1;
//console.log('counter', counter);

// our configuration file will be in json, so parse it and get our salt
const conf = JSON.parse(data);
const sessionSecret = conf.secret;
const authorPassword = conf.password;

//multer is going to help us deal with uploading files for articles, but we need to provide a custom naming scheme to avoid claubering file extensions
function generateNonCollidingFileName(ext) {
  const ceiling = counter * 1000000;
  const offset = Math.floor(Math.random() * ceiling);
  const numString = (ceiling + offset).toString(16);
  counter++;
  return (numString+'.'+ext);
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve(__dirname, 'public/uploads/'));
  },
  filename: function (req, file, cb) {
    //we just want to send the first option, because mime.extensions[file.mimetype] will return something like jpeg/jpg/jpe
    cb( null, generateNonCollidingFileName( (mime.extensions[file.mimetype]+'').split(',')[0] ) );
  }
});
const upload = multer({storage: storage});


//console.log('secret:', sessionSecret);

const app = express();
require('./db.js');

const User = mongoose.model('User');
const Article = mongoose.model('Article');

//TODO: implement tagging system
const Tag = mongoose.model('Tag'); //eslint-disable-line

app.use(bodyParser.json({
  strict: false
}));
const publicPath = path.resolve(__dirname, 'public');
app.use(express.static(publicPath));
const sessionOptions = {
  secret: sessionSecret,
  saveUninitialized: true,
  resave: true
};
app.use(session(sessionOptions));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header('Access-Control-Allow-Credentials', 'true');
  //res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


function getUser (sessionID) {
  //console.log('getUser called with sessionID:', sessionID);
  return new Promise( (resolve, reject) => {
    let user;
    User.findOne({sessionID: sessionID}).exec()
      .then(function (qUser) {
        //console.log('querried db and found:', qUser);
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

      //we need to make a deep copy of articles in order to modify/decorate it
      articles = JSON.parse(JSON.stringify(qArticles));

      articles = articles.map(function (article) {
        let status;
        console.log('the user is: ', user);
        console.log('the article id is: ', article._id, ' and \'\'+article._id === \'\'+user.liked[0] is ', ''+article._id === ''+user.liked[0]);
        if (user.liked.reduce(function (acc, cur) {
          return acc || ''+article._id === ''+cur;
        }, false)) {
          status = 'liked';
        }
        else if (user.disliked.reduce(function (acc, cur) {
          return acc || ''+article._id === ''+cur;
        }, false)) {
          status = 'disliked';
        }
        else {
          status = 'neutral';
        }
        article.status = status;

        return article;
      });
      return user.save();
    })

    .then(function (result) {
      res.json({ articles: articles });
    })

    .catch(function (err) {
      console.log(err);
      res.sendStatus(500);
    });
});

app.post('/api/like', function(req, res) {

  let user, article;

  //console.log('request body:', req.body);

  getUser(req.session.id)

    .then(function (qUser) {
      user = qUser;
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
      res.sendStatus(500);
    });
});

app.post('/api/dislike', function(req, res) {

  //console.log('request body:', req.body);

  let user, article;

  getUser(req.session.id)

    .then(function (qUser) {
      user = qUser;
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
      res.sendStatus(500);
    });
});

function setTag ( name,article ) {
  let tag;
  return Tag.findOne({key: name}).exec()
    .then(function (result) {
      if (result === null) {
        tag = new Tag({
          key: name,
          value: [article]
        });
      }
      else {
        tag = result;
        tag.value.push(article);
      }
      return tag.save();
    })
    .catch(function (err) {
      throw err;
    });
}

// tags: an array of tag names
// article: the ObjectID for an article
// calls getTag on all tag names, then adds the ObjectID to all, then saves all and returns the promise that Promise.all() returns
function setTags (tags, article) {
  //returns a promise that resolves when all the promises in tags.map resolve (btw, tags.map is going to be filled with all the promises from the tag saves)
  return Promise.all(tags.map( t => setTag( t, article ) ));
}

const cpUpload = upload.fields([{name: 'coverImg', maxCount: 1}, {name: 'proImgs'}, {name: 'conImgs'}]);
app.post('/api/articles', cpUpload, function (req, res) {
  if (req.body.password !== authorPassword) {
    res.sendStatus(403);
  }
  else {

    console.log('===LOGGING FILES===\n',req.files);
    console.log('===LOGGING BODY===\n', req.body);

    const conBlurbs = [];
    for (const blurb in req.body.conBlurbs) {
      conBlurbs.push({
        imageURL: path.join('/uploads', req.files.conImgs[blurb].filename),
        content: req.body.conBlurbs[blurb]
      });
    }

    const proBlurbs = [];
    for (const blurb in req.body.proBlurbs) {
      proBlurbs.push({
        imageURL: path.join('/uploads', req.files.proImgs[blurb].filename),
        content: req.body.proBlurbs[blurb]
      });
    }

    const article = new Article({
      title: req.body.title,
      content: req.body.content,
      imageURL: path.join('/uploads', req.files.coverImg[0].filename),
      conBlurbs: conBlurbs,
      proBlurbs: proBlurbs,
      likes: 0,
      dislikes: 0
    });

    setTags( req.body.tags, article._id )
      .then(function (result) {
        return article.save();
      })
      .then(function (result) {
        res.sendStatus(200);
      })
      .catch(function (err) {
        res.sendStatus(500);
      });
  }
});

app.get('/', function(req, res) {
  req.session.saveme = true;
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
