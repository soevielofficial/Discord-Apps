const Discord = require("discord.js")
const dotenv = require("dotenv")
// const { OpenAIApi, Configuration } = require("openai")
const { REST } = require("@discordjs/rest")
const { Routes } = require("discord-api-types/v9")
const fs = require("fs")
const { Player } = require("discord-player")

const generateImage = require("./welcomeimage")

dotenv.config()
const TOKEN = process.env.TOKEN

const LOAD_SLASH = process.argv[2] == "load"

const CLIENT_ID = "" //APLICATION ID
const GUILD_ID = "" //SERVER ID

const client = new Discord.Client({
    intents: [
        "Guilds",
        "GuildMessages",
        "MessageContent",
        "GuildVoiceStates"
    ]
})

// const config = new Configuration({
//     apiKey: process.env.OPENAI_KEY
// })

// const openai = new OpenAIApi(config)

// const BOT_CHANNEL = "1046774871281123389"
// const PAST_MESSAGES = 5

// client.on(Events.MessageCreate, async (message) => {
//     if (message.author.bot) return
//     if (message.channel.id !== BOT_CHANNEL) return

//     message.channel.sendTyping()

//     let messages = Array.from(await message.channel.messages.fetch({
//         limit: PAST_MESSAGES,
//         before: message.id
//     }))
//     messages = messages.map(m=>m[1])
//     messages.unshift(message)

//     let users = [...new Set([...messages.map(m=> m.member.displayName), client.user.username])]

//     let lastUser = users.pop()

//     let prompt = `The following is a conversation between ${users.join(", ")}, and ${lastUser}. \n\n`

//     for (let i = messages.length - 1; i >= 0; i--) {
//         const m = messages[i]
//         prompt += `${m.member.displayName}: ${m.content}\n`
//     }
//     prompt += `${client.user.username}:`
//     console.log("prompt:", prompt)

//     const response = await openai.createCompletion({
//         prompt,
//         model: "text-davinci-003",
//         max_tokens: 500,
//         stop: ["\n"]
//     })

//     console.log("response", response.data.choices[0].text)
//     await message.channel.send(response.data.choices[0].text)
// })

const welcomeChannelId = "" //WELCOME CHANNEL ID

client.on("guildMemberAdd", async (member) => {
    const img = await generateImage(member)
    member.guild.channels.cache.get(welcomeChannelId).send({
        content: `<@${member.id}> Welcome to the server!`,
        files: [img]
    })
})

client.slashcommands = new Discord.Collection()
client.player = new Player(client, {
    ytdlOptions: {
        quality: "highestaudio",
        highWaterMark: 1 << 25
    }
})

let commands = []

const slashFiles = fs.readdirSync("./slash").filter(file => file.endsWith(".js"))
for (const file of slashFiles){
    const slashcmd = require(`./slash/${file}`)
    client.slashcommands.set(slashcmd.data.name, slashcmd)
    if (LOAD_SLASH) commands.push(slashcmd.data.toJSON())
}

if (LOAD_SLASH) {
    const rest = new REST({ version: "9" }).setToken(TOKEN)
    console.log("Deploying slash commands")
    rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {body: commands})
    .then(() => {
        console.log("Successfully loaded")
        process.exit(0)
    })
    .catch((err) => {
        if (err){
            console.log(err)
            process.exit(1)
        }
    })
}
else {
    client.on("ready", () => {
        console.log(`Logged in as ${client.user.tag}`)
    })
    client.on("interactionCreate", (interaction) => {
        async function handleCommand() {
            if (!interaction.isCommand()) return

            const slashcmd = client.slashcommands.get(interaction.commandName)
            if (!slashcmd) interaction.reply("Not a valid slash command")

            await interaction.deferReply()
            await slashcmd.run({ client, interaction })
        }
        handleCommand()
    })
    client.login(TOKEN)
}