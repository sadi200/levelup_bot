import fetch from 'node-fetch';
import readline from 'readline-sync';
import fs from 'fs';
import chalk from 'chalk';
import cfonts from 'cfonts';

// Display banner
cfonts.say('Reply Bot System', {
  font: 'block',
  align: 'center',
  colors: ['cyan', 'magenta'],
  background: 'black',
  letterSpacing: 1,
  lineHeight: 1,
  space: true,
  maxLength: '0',
});
console.log(chalk.green("=== Discord Reply Bot System ==="));

// TELEGRAM NOTIFICATION OPTION
console.log(chalk.cyan("\n🔔 === TELEGRAM NOTIFICATION ==="));

let enableTelegram = false;
let TELEGRAM_BOT_TOKEN = "";
let TELEGRAM_CHAT_ID = "";

// Ask user if they want Telegram notifications
const telegramChoice = readline.question("Enable Telegram notifications? (yes/no): ").toLowerCase();
if (telegramChoice === 'yes') {
  enableTelegram = true;
  
  // Check if config exists
  if (fs.existsSync("telegram.config")) {
    try {
      const config = fs.readFileSync("telegram.config", "utf-8").split('\n');
      TELEGRAM_BOT_TOKEN = config[0]?.trim() || "";
      TELEGRAM_CHAT_ID = config[1]?.trim() || "";
      
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        console.log(chalk.green("[✓] Telegram config loaded"));
      } else {
        console.log(chalk.yellow("[!] Invalid telegram.config, setting up new..."));
        enableTelegram = false;
      }
    } catch (error) {
      console.log(chalk.yellow("[!] Error reading telegram.config"));
      enableTelegram = false;
    }
  }
  
  // If not configured, setup new
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log(chalk.cyan("\n📝 Telegram Bot Setup:"));
    console.log("1. Create bot: @BotFather -> /newbot");
    console.log("2. Get Chat ID: @userinfobot -> /start");
    console.log(chalk.cyan("=".repeat(50)));
    
    TELEGRAM_BOT_TOKEN = readline.question("Bot Token: ");
    TELEGRAM_CHAT_ID = readline.question("Chat ID: ");
    
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      fs.writeFileSync("telegram.config", `${TELEGRAM_BOT_TOKEN}\n${TELEGRAM_CHAT_ID}`);
      console.log(chalk.green("[✓] Telegram config saved"));
    } else {
      console.log(chalk.yellow("[!] Telegram setup incomplete, disabling..."));
      enableTelegram = false;
    }
  }
} else {
  console.log(chalk.yellow("[!] Telegram notifications disabled"));
}

// Telegram notification function
const sendTelegramNotification = async (message) => {
  if (!enableTelegram || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return false;
  }
  
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });
    
    return response.ok;
  } catch (error) {
    console.log(chalk.red("[✗] Telegram error: " + error.message));
    return false;
  }
};

// Load Gemini API key
let GEMINI_API_KEY = "";
if (fs.existsSync("gemini.key")) {
  GEMINI_API_KEY = fs.readFileSync("gemini.key", "utf-8").trim();
  console.log(chalk.green("[✓] Gemini API key loaded"));
} else {
  console.log(chalk.red("[✗] Create gemini.key file with Gemini API key"));
  process.exit(1);
}

// Load Discord tokens
let bot1Tokens = [];
let bot2Tokens = [];
let channelIds = [];

// Load Bot 1 tokens
if (fs.existsSync("bot1_tokens.txt")) {
  bot1Tokens = fs.readFileSync("bot1_tokens.txt", "utf-8")
    .split('\n')
    .map(t => t.trim())
    .filter(t => t.length > 0);
  console.log(chalk.green(`[✓] Bot 1 tokens: ${bot1Tokens.length}`));
} else {
  console.log(chalk.red("[✗] Create bot1_tokens.txt with Discord tokens"));
  process.exit(1);
}

// Load Bot 2 tokens
if (fs.existsSync("bot2_tokens.txt")) {
  bot2Tokens = fs.readFileSync("bot2_tokens.txt", "utf-8")
    .split('\n')
    .map(t => t.trim())
    .filter(t => t.length > 0);
  console.log(chalk.green(`[✓] Bot 2 tokens: ${bot2Tokens.length}`));
} else {
  console.log(chalk.red("[✗] Create bot2_tokens.txt with Discord tokens"));
  process.exit(1);
}

// Load channels
if (fs.existsSync("channels.txt")) {
  channelIds = fs.readFileSync("channels.txt", "utf-8")
    .split('\n')
    .map(id => id.trim())
    .filter(id => id.length > 0);
  console.log(chalk.green(`[✓] Channels: ${channelIds.length}`));
} else {
  console.log(chalk.red("[✗] Create channels.txt with Discord channel IDs"));
  process.exit(1);
}

// Gemini AI Functions
const generateWithGemini = async (prompt, context = "") => {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    let fullPrompt = prompt;
    if (context) {
      fullPrompt = `Previous message: "${context}"\n${prompt}`;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { 
          maxOutputTokens: 35,
          temperature: 0.7
        }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      text = text.trim().replace(/^["']|["']$/g, '');
      
      if (text && text.length > 2) {
        if (Math.random() < 0.6) text = text.toLowerCase();
        text = text.replace(/\n+/g, ' ').substring(0, 60);
        return text;
      }
    }
  } catch (error) {
    console.log(chalk.red("[✗] Gemini error"));
  }
  
  const fallbacks = ["ok", "got it", "alright", "cool", "nice", "yeah"];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
};

// Generate starter message
const generateStarterMessage = async () => {
  const prompts = [
    "Write a very short casual message",
    "Create a one-word or two-word message"
  ];
  const prompt = prompts[Math.floor(Math.random() * prompts.length)];
  const message = await generateWithGemini(prompt);
  return message || "hey";
};

// Generate reply
const generateReply = async (messageToReply) => {
  const prompts = [
    `Write a very short reply to: "${messageToReply}"`,
    `Respond briefly to: "${messageToReply}"`
  ];
  const prompt = prompts[Math.floor(Math.random() * prompts.length)];
  const reply = await generateWithGemini(prompt, messageToReply);
  return reply || "ok";
};

// Discord API Functions
const sendDiscordMessage = async (channelId, content, token, botName) => {
  try {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 
        'Authorization': token, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        content: content.substring(0, 100),
        nonce: Date.now().toString(),
        tts: false
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(chalk.green(`[${botName}]: ${content}`));
      return { success: true, id: data.id };
    } else if (response.status === 429) {
      const retryAfter = 5;
      console.log(chalk.yellow(`[!] Rate limit, waiting ${retryAfter}s`));
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return await sendDiscordMessage(channelId, content, token, botName);
    } else {
      console.log(chalk.red(`[✗] ${botName} send failed: ${response.status}`));
      return { success: false };
    }
  } catch (error) {
    console.error(chalk.red(`[✗] ${botName} error:`), error.message);
    return { success: false };
  }
};

// Send REPLY to a specific message
const sendDiscordReply = async (channelId, content, replyToMessageId, token, botName) => {
  try {
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2500));
    
    const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 
        'Authorization': token, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        content: content.substring(0, 100),
        message_reference: {
          message_id: replyToMessageId,
          channel_id: channelId,
          guild_id: null
        },
        nonce: Date.now().toString(),
        tts: false
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(chalk.cyan(`[${botName} REPLY]: ${content}`));
      return { success: true, id: data.id };
    } else if (response.status === 429) {
      const retryAfter = 5;
      console.log(chalk.yellow(`[!] Rate limit, waiting ${retryAfter}s`));
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return await sendDiscordReply(channelId, content, replyToMessageId, token, botName);
    } else {
      console.log(chalk.red(`[✗] ${botName} reply failed: ${response.status}`));
      return { success: false };
    }
  } catch (error) {
    console.error(chalk.red(`[✗] ${botName} reply error:`), error.message);
    return { success: false };
  }
};

// Get random resources
const getRandomBot1Token = () => bot1Tokens[Math.floor(Math.random() * bot1Tokens.length)];
const getRandomBot2Token = () => bot2Tokens[Math.floor(Math.random() * bot2Tokens.length)];
const getRandomChannel = () => channelIds[Math.floor(Math.random() * channelIds.length)];

// Main conversation function
const runConversationWithReply = async (channelId, bot1Token, bot2Token, cycleNum) => {
  console.log(chalk.magenta(`\n💬 Cycle ${cycleNum} in: ${channelId.substring(0, 8)}...`));
  
  // Bot 1 sends message
  const bot1Message = await generateStarterMessage();
  const bot1Result = await sendDiscordMessage(channelId, bot1Message, bot1Token, "BOT-1");
  
  if (!bot1Result.success) return false;
  
  // Send Telegram notification
  if (enableTelegram) {
    await sendTelegramNotification(
      `<b>📤 Bot 1 Sent</b>\n` +
      `Cycle: ${cycleNum}\n` +
      `Message: ${bot1Message}\n` +
      `Time: ${new Date().toLocaleTimeString()}`
    );
  }
  
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  // Bot 2 replies
  const bot2Reply = await generateReply(bot1Message);
  const bot2Result = await sendDiscordReply(channelId, bot2Reply, bot1Result.id, bot2Token, "BOT-2");
  
  if (bot2Result.success && enableTelegram) {
    await sendTelegramNotification(
      `<b>💬 Bot 2 Replied</b>\n` +
      `Cycle: ${cycleNum}\n` +
      `To: ${bot1Message}\n` +
      `Reply: ${bot2Reply}\n` +
      `Time: ${new Date().toLocaleTimeString()}`
    );
  }
  
  return bot2Result.success;
};

// TIMER SETUP
console.log(chalk.cyan("\n⏰ === TIMER SETTINGS ==="));
const runTimeMinutes = parseInt(readline.question("Run time (minutes): ") || "60");
const runTimeMs = runTimeMinutes * 60 * 1000;

// MAIN EXECUTION
(async () => {
  console.log(chalk.cyan("\n" + "=".repeat(50)));
  console.log(chalk.yellow("🚀 STARTING BOT SYSTEM"));
  console.log(chalk.cyan("=".repeat(50)));
  
  console.log(chalk.white(`🤖 Bot 1: ${bot1Tokens.length} accounts`));
  console.log(chalk.white(`🤖 Bot 2: ${bot2Tokens.length} accounts`));
  console.log(chalk.white(`📢 Channels: ${channelIds.length}`));
  console.log(chalk.white(`⏱️  Time: ${runTimeMinutes} minutes`));
  console.log(chalk.white(`🔔 Telegram: ${enableTelegram ? 'Enabled' : 'Disabled'}`));
  
  // Send start notification
  if (enableTelegram) {
    await sendTelegramNotification(
      `<b>🚀 Bot System Started</b>\n` +
      `Time: ${runTimeMinutes} minutes\n` +
      `Bots: ${bot1Tokens.length}+${bot2Tokens.length}\n` +
      `Channels: ${channelIds.length}\n` +
      `Started: ${new Date().toLocaleTimeString()}`
    );
  }
  
  const startTime = Date.now();
  const endTime = startTime + runTimeMs;
  
  let cycles = 0;
  let success = 0;
  
  while (Date.now() < endTime) {
    cycles++;
    
    const result = await runConversationWithReply(
      getRandomChannel(),
      getRandomBot1Token(),
      getRandomBot2Token(),
      cycles
    );
    
    if (result) success++;
    
    // Break between cycles
    const breakTime = 30000 + Math.random() * 30000;
    console.log(chalk.cyan(`⏸️  Break: ${Math.round(breakTime/1000)}s`));
    
    const breakStart = Date.now();
    while (Date.now() < breakStart + breakTime && Date.now() < endTime) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Completion
  const totalMinutes = (Date.now() - startTime) / (1000 * 60);
  
  console.log(chalk.green("\n✅ SYSTEM COMPLETED"));
  console.log(chalk.white(`Cycles: ${cycles}`));
  console.log(chalk.white(`Success: ${success}`));
  console.log(chalk.white(`Rate: ${(success/cycles*100).toFixed(1)}%`));
  
  // Send completion notification
  if (enableTelegram) {
    await sendTelegramNotification(
      `<b>✅ Bot System Completed</b>\n` +
      `Total Time: ${totalMinutes.toFixed(1)} minutes\n` +
      `Cycles: ${cycles}\n` +
      `Successful: ${success}\n` +
      `Success Rate: ${(success/cycles*100).toFixed(1)}%\n` +
      `Completed: ${new Date().toLocaleTimeString()}`
    );
  }
  
  console.log(chalk.yellow("\nPress Ctrl+C to exit"));
  await new Promise(() => {});
  
})();
