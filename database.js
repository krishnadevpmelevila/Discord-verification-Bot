const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

let db;

const connectToDatabase = async () => {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
        db = client.db('discordBot');
        await db.createCollection('users');
        console.log("Collection created!");
    } catch (err) {
        console.error("Error connecting to MongoDB:", err);
    }
};

// const addUser = async (id, email,discordId) => {
//     if (!db) {
//         await connectToDatabase();
//     }
//     return db.collection('users').insertOne({ id, email, discordId});
// };


const addUser = async (id, email, discordId, verify) => {
    if (!db) {
        await connectToDatabase();
    }

    const existingUser = await db.collection('users').findOne({ id });

    if (existingUser) {
        // Update the existing document with the new Discord user ID
        await db.collection('users').updateOne(
            { id },
            { $set: { discordId, verify } }
        );
        console.log(`Updated user with ID: ${id} with Discord user ID: ${discordId}`);
    } else {
        // Insert a new document if the user doesn't exist
        await db.collection('users').insertOne({ id, email, discordId, verify });
        console.log(`Added new user with ID: ${id}, email: ${email}, Discord user ID: ${discordId}`);
    }
};

const getUserByEmail = async (email) => {
    if (!db) {
        await connectToDatabase();
    }
    return db.collection('users').findOne({
        email
    });
}
const getUserById = async (id) => {
    if (!db) {
        await connectToDatabase();
    }
    return db.collection('users').findOne({ id });
};
const deleteUser = async (id) => {
    if (!db) {
        await connectToDatabase();
    }
    return db.collection('users').deleteOne({ discordId: id });
};

module.exports = {
    addUser,
    getUserById,
    getUserByEmail,
    deleteUser
};
