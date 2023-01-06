const mongoose = require('mongoose');

// Define the tweet schema
const tweetSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
    },
    author: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    likes: [{
        type: mongoose.Types.ObjectId,
        ref: 'User'
    }],
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tweet'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

// Create the Tweet model from the schema
const Tweet = mongoose.model('Tweet', tweetSchema)

// Export the model
module.exports = Tweet