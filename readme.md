To install, simply run yarn, or npm install
####
For connecting to the MongoDB you can do either: 
1. In the index.js file change the URL in mongoose.connect to your local mongoose DB
2. docker run --name mongodb -d -p 27017:27017 mongo
####
To spin up server run node index.js
####
To run tests run yarn test
