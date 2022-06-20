import express from 'express';
import { ObjectId } from 'mongodb';
import { tokensCollection, blogsCollection, articlesCollection } from '../db.js';
import { validateToken, hasAccess } from '../utils.js';
const route = express.Router();

route.get('/blogs', validateToken, async (req, res) => {
    const token = res.locals.token;
    const userAccess = await hasAccess(token, "view.blogs");
    if (!userAccess) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    }
    res.json({
        blogs: await blogsCollection.find({}).toArray()
    })
});

route.post('/', validateToken, async (req, res) => {
    const token = res.locals.token;
    const { blogName, description } = req.body;
    const userAccess = await hasAccess(token, "create.blog");
    if (token && !userAccess) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    } else if (!token && !userAccess) {
        res.status(400).json({ message: "Guests are not allowed to perform this action" });
        return;
    }
    const user = await tokensCollection.findOne({ token });
    const hasBlog = await blogsCollection.findOne({ username: user.username });
    if (hasBlog) {
        res.status(400).json({ message: "This user already have a blog" });
        return;
    }
    if (!blogName) {
        res.status(400).json({ message: "Not a valid blog name" });
        return;
    }
    const date = new Date();
    await blogsCollection.insertOne({ username: user.username, name: blogName, description, date });
    res.status(201).json({ message: "blog " + blogName + " has created successfully" });
});

route.patch('/', validateToken, async (req, res) => {
    const token = res.locals.token;
    const { blogName, description } = req.body;
    const blogId = req.query.bid;
    const userAccess = await hasAccess(token, "edit.blog");
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
    const blogExists = await blogsCollection.findOne({ _id: id });
    if (!blogExists) {
        res.status(404).json({ message: "Not a valid blog" });
        return;
    }
    const user = await tokensCollection.findOne({ token });
    if (user.username !== blogExists.username) {
        res.status(400).json({ message: "This user is not the owner of the blog" });
        return;
    }
    if (!blogName) {
        res.status(400).json({ message: "No valid input" });
        return;
    }
    if (blogExists.name != blogName) {
        await blogsCollection.updateOne({ _id: id }, { "$set": { name: blogName } });
    }
    if (blogExists.description != description) {
        await blogsCollection.updateOne({ _id: id }, { "$set": { description } });
    }
    res.json({ message: "blog " + blogName + " has been modified successfully" });
});

route.delete('/', validateToken, async (req, res) => {
    const token = res.locals.token;
    const blogId = req.query.bid;
    let userAccess = await hasAccess(token, "delete.blog");
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
    const blogExists = await blogsCollection.findOne({ _id: id });
    if (!blogExists) {
        res.status(404).json({ message: "Blog is not exist" });
        return;
    }
    const tokenObj = await tokensCollection.findOne({ token });
    userAccess = await hasAccess(token, "delete.user.blog");
    if (tokenObj.username !== blogExists.username && !userAccess) {
        res.status(400).json({ message: "This user is not the owner of the blog and don't have access" });
    } else {
        await blogsCollection.deleteOne({ _id: id });
        await articlesCollection.deleteMany({ blogId });
        res.json({ message: "blog has been deleted successfully" });
    }
});

export default route;