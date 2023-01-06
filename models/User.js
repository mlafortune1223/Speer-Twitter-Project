const mongoose = require('mongoose');

// Define the user schema
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    sessionToken: String,
});

// Create the User model from the schema
const User = mongoose.model('User', userSchema);

// Export the model
module.exports = User;