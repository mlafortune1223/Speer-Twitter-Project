const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const bcrypt = require('bcrypt');

const mongoose = require('mongoose');
const User = require('./models/User');
const Tweet = require('./models/Tweet')
const generateSessionToken = require('./generateSessionToken.js')

// Connect to the database
mongoose.connect('mongodb://localhost:27017/');

// Set up the middleware
app.use(bodyParser.json());

// Set up the routes
app.post('/register', (req, res) => {
  // Get the username and password from the request body
  const { username, password } = req.body;

  // Hash the password
  const hash = bcrypt.hashSync(password, 10);

  // Save the new user to the database
  User.create({ username, password: hash })
    .then((user) => {
      res.status(200).json(user);
    })
    .catch((error) => {
      res.status(400).json({ "error": "Username is already taken" });
    });
});

app.post('/login', (req, res) => {
  // Get the username and password from the request body
  const { username, password } = req.body;

  // Look up the user in the database
  User.findOne({ username })
    .then((user) => {
      if (!user || !bcrypt.compareSync(password, user.password)) {
        // If the username and password don't match any user, or if the provided password doesn't match the hashed password in the database, return an error
        return res.status(404).json({ "error": "Invalid username or password" });
      }
      // Generate a session token and save it to the database
      const authToken = generateSessionToken();
      user.sessionToken = authToken;
      user.save();

      // Return the session token to the client
      res.status(200).json({ authToken });
    })
    .catch((error) => {
      res.status(500).json({ "error": "Username is already taken" });
    });
});

app.post('/tweets', (req, res) => {
  // Get the session token from the request header
  const sessionToken = req.headers.authorization;

  // Look up the user in the database
  User.findOne({ sessionToken })
    .then((user) => {
      if (!user) {
        // If the session token is invalid, return an error
        return res.status(401).send('Unauthorized');
      }

      // Get the tweet text from the request body
      const { text } = req.body
      // Create a new tweet
      Tweet.create({ text, author: user.id })
        .then((tweet) => {
          res.status(200).json(tweet);
        })
        .catch((error) => {
          res.status(500).json({ "error": "Tweet failed" });
        });
    })
    .catch((error) => {
      res.status(500).json({ "error": "Unauthorized" });
    });
});

app.get('/tweets/:id', (req, res) => {
  // Get the session token from the request header
  const sessionToken = req.headers.authorization;

  // Look up the user in the database
  User.findOne({ sessionToken })
    .then((user) => {
      if (!user) {
        // If the session token is invalid, return an error
        return res.status(401).send('Unauthorized');
      }

      // Find all the tweets by the user
      Tweet.findById(req.params.id)
        .then((tweet) => {
          res.status(200).json(tweet);
        })
        .catch((error) => {
          res.status(404).json({ "error": "No tweet found" });
        });
    })
    .catch((error) => {
      res.status(401).json({ "error": "Unauthorized" });
    });
});

app.patch('/tweets/:id', (req, res) => {
  // Get the session token from the request header
  const sessionToken = req.headers.authorization;

  // Look up the user in the database
  User.findOne({ sessionToken })
    .then((user) => {
      if (!user) {
        // If the session token is invalid, return an error
        return res.status(401).send('Unauthorized');
      }

      // Find the tweet by its id and update its text
      Tweet.findByIdAndUpdate(req.params.id, { text: req.body.text }, { new: true })
        .then((tweet) => {
          if (!tweet) {
            return res.status(404).json({ "error": 'No tweet found' });
          }
          res.status(200).json(tweet);
        })
        .catch((error) => {
          res.status(404).json({ "error": "No tweet found" });
        });
    });
});

app.delete('/tweets/:id', (req, res) => {
  // Get the session token from the request header
  const sessionToken = req.headers.authorization;
  // Look up the user in the database
  User.findOne({ sessionToken })
    .then((user) => {
      if (!user) {
        // If the session token is invalid, return an error
        return res.status(401).send('Unauthorized');
      }

      // Find the tweet by its id and delete it
      Tweet.findByIdAndRemove(req.params.id)
        .then((tweet) => {
          if (!tweet) {
            return res.status(404).json({ error: 'No tweet found' });
          }
          res.status(200).json(tweet);
        })
        .catch((error) => {
          res.status(500).json({ "error": "No tweet found" });
        });
    })
    .catch((error) => {
      (error)
      res.status(401).json({ "error": "Unauthorized" });
    });
});

// Like/unlike a tweet
app.post('/tweets/:id/like', (req, res) => {
  // Get the session token from the request header
  const sessionToken = req.headers.authorization;

  // Look up the user in the database
  User.findOne({ sessionToken })
    .then((user) => {
      if (!user) {
        // If the session token is invalid, return an error
        return res.status(401).send('Unauthorized');
      }
      // Find the tweet by its id
      Tweet.findById(req.params.id, (err, tweet) => {
        if (err) return res.status(500).send(err)
        if (!tweet) return res.status(404).send({ message: 'Tweet not found' });

        // Check if the tweet is already liked by the user
        const liked = tweet.likes.find((like) => like.equals(user._id.toString()));

        // If the tweet is already liked, remove the like
        if (liked) {
          tweet.likes.pull(liked._id.toString());
        }
        // If the tweet is not liked, add a like
        else {
          tweet.likes.push(user._id.toString());
        }

        // Save the tweet
        tweet.save((err) => {
          if (err) return res.status(500).send(err)
          return res.send(tweet);
        });
      });
    })
});

// Retweet
app.post('/tweets/:id/retweet', (req, res) => {
  // Get the session token from the request header
  const sessionToken = req.headers.authorization;

  // Look up the user in the database
  User.findOne({ sessionToken })
    .then((user) => {
      if (!user) {
        // If the session token is invalid, return an error
        return res.status(401).send('Unauthorized');
      }
      // Find the tweet by its id
      Tweet.findById(req.params.id, (err, tweet) => {
        if (err) return res.status(500).send(err);
        if (!tweet) return res.status(404).send({ message: 'Tweet not found' });

        // Create a new tweet with the original tweet as the parent
        const retweet = new Tweet({
          text: tweet.text,
          author: user._id,
          parent: tweet._id,
        });

        // Save the retweet
        retweet.save((err) => {
          if (err) return res.status(500).send(err);
          return res.send(retweet);
        });
      });
    })
});

// Get a thread of tweets
app.get('/tweets/:id/thread', (req, res) => {
  (req.params.id)
  // Get the session token from the request header
  const sessionToken = req.headers.authorization;

  // Look up the user in the database
  User.findOne({ sessionToken })
    .then((user) => {
      if (!user) {
        // If the session token is invalid, return an error
        return res.status(401).send('Unauthorized');
      }
      // Find the tweet by its id
      Tweet.findById(req.params.id, (err, tweet) => {
        (err, tweet)
        if (err) return res.status(500).send(err);
        if (!tweet) return res.status(404).send({ message: 'Tweet not found' });

        // Find all tweets in the thread, starting with the parent tweet
        Tweet.find({ $or: [{ _id: tweet._id }, { parent: tweet._id }] })
          //.populate('likes')
          .sort({ createdAt: 1 })
          .exec((err, tweets) => {
            (err, tweets.likes)
            if (err) return res.status(500).send(err);
            return res.send(tweets);
          });
      });
    })
});

// Start the server
app.listen(3000, () => {
  ('Server listening on port 3000');
})

module.exports = app