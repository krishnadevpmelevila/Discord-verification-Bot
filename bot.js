const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const db = require('./database');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = process.env.BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
let guild;
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    try {
        guild = await client.guilds.fetch(GUILD_ID);
        if (!guild) {
            console.error('Guild not found');
        } else {
            console.log(`Fetched guild: ${guild.name}`);
        }
    } catch (error) {
        console.error('Error fetching guild:', error);
    }

});

client.on('messageCreate', async (message) => {
    console.log(message.channel.name);
    if (message.channel.name === 'verification' && !message.author.bot) {
        const userId = message.content.trim();
        db.getUserById(userId).then(async (row) => {
            if (row) {
                const member = message.guild.members.cache.get(message.author.id);
                const PRO_ROLE = message.guild.roles.cache.find(role => role.name === process.env.PRO_ROLE);
                const SUSPENDED_ROLE = message.guild.roles.cache.find(role => role.name === process.env.SUSPENDED_ROLE);
                // check if the user is already verified
                if (row.verify) {
                    message.channel.send('Invalid ID. Please make sure you entered the correct unique ID.');
                    return;
                }
                if (member && PRO_ROLE || SUSPENDED_ROLE) {
                    await member.roles.remove(SUSPENDED_ROLE);
                    await member.roles.add(PRO_ROLE);
                    //alter the Useradd and add discord userid and store it to the database
                    db.addUser(row.id, row.email, message.author.id, true);


                    message.channel.send(`Welcome, ${message.author.username}! You have been assigned the "pro member" role.`);
                }
            } else {
                message.channel.send('Invalid ID. Please make sure you entered the correct unique ID.');
            }
        }).catch(err => {
            console.error(err);
            message.channel.send('An error occurred while verifying your ID.');
        });
    }
});

app.use(bodyParser.json());

app.post('/webhook/adduser/:uniqueId/:email', (req, res) => {
    const { uniqueId, email } = req.params;
    db.addUser(uniqueId, email).then(() => {
        console.log(`Stored user with ID: ${uniqueId} and email: ${email}`);
        res.send('Webhook received');
    }).catch(err => {
        console.error(err);
        res.status(500).send('An error occurred');
    });
});


app.post('/webhook/suspend/:email', (req, res) => {
    const { email } = req.params;
    db.getUserByEmail(email).then(async (row) => {
        if (row) {
        //    remove the pro role and add the suspended role with the discord id
            // add role without cache
            const member = await guild.members.fetch(row.discordId);
            const proRole = guild.roles.cache.find(role => role.name === process.env.PRO_ROLE);
            const suspendedRole = guild.roles.cache.find(role => role.name === process.env.SUSPENDED_ROLE);

            console.log(member);
            if (member && proRole && suspendedRole) {
                await member.roles.remove(proRole);
                await member.roles.add(suspendedRole);
                res.send('User suspended');
            } else {
                res.status(404).send('User not found');
            }
           
        } else {
            res.status(404).send('User not found');
        }
    }).catch(err => {
        console.error(err);
        res.status(500).send('An error occurred');
    });
});

app.post('/webhook/kick/:email', (req, res) => {
    const { email } = req.params;
    // find the user by email
    db.getUserByEmail(email).then(row => {
        if (row) {
            // console.log(row.discordId);
            // send the unique ID to the user
            // kick user with row.discordId
            // const member = client.guilds.cache.get(GUILD_ID).members.cache.get(row.discordId);
            // find and delete the specific row
            member = guild.members.kick(row.discordId);
            db.deleteUser(row.discordId);
            if (member) {
                res.send('User kicked');
            } else {
                res.status(404).send('User not found');
            }
        } else {
            res.status(404).send('User not found');
        }
    }).catch(err => {
        console.error(err);
        res.status(500).send('An error occurred');
    });

});
client.login(TOKEN);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
