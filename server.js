import { } from 'dotenv/config';
import express from 'express';
import bcrypt from 'bcrypt';
import articleRoute from './routes/articles.js';
import commentsRoute from './routes/comments.js';
import blogRoute from './routes/blog.js';
import accessRoute from './routes/access.js';
import { makeid } from './utils.js';
import { init, usersCollection, tokensCollection } from './db.js';

const app = express();

app.use(express.json());
app.use('/blog', blogRoute);
app.use('/articles', articleRoute);
app.use('/comments', commentsRoute);
app.use('/access', accessRoute);

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await usersCollection.findOne({ username });
    if (!username || !user) {
        res.status(404).json({ message: "User does not exist" });
        return;
    }
    if (!password) {
        res.status(400).json({ message: "No password entered" });
        return;
    }
    const result = await bcrypt.compare(password, user.password); // compare encrypted passwords
    if (result) {
        const date = Date.now() + 86400000;
        let token = makeid(64);
        await tokensCollection.insertOne({ username, token, expDate: date });
        res.json({ message: "Login Successful", token });
    } else {
        res.status(400).json({ message: "Login Failed, Incorrect Password" });
    }
});

app.post('/register', async (req, res) => {
    const { username, password, repassword, email } = req.body;
    if (!username || !password || !repassword || !email) {
        res.status(400).json({ message: "Not enough information" });
        return;
    }
    const user = await usersCollection.findOne({ username });
    if (user) {
        res.status(400).json({ message: "This user is already exists." });
        return;
    }
    if (password !== repassword) {
        res.status(400).json({ message: "Passwords do not match." });
        return;
    }
    const emailExists = await usersCollection.findOne({ email });
    if (emailExists) {
        res.status(400).json({ message: "This email already exists" });
        return;
    }
    const date = new Date(Date.now() + 86400000);
    let token = makeid(64);
    await tokensCollection.insertOne({ username, token, expDate: date });
    const hash = await bcrypt.hash(password, process.env.BCRYPT_SALT); // encrypt password before saving
    await usersCollection.insertOne({ username, password: hash, email, rank: "user" });
    res.status(201).json({ message: "User registered successfully.", token });
});

init().then(function () {
    app.listen(5000, () => {
        console.log("Server is running on port 5000");
    })
});