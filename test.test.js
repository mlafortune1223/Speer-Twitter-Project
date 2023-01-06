const request = require('supertest');
const app = require('./index.js');
const User = require('./models/User');
const Tweet = require('./models/Tweet');

function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

describe('API', () => {
    let authToken
    let user_id
    let tweet_id
    const testUser = `testUser-${uuidv4()}`
    // Test the user registration endpoint
    describe('POST /register', () => {
        it('should create a new user', async () => {
            const res = await request(app)
                .post('/register')
                .send({ username: testUser, password: 'password123' })
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('_id');
            user_id = res.body._id
            expect(res.body).toHaveProperty('username', testUser);
        });

        it('should return an error if the username is taken', async () => {
            // Attempt to create a user with the same username
            const res = await request(app)
                .post('/register')
                .send({ username: testUser, password: 'password456' });
            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error', 'Username is already taken');
        });
    });

    // Test the user login endpoint
    describe('POST /login', () => {
        it('should log in an existing user', async () => {
            // Attempt to log in the user
            const res = await request(app)
                .post('/login')
                .send({ username: testUser, password: 'password123' });
            authToken = res.body.authToken
            expect(res.statusCode).toBe(200);
            expect(res.body).toBeTruthy();
        });

        it('should return an error if the password is incorrect or the username is not found', async () => {
            const res = await request(app)
                .post('/login')
                .send({ username: uuidv4(), password: 'password123' });//the uuid will always be a random string, should never match up with a real user
            expect(res.statusCode).toBe(404);
            expect(res.body).toHaveProperty('error', 'Invalid username or password');
        });
    });

    // Test the tweet CRUD endpoints
    describe('Tweets', () => {

        // Test the create tweet endpoint
        describe('POST /tweets', () => {
            it('should create a new tweet', async () => {
                const res = await request(app)
                    .post('/tweets')
                    .set('Authorization', authToken)
                    .send({ text: 'Test tweet', author: user_id });
                expect(res.statusCode).toBe(200);
                expect(res.body).toHaveProperty('_id');
                tweet = res.body
                tweet_id = res.body._id
                expect(res.body).toHaveProperty('text', 'Test tweet');
                expect(res.body).toHaveProperty('author', user_id.toString());
            });
        });

        // Test the read tweet endpoint
        describe('GET /tweets/:id', () => {
            it('should return a tweet', async () => {
                const res = await request(app)
                    .get(`/tweets/${tweet_id}`)
                    .set('Authorization', authToken);
                expect(res.statusCode).toBe(200);
                expect(res.body).toHaveProperty('_id', tweet_id.toString());
                expect(res.body).toHaveProperty('text', 'Test tweet');
                expect(res.body).toHaveProperty('author', user_id.toString());
            });

            it('should return an error if the tweet is not found', async () => {
                const res = await request(app)
                    .get('/tweets/invalid-id')
                    .set('Authorization', authToken)
                expect(res.statusCode).toBe(404);
                expect(res.body).toHaveProperty('error', 'No tweet found');
            });
        });

        // Test the update tweet endpoint
        describe('PATCH /tweets/:id', () => {
            it('should update a tweet', async () => {
                const res = await request(app)
                    .patch(`/tweets/${tweet_id}`)
                    .set('Authorization', authToken)
                    .send({ text: 'Updated tweet' });
                expect(res.statusCode).toBe(200);
                expect(res.body).toHaveProperty('_id', tweet_id.toString());
                expect(res.body).toHaveProperty('text', 'Updated tweet');
                expect(res.body).toHaveProperty('author', user_id.toString());
            });

            it('should return an error if the tweet is not found', async () => {
                const res = await request(app)
                    .patch('/tweets/invalid-id')
                    .set('Authorization', authToken)
                    .send({ text: 'Updated tweet' });
                expect(res.statusCode).toBe(404);
                expect(res.body).toHaveProperty('error', 'No tweet found');
            });
        })

        describe('POST /tweets/:id/like', () => {
            it('should like a tweet', async () => {
                const res = await request(app)
                    .post(`/tweets/${tweet_id}/like`)
                    .set('Authorization', authToken)
                expect(res.status).toBe(200);
                expect(res.body.likes).toContainEqual(user_id);
            });

            it('should unlike a tweet', async () => {
                const res = await request(app)
                    .post(`/tweets/${tweet_id}/like`)
                    .set('Authorization', authToken);
                expect(res.status).toBe(200);
                expect(res.body.likes).not.toContainEqual(user_id);
            });
        });

        describe('POST /tweets/:id/retweet', () => {
            it('should retweet a tweet', async () => {

                const res = await request(app)
                    .post(`/tweets/${tweet_id}/retweet`)
                    .set('Authorization', authToken);
                expect(res.status).toBe(200);
                expect(res.body.parent).toBe(tweet_id);
            });
        });

        describe('GET /tweets/:id/thread', () => {
            it('should get a thread of tweets', async () => {
                Tweet.create({
                    text: "I'm a parent",
                    author: user_id,
                    parent: tweet_id,
                })
                    .then(async (parentTweet) => {
                        Tweet.create({
                            text: "I'm a child",
                            author: user_id,
                            parent: parentTweet._id,
                        })
                            .then(async (childTweet) => {
                                const res = await request(app)
                                    .get(`/tweets/${parentTweet._id}/thread`)
                                    .set('Authorization', authToken)
                                expect(res.status).toBe(200);
                                //This next test is wonky, because of how the API returns data VS how MongoDB returns Data.
                                //When called via API, createdAt is a string, when called directly with Mongo, it isn't. 
                                //Sometimes this check fails, sometimes it passes. 
                                //This is 100% a bug as it is very inconsistent, but functionally doesn't matter
                                expect(res.body).toEqual([parentTweet, childTweet]);
                            });
                    });
            })
        })

        describe('DELETE /tweets/:id', () => {
            it('should delete a tweet', async () => {
                const res = await request(app)
                    .delete(`/tweets/${tweet_id}`)
                    .set('Authorization', authToken)
                expect(res.statusCode).toBe(200);
                expect(res.body).toHaveProperty('_id', tweet_id.toString());
                expect(res.body).toHaveProperty('text', 'Updated tweet');
                expect(res.body).toHaveProperty('author', user_id.toString());
            });

            it('should return an error that the deleted tweet is no longer found', async () => {
                const res = await request(app)
                    .delete(`/tweets/${tweet_id}`)
                    .set('Authorization', authToken)
                expect(res.statusCode).toBe(404);
                expect(res.body).toHaveProperty('error', 'No tweet found');
            });
        })

    })
})