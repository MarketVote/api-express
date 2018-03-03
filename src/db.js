// db.js
const mongoose = require('mongoose');
const ObjectID = mongoose.Schema.Types.ObjectId;
mongoose.plugin(schema => { schema.options.usePushEach = true; });

//my schema goes here!
const User = new mongoose.Schema({
  sessionID: String,
  liked: [{type: ObjectID, ref: 'Article'}],
  disliked: [{type: ObjectID, ref: 'Article'}]
});

const Article = new mongoose.Schema({
  title: String,
  content: String,
  imageURL: String,
  conBlurbs: [{
    imageURL: String,
    content: String
  }],
  proBlurbs: [{
    imageURL: String,
    content: String
  }],
  likes: Number,
  dislikes: Number
},
{
  timestamps: true
});

const Tag = new mongoose.Schema({
  key: String,
  value: [{type: ObjectID, ref: 'Article'}]
});

mongoose.model('User', User);
mongoose.model('Article', Article);
mongoose.model('Tag', Tag);

let dbconf = null;
// is the environment variable, NODE_ENV, set to PRODUCTION?
if (process.env.NODE_ENV === 'PRODUCTION') {
 // if we're in PRODUCTION mode, then read the configration from a file
 // use blocking file io to do this...
 const fs = require('fs');
 const path = require('path');
 const fn = path.join(__dirname, 'config.json');
 const data = fs.readFileSync(fn);

 // our configuration file will be in json, so parse it and set the
 // conenction string appropriately!
 const conf = JSON.parse(data);
 dbconf = conf.dbconf;
} else {
 // if we're not in PRODUCTION mode, then use
 dbconf = 'mongodb://localhost/marketvote';
}

mongoose.connect(dbconf);
