import * as mongodb from 'mongodb';

const client = new mongodb.MongoClient(process.env.DATA_BASE);

export const usersCollection = client.db("blog").collection("users");
export const tokensCollection = client.db("blog").collection("tokens");
export const blogsCollection = client.db("blog").collection("blogs");
export const articlesCollection = client.db("blog").collection("articles");
export const commentsCollection = client.db("blog").collection("comments");
export const ranksCollection = client.db("blog").collection("ranks");

export async function init() {
    await client.connect();
    await updateDataBase();
    console.log("Connected to MongoDB");
}

async function updateDataBase() {
    let rankExists = await ranksCollection.findOne({ rank: "guest" });
    if (!rankExists) {
        await ranksCollection.insertOne({
            rank: "guest", 
            access: [
                "view.blogs",
                "view.article",
                "view.comment"
            ]
        });
    }
    rankExists = await ranksCollection.findOne({ rank: "user" });
    if (!rankExists) {
        await ranksCollection.insertOne({
            rank: "user",
            access: [
                "create.blog",
                "edit.blog",
                "delete.blog",
                "create.article",
                "edit.article",
                "delete.article",
                "create.comment",
                "delete.comment",
                "view.blogs",
                "view.article",
                "view.comment"
            ]
        });
    }
}