import express from 'express';
import { ObjectId } from 'mongodb';
import { commentsCollection, tokensCollection } from '../db.js';
import { validateToken, hasAccess } from '../utils.js';
const route = express.Router();

route.get('/', validateToken, async (req, res) => {
    const token = res.locals.token;
    const userAccess = await hasAccess(token, "view.comments");
    const articleId = req.query.aid;
    if (!articleId) {
        res.status(400).json({ message: "Not a valid article id" });
        return;
    }
    if (!userAccess) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    }
    res.json({
        comments: await commentsCollection.find({ articleId }).toArray()
    });
});

route.post('/', validateToken, async (req, res) => {
    const token = res.locals.token;
    const { comment } = req.body;
    const articleId = req.query.aid;
    const userAccess = await hasAccess(token, "create.comment");
    if (token && !userAccess) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    } else if (!token && !userAccess) {
        res.status(400).json({ message: "Guests are not allowed to perform this action" });
        return;
    }
    if (!articleId) {
        res.status(400).json({ message: "Not a valid article id" });
        return;
    }
    if (!comment) {
        res.status(400).json({ message: "Not a valid comment" });
        return;
    }
    const date = new Date();
    const user = await tokensCollection.findOne({ token });
    await commentsCollection.insertOne({ articleId, username: user.username, comment, date });
    res.status(201).json({ message: "comment has been saved successfully" });
});

route.patch('/', validateToken, async (req, res) => {
    const token = res.locals.token;
    const { commentId, comment } = req.body;
    const userAccess = await hasAccess(token, "edit.comment");
    if (token && !userAccess) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    } else if (!token && !userAccess) {
        res.status(400).json({ message: "Guests are not allowed to perform this action" });
        return;
    }
    if (!commentId || commentId.length !== 24) {
        res.status(400).json({ message: "Not a valid article id" });
        return;
    }
    const id = new ObjectId(commentId);
    const commentExists = await commentsCollection.findOne({ _id: id });
    if (!commentExists) {
        res.status(404).json({ message: "comment was not found" });
        return;
    }
    const user = await tokensCollection.findOne({ token });
    if (commentExists.username !== user.username) {
        res.status(400).json({ message: "This user did not write this comment" });
        return;
    }
    if (!comment) {
        res.status(400).jsom({ message: "No valid comment" });
        return;
    }
    if (commentExists.comment != comment) {
        await commentsCollection.updateOne({ _id: id }, { "$set": { comment } });
    }
    res.json({ message: "comment has been modifed successfully" });
});

route.delete('/', validateToken, async (req, res) => {
    const token = res.locals.token;
    const { commentId } = req.body;
    let userAccess = await hasAccess(token, "delete.comment");
    if (token && !userAccess) {
        res.status(400).json({ message: "This user is not allowed to perform this action" });
        return;
    } else if (!token && !userAccess) {
        res.status(400).json({ message: "Guests are not allowed to perform this action" });
        return;
    }
    if (!commentId || commentId.length !== 24) {
        res.status(400).json({ message: "Not a valid comment id" });
        return;
    }
    const id = new ObjectId(commentId);
    const commentExists = await commentsCollection.findOne({ _id: id });
    if (!commentExists) {
        res.status(404).json({ message: "comment was not found" });
        return;
    }
    const user = await tokensCollection.findOne({ token });
    userAccess = await hasAccess(token, "delete.user.comment");
    if (commentExists.username !== user.username && !userAccess) {
        res.status(400).json({ message: "This user did not write this comment and doesn't have access" });
        return;
    }
    await commentsCollection.deleteOne({ _id: id });
    res.json({ message: "comment has been deleted successfully" });
});

export default route;