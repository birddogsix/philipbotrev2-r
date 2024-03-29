import dotenv from "dotenv"
dotenv.config()

import { Client, GatewayIntentBits } from "discord.js"
import OpenAI from "openai"

const BOT_PERSONALITY = "Act like you are Philip, a person in his 20s. Do not break character. Keep your messages within 2 sentences and sound like you are messaging someone on discord (only use emojis scarcely). Use as little punctuation as possible. You work as a delivery driver at FedEx. You don't like anything except OSRS & watching american football & reading. Laugh with jajaja instead of haha"

class GPTManager {
    client: OpenAI
    characterCountLimit: number
    chatHistory: OpenAI.ChatCompletionMessageParam[]
    personality: string

    constructor(personality: string) {
        this.characterCountLimit = 8000
        this.personality = personality
        this.chatHistory = []
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        })
    }

    async chat(authorName: string, prompt: string): Promise<string> {
        if (!prompt) {
            console.log("no prompt given")
            return ""
        }
        if (prompt.length > this.characterCountLimit) {
            console.log("message too long")
            return ""
        }

        this.chatHistory.push({ role: "user", content: `${authorName}: ${prompt}` })
        if (this.chatHistory.reduce((a, b): string => a + b.content, "").length > this.characterCountLimit) {
            let removedMessage: OpenAI.ChatCompletionMessageParam | undefined = this.chatHistory.shift()
            console.log(`removed message "${removedMessage?.content}" due to character limit`)
        }

        const MESSAGES: OpenAI.ChatCompletionMessageParam[] = [{ role: "system", content: this.personality }, ...this.chatHistory]
        console.log(`responding to "${prompt}"`)
        const completion = await this.client.chat.completions.create({
            messages: MESSAGES,
            model: "gpt-4-1106-preview",
        });
        this.chatHistory.push({ role: completion.choices[0].message.role, content: completion.choices[0].message.content })
        const answer: string | null = completion.choices[0].message.content
        if (!answer) {
            console.log("empty API response")
            return ""
        }

        return answer.replace(/^philip: /i, "")
    }
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
    ]
})

const PHILIP_REGEX = /philip|<@855651612197257237>|<@235840991435685888>|phil|floki|filip/gi
// let manager: GPTManager = new GPTManager(BOT_PERSONALITY)
let managers: {[k: string]: GPTManager} = {}
client.on("ready", async () => {
    console.log("Ready to read")
})

client.on("messageCreate", async (message) => {

    if (message.author.bot) return

    if (!managers?.[message.channelId]) {
        managers[message.channelId] = new GPTManager(BOT_PERSONALITY)
    }

    let manager: GPTManager = managers[message.channelId]
    if (message.content.match(PHILIP_REGEX) || message?.mentions?.repliedUser?.id == "855651612197257237") {
        const newMessage = message.content.replace(PHILIP_REGEX, "philip")
        const response: string = await manager.chat(message.author.username, newMessage)
        if (response.length > 0) {
            message.reply(response)
        }
    }

})

client.login(process.env.DISCORD_TOKEN)