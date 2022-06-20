import express from 'express';
import { ObjectId } from 'mongodb';
import { articlesCollection, tokensCollection, blogsCollection, commentsCollection } from '../db.js';
import { validateToken, hasAccess } from '../utils.js';
const route = express.Router();

route.get('/', validateToken, async (req, res) => {
    const token = res.locals.token;
    const userAccess = await hasAccess(token, "view.articles");
    const blogId = req.query.bid;
    if (!blogId) {
        res.status(400).json({ message: "Not a valid blog id" });
        return;
    }
    if (!userAccess) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    }
    res.json({
        articles: await articlesCollection.find({ blogId }).toArray()
    });
});

route.post('/', validateToken, async (req, res) => {
    const token = res.locals.token;
    const { title, description, markdown } = req.body;
    const blogId = req.query.bid;
    const userAccess = await hasAccess(token, "create.article");
    if (token && !userAccess) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    } else if (!token && !userAccess) {
        res.status(400).json({ message: "Guests are not allowed to perform this action" });
        return;
    }
    if (!blogId || blogId.length !== 24) {
        res.status(400).json({ message: "Not a valid blog id" });
        return;
    }
    const id = new ObjectId(blogId);
    const user = await tokensCollection.findOne({ token });
    const owner = await blogsCollection.findOne({ _id: id });
    if (owner.username !== user.username) {
        res.status(400).json({ message: "This user is not the owner of this blog" });
        return;
    }
    if (!title || !markdown) {
        res.status(400).json({ message: "Not a valid input" });
        return;
    }
    let date = new Date();
    await articlesCollection.insertOne({ blogId, title, description, markdown, username: user.username, date });
    res.status(201).json({ message: "Article posted" });
});

route.patch('/', validateToken, async (req, res) => {
    const token = res.locals.token;
    const { title, description, markdown } = req.body;
    const articleId = req.query.aid;
    const userAccess = await hasAccess(token, "edit.article");
    if (token && !userAccess) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    } else if (!token && !userAccess) {
        res.status(400).json({ message: "Guests are not allowed to perform this action" });
        return;
    }
    if (!articleId || articleId.length !== 24) {
        res.status(400).json({ message: "Not a valid article id" });
        return;
    }
    const id = new ObjectId(articleId);
    const articleExists = await articlesCollection.findOne({ _id: id });
    if (!articleExists) {
        res.status(404).json({ message: "Article not exist" });
        return;
    }
    const user = await tokensCollection.findOne({ token });
    if (articleExists.username !== user.username) {
        res.status(400).json({ message: "This user is not the owner of the blog" });
        return;
    }
    const date = new Date();
    if (!title || !markdown) {
        res.status(400).json({ message: "No valid input" });
        return;
    }
    if (articleExists.title != title) {
        await articlesCollection.updateOne({ _id: id }, { "$set": { title } });
    }
    if (articleExists.description != description) {
        await articlesCollection.updateOne({ _id: id }, { "$set": { description } });
    }
    if (articleExists.markdown != markdown) {
        await articlesCollection.updateOne({ _id: id }, { "$set": { markdown } });
    }
    await articlesCollection.updateOne({ _id: id }, { "$set": { date } });
    res.json({ message: "article " + ((articleExists.title !== title && title) ? title : articleExists.title) + " has been modified successfully" });
});

route.delete('/', validateToken, async (req, res) => {
    const token = res.locals.token;
    const articleId = req.query.aid;
    let userAccess = await hasAccess(token, "delete.article");
    if (token && !userAccess) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    } else if (!token && !userAccess) {
        res.status(400).json({ message: "Guests are not allowed to perform this action" });
        return;
    }
    if (!articleId || articleId.length !== 24) {
        res.status(400).json({ message: "Not a valid article id" });
        return;
    }
    const id = new ObjectId(articleId);
    const articleExists = await articlesCollection.findOne({ _id: id });
    if (!articleExists) {
        res.status(404).json({ message: "Article not exist" });
        return;
    }
    const user = await tokensCollection.findOne({ token });
    userAccess = await hasAccess(token, "delete.user.article");
    if (articleExists.username !== user.username && !userAccess) {
        res.status(400).json({ message: "This user is not the owner of the blog and doesn't have access" });
        return;
    }
    await articlesCollection.deleteOne({ _id: id });
    await commentsCollection.deleteMany({ articleId });
    res.json({ message: "article has been deleted successfully" });
});


export default route;