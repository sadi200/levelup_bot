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

// TELEGRAM SETUP FUNCTION
const setupTelegram = () => {
  console.log(chalk.cyan("\n🤖 === TELEGRAM SETUP ==="));
  
  let TELEGRAM_BOT_TOKEN = "";
  let TELEGRAM_CHAT_ID = "";
  
  // Check if telegram.config exists
  if (fs.existsSync("telegram.config")) {
    try {
      const configContent = fs.readFileSync("telegram.config", "utf-8");
      const lines = configContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      if (lines.length >= 2) {
        TELEGRAM_BOT_TOKEN = lines[0];
        TELEGRAM_CHAT_ID = lines[1];
        console.log(chalk.green("[✓] Telegram config loaded from file"));
        console.log(chalk.gray(`Bot Token: ${TELEGRAM_BOT_TOKEN.substring(0, 10)}...`));
        console.log(chalk.gray(`Chat ID: ${TELEGRAM_CHAT_ID}`));
      }
    } catch (error) {
      console.log(chalk.yellow("[!] Error reading telegram.config"));
    }
  }
  
  // If not loaded, ask user
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log(chalk.yellow("\n[!] Telegram not configured or config invalid"));
    
    const setupTG = readline.question("Setup Telegram notifications? (yes/no): ").toLowerCase();
    if (setupTG === 'yes') {
      console.log(chalk.cyan("\n📝 Telegram Bot Setup:"));
      console.log("1. Open Telegram");
      console.log("2. Search: @BotFather");
      console.log("3. Send: /newbot");
      console.log("4. Follow instructions and copy bot token");
      console.log(chalk.cyan("=".repeat(50)));
      
      TELEGRAM_BOT_TOKEN = readline.question("Enter Telegram Bot Token: ");
      
      console.log(chalk.cyan("\n📝 Getting Chat ID:"));
      console.log("1. Open Telegram");
      console.log("2. Search: @userinfobot");
      console.log("3. Send: /start");
      console.log("4. Copy your Chat ID");
      console.log(chalk.cyan("=".repeat(50)));
      
      TELEGRAM_CHAT_ID = readline.question("Enter your Telegram Chat ID: ");
      
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        fs.writeFileSync("telegram.config", `${TELEGRAM_BOT_TOKEN}\n${TELEGRAM_CHAT_ID}`);
        console.log(chalk.green("[✓] Telegram config saved to telegram.config"));
      } else {
        console.log(chalk.red("[✗] Telegram setup incomplete"));
      }
    } else {
      console.log(chalk.yellow("[!] Telegram notifications disabled"));
    }
  }
  
  return { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID };
};

// Setup Telegram
const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = setupTelegram();

// Telegram notification function
const sendTelegramNotification = async (message, type = "info") => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log(chalk.yellow("[!] Telegram not configured, skipping notification"));
    return false;
  }
  
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    // Format message based on type
    let formattedMessage = "";
    
    if (type === "start") {
      formattedMessage = `🚀 <b>Bot System Started</b>\n${message}`;
    } else if (type === "reply") {
      formattedMessage = `💬 <b>New Reply Sent</b>\n${message}`;
    } else if (type === "error") {
      formattedMessage = `⚠️ <b>Error Occurred</b>\n${message}`;
    } else if (type === "complete") {
      formattedMessage = `✅ <b>System Completed</b>\n${message}`;
    } else {
      formattedMessage = `📊 ${message}`;
    }
    
    formattedMessage += `\n🕒 ${new Date().toLocaleTimeString()}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: formattedMessage,
        parse_mode: "HTML",
        disable_web_page_preview: true
      })
    });
    
    if (response.ok) {
      console.log(chalk.green("[✓] Telegram notification sent"));
      return true;
    } else {
      const errorText = await response.text();
      console.log(chalk.red(`[✗] Telegram error: ${response.status} - ${errorText.substring(0, 100)}`));
      return false;
    }
  } catch (error) {
    console.error(chalk.red("[✗] Telegram send error:"), error.message);
    return false;
  }
};

// Test Telegram connection
const testTelegramConnection = async () => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return false;
  }
  
  try {
    console.log(chalk.yellow("[!] Testing Telegram connection..."));
    
    const testMessage = `🤖 <b>Connection Test</b>\nBot system is online!\nTime: ${new Date().toLocaleTimeString()}`;
    
    const success = await sendTelegramNotification(testMessage, "info");
    
    if (success) {
      console.log(chalk.green("[✓] Telegram connection successful"));
    } else {
      console.log(chalk.red("[✗] Telegram connection failed"));
    }
    
    return success;
  } catch (error) {
    console.log(chalk.red("[✗] Telegram test error:"), error.message);
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
    await sendTelegramNotification(`Gemini API Error: ${error.message}`, "error");
  }
  
  // Fallback
  const fallbacks = [
    "ok", "got it", "understand", "alright", "cool",
    "nice", "good", "thanks", "appreciate it", "sure",
    "yeah", "yep", "right", "true", "indeed"
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
};

// Generate starter message
const generateStarterMessage = async () => {
  const prompts = [
    "Write a very short casual message",
    "Create a one-word or two-word message",
    "Generate a simple statement",
    "Write something short to say"
  ];
  const prompt = prompts[Math.floor(Math.random() * prompts.length)];
  const message = await generateWithGemini(prompt);
  return message || "hey";
};

// Generate reply to a specific message
const generateReply = async (messageToReply) => {
  const prompts = [
    `Write a very short reply to: "${messageToReply}"`,
    `Respond briefly to: "${messageToReply}"`,
    `Say something short about: "${messageToReply}"`,
    `Give a concise response to: "${messageToReply}"`
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
      
      // Send Telegram notification for message sent
      if (botName === "BOT-1") {
        await sendTelegramNotification(
          `📤 <b>Bot 1 Sent Message</b>\n` +
          `Channel: ${channelId.substring(0, 10)}...\n` +
          `Message: ${content.substring(0, 30)}...`,
          "reply"
        );
      }
      
      return { success: true, id: data.id, content: content };
    } else if (response.status === 429) {
      const retryAfter = 5;
      console.log(chalk.yellow(`[!] Rate limit, waiting ${retryAfter}s`));
      
      await sendTelegramNotification(
        `⚠️ <b>Rate Limit Hit</b>\n` +
        `Bot: ${botName}\n` +
        `Waiting: ${retryAfter} seconds`,
        "error"
      );
      
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return await sendDiscordMessage(channelId, content, token, botName);
    } else {
      console.log(chalk.red(`[✗] ${botName} send failed: ${response.status}`));
      
      await sendTelegramNotification(
        `❌ <b>Send Failed</b>\n` +
        `Bot: ${botName}\n` +
        `Status: ${response.status}\n` +
        `Channel: ${channelId.substring(0, 10)}...`,
        "error"
      );
      
      return { success: false };
    }
  } catch (error) {
    console.error(chalk.red(`[✗] ${botName} error:`), error.message);
    
    await sendTelegramNotification(
      `🔥 <b>Send Error</b>\n` +
      `Bot: ${botName}\n` +
      `Error: ${error.message.substring(0, 50)}`,
      "error"
    );
    
    return { success: false };
  }
};

// Send REPLY to a specific message
const sendDiscordReply = async (channelId, content, replyToMessageId, token, botName, originalMessage = "") => {
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
      console.log(chalk.cyan(`[${botName} REPLY]: ${content} (to message ${replyToMessageId.substring(0, 8)}...)`));
      
      // Send Telegram notification for reply
      await sendTelegramNotification(
        `💬 <b>Bot 2 Replied</b>\n` +
        `Channel: ${channelId.substring(0, 10)}...\n` +
        `To: ${originalMessage.substring(0, 30)}...\n` +
        `Reply: ${content.substring(0, 30)}...`,
        "reply"
      );
      
      return { success: true, id: data.id, content: content };
    } else if (response.status === 429) {
      const retryAfter = 5;
      console.log(chalk.yellow(`[!] Rate limit, waiting ${retryAfter}s`));
      
      await sendTelegramNotification(
        `⚠️ <b>Reply Rate Limit</b>\n` +
        `Bot: ${botName}\n` +
        `Waiting: ${retryAfter} seconds`,
        "error"
      );
      
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return await sendDiscordReply(channelId, content, replyToMessageId, token, botName, originalMessage);
    } else {
      console.log(chalk.red(`[✗] ${botName} reply failed: ${response.status}`));
      
      await sendTelegramNotification(
        `❌ <b>Reply Failed</b>\n` +
        `Bot: ${botName}\n` +
        `Status: ${response.status}`,
        "error"
      );
      
      return { success: false };
    }
  } catch (error) {
    console.error(chalk.red(`[✗] ${botName} reply error:`), error.message);
    
    await sendTelegramNotification(
      `🔥 <b>Reply Error</b>\n` +
      `Bot: ${botName}\n` +
      `Error: ${error.message.substring(0, 50)}`,
      "error"
    );
    
    return { success: false };
  }
};

// Get random resources
const getRandomBot1Token = () => bot1Tokens[Math.floor(Math.random() * bot1Tokens.length)];
const getRandomBot2Token = () => bot2Tokens[Math.floor(Math.random() * bot2Tokens.length)];
const getRandomChannel = () => channelIds[Math.floor(Math.random() * channelIds.length)];

// Main conversation function with REPLY feature
const runConversationWithReply = async (channelId, bot1Token, bot2Token) => {
  console.log(chalk.magenta(`\n💬 Conversation in: ${channelId.substring(0, 8)}...`));
  
  // Step 1: Bot 1 sends a message
  console.log(chalk.yellow("[AI] Bot 1 generating message..."));
  const bot1Message = await generateStarterMessage();
  
  const bot1Result = await sendDiscordMessage(channelId, bot1Message, bot1Token, "BOT-1");
  
  if (!bot1Result.success) {
    console.log(chalk.red("[✗] Bot 1 failed"));
    return false;
  }
  
  const bot1MessageId = bot1Result.id;
  
  console.log(chalk.cyan(`⏳ Waiting 15s for Bot 2 to reply...`));
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  // Step 2: Bot 2 replies DIRECTLY to Bot 1's message
  console.log(chalk.yellow("[AI] Bot 2 generating reply to Bot 1's message..."));
  
  const bot2Reply = await generateReply(bot1Message);
  
  const bot2Result = await sendDiscordReply(
    channelId, 
    bot2Reply, 
    bot1MessageId, 
    bot2Token, 
    "BOT-2",
    bot1Message
  );
  
  if (bot2Result.success) {
    console.log(chalk.green(`✅ Bot 2 replied to Bot 1's message!`));
    console.log(chalk.gray(`💬 Bot 1: "${bot1Message}" → Bot 2: "${bot2Reply}"`));
    return true;
  }
  
  return false;
};

// TIMER SETUP
console.log(chalk.cyan("\n⏰ === TIMER SETTINGS ==="));
const runTimeMinutes = parseInt(readline.question("Run time (minutes, default 60): ") || "60");
const runTimeMs = runTimeMinutes * 60 * 1000;
console.log(chalk.green(`[✓] Will run for: ${runTimeMinutes} minutes`));

// MAIN EXECUTION
(async () => {
  console.log(chalk.cyan("\n" + "=".repeat(60)));
  console.log(chalk.yellow("🔄 DISCORD REPLY BOT SYSTEM"));
  console.log(chalk.cyan("=".repeat(60)));
  
  console.log(chalk.white(`🤖 Bot 1 Accounts: ${bot1Tokens.length}`));
  console.log(chalk.white(`🤖 Bot 2 Accounts: ${bot2Tokens.length}`));
  console.log(chalk.white(`📢 Channels: ${channelIds.length}`));
  console.log(chalk.white(`⏱️  Run Time: ${runTimeMinutes} minutes`));
  console.log(chalk.white(`🤖 Telegram: ${TELEGRAM_BOT_TOKEN ? 'Enabled' : 'Disabled'}`));
  console.log(chalk.cyan("=".repeat(60)));
  
  // Test Telegram connection
  if (TELEGRAM_BOT_TOKEN) {
    await testTelegramConnection();
  }
  
  const start = readline.question("\nPress Enter to START, 'stop' to exit: ");
  if (start.toLowerCase() === 'stop') {
    console.log(chalk.yellow("[!] Exiting..."));
    process.exit(0);
  }
  
  const startTime = Date.now();
  const endTime = startTime + runTimeMs;
  
  // Send start notification to Telegram
  await sendTelegramNotification(
    `🚀 <b>Bot System Started</b>\n` +
    `Duration: ${runTimeMinutes} minutes\n` +
    `Bot 1 Accounts: ${bot1Tokens.length}\n` +
    `Bot 2 Accounts: ${bot2Tokens.length}\n` +
    `Channels: ${channelIds.length}\n` +
    `Started at: ${new Date().toLocaleTimeString()}`,
    "start"
  );
  
  console.log(chalk.green("\n🚀 Starting reply system..."));
  console.log(chalk.yellow(`[!] Will auto-stop in ${runTimeMinutes} minutes`));
  console.log(chalk.yellow("[!] Press Ctrl+C to stop early\n"));
  
  let cycles = 0;
  let successfulReplies = 0;
  
  // Main loop
  while (Date.now() < endTime) {
    cycles++;
    
    console.log(chalk.magenta(`\n🔄 Cycle ${cycles}`));
    console.log(chalk.gray(`Time left: ${Math.round((endTime - Date.now()) / 60000)} minutes`));
    
    const channel = getRandomChannel();
    const bot1Token = getRandomBot1Token();
    const bot2Token = getRandomBot2Token();
    
    try {
      const success = await runConversationWithReply(channel, bot1Token, bot2Token);
      
      if (success) {
        successfulReplies++;
        console.log(chalk.green(`✅ Cycle ${cycles} successful`));
        
        // Periodic update to Telegram every 5 cycles
        if (successfulReplies % 5 === 0) {
          await sendTelegramNotification(
            `📊 <b>Progress Update</b>\n` +
            `Cycles: ${cycles}\n` +
            `Successful: ${successfulReplies}\n` +
            `Success Rate: ${((successfulReplies / cycles) * 100).toFixed(1)}%\n` +
            `Time Left: ${Math.round((endTime - Date.now()) / 60000)} minutes`,
            "info"
          );
        }
      } else {
        console.log(chalk.red(`❌ Cycle ${cycles} failed`));
      }
      
      // Break between cycles
      const breakTime = 30000 + Math.random() * 40000; // 30-70 seconds
      console.log(chalk.cyan(`⏸️  Break for ${Math.round(breakTime/1000)}s...`));
      
      const breakStart = Date.now();
      while (Date.now() < breakStart + breakTime) {
        if (Date.now() >= endTime) break;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error(chalk.red(`[✗] Cycle error:`), error.message);
      
      await sendTelegramNotification(
        `⚠️ <b>Cycle Error</b>\n` +
        `Cycle: ${cycles}\n` +
        `Error: ${error.message.substring(0, 50)}`,
        "error"
      );
      
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
    
    if (Date.now() >= endTime) break;
  }
  
  // SHUTDOWN and send final notification
  console.log(chalk.cyan("\n" + "=".repeat(60)));
  console.log(chalk.green("✅ SYSTEM COMPLETED"));
  console.log(chalk.cyan("=".repeat(60)));
  
  const totalMinutes = (Date.now() - startTime) / (1000 * 60);
  
  // Send completion notification to Telegram
  await sendTelegramNotification(
    `✅ <b>Bot System Completed</b>\n` +
    `Total Time: ${totalMinutes.toFixed(1)} minutes\n` +
    `Total Cycles: ${cycles}\n` +
    `Successful Replies: ${successfulReplies}\n` +
    `Success Rate: ${((successfulReplies / cycles) * 100).toFixed(1)}%\n` +
    `Completed at: ${new Date().toLocaleTimeString()}`,
    "complete"
  );
  
  console.log(chalk.white(`⏱️  Total Time: ${totalMinutes.toFixed(1)} minutes`));
  console.log(chalk.white(`🔄 Total Cycles: ${cycles}`));
  console.log(chalk.white(`✅ Successful Replies: ${successfulReplies}`));
  console.log(chalk.white(`📊 Success Rate: ${((successfulReplies / cycles) * 100).toFixed(1)}%`));
  console.log(chalk.white(`📱 Telegram Notifications: ${TELEGRAM_BOT_TOKEN ? 'Sent' : 'Not configured'}`));
  console.log(chalk.green("\n🎯 Reply system has finished"));
  
  console.log(chalk.yellow("\n[!] Press Ctrl+C to exit"));
  
  // Keep program running
  await new Promise(() => {});
  
})();
