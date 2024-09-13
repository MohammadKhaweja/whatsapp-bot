require("dotenv").config();
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

const leagueDir = path.join(__dirname, "league"); // Path to the 'league' folder
const memes = path.join(__dirname, "memes"); // Path to the 'league' folder

const genAI = new GoogleGenerativeAI(process.env.AI);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Initialize the client with LocalAuth for persistent login
const client = new Client({
  authStrategy: new LocalAuth(),
});

// Generate a QR code for authentication
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("QR Code generated, scan it with WhatsApp.");
});

// Log when the client is ready
client.on("ready", () => {
  console.log("WhatsApp bot is ready!");
});

// Respond to incoming messages
client.on("message", async (message) => {
  console.log(`Message received: ${message.body}`);

  if (message.body.toLowerCase().startsWith("gpt")) {
    try {
      const prompt = message.body.substring(2).trim(); // Remove "bd" and trim whitespace
      const result = await model.generateContent(prompt);
      message.reply(result.response.text());
    } catch (error) {
      console.error("Error generating content:", error);
      message.reply("Sorry, I couldn't generate a response.");
    }
  } else if (message.body.toLowerCase().startsWith("league")) {
    fs.readdir(leagueDir, async (err, files) => {
      if (err) {
        console.error("Error reading the league directory:", err);
        return;
      }

      // Filter only mp3 files
      const mp3Files = files.filter((file) => path.extname(file) === ".mp3");

      if (mp3Files.length === 0) {
        message.reply("No MP3 files found in the league folder.");
        return;
      }

      // Pick a random file
      const randomFile = mp3Files[Math.floor(Math.random() * mp3Files.length)];
      const filePath = path.join(leagueDir, randomFile);

      // Read the file as base64
      const fileData = fs.readFileSync(filePath, { encoding: "base64" });

      // Send the audio file
      const media = new MessageMedia("audio/mp3", fileData, randomFile);
      await client.sendMessage(message.from, media);
    });
  } else if (message.body.toLowerCase().startsWith("huh")) {
    fs.readdir(memes, async (err, files) => {
      if (err) {
        console.error("Error reading the league directory:", err);
        return;
      }

      // Filter only mp3 files
      const mp3Files = files.filter((file) => path.extname(file) === ".mp3");

      if (mp3Files.length === 0) {
        message.reply("No MP3 files found in the league folder.");
        return;
      }

      // Pick a random file
      const randomFile = mp3Files[Math.floor(Math.random() * mp3Files.length)];
      const filePath = path.join(memes, randomFile);

      // Read the file as base64
      const fileData = fs.readFileSync(filePath, { encoding: "base64" });

      // Send the audio file
      const media = new MessageMedia("audio/mp3", fileData, randomFile);
      await client.sendMessage(message.from, media);
    });
  }
});

// Start the client
client.initialize();
