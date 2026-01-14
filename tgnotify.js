import fetch from 'node-fetch';
import readline from 'readline-sync';
import fs from 'fs';
import chalk from 'chalk';
import cfonts from 'cfonts';

// Display banner
cfonts.say('Bot Monitor', {
  font: 'block',
  align: 'center',
  colors: ['cyan', 'magenta'],
  background: 'black',
  letterSpacing: 1,
  lineHeight: 1,
  space: true,
  maxLength: '0',
});
console.log(chalk.green("=== Project Based Telegram Bot Monitor ==="));

// PROJECT CONFIGURATION
console.log(chalk.cyan("\n🎯 === PROJECT SETUP ==="));

let PROJECT_CONFIG = {
  name: "",
  id: Date.now().toString(36).toUpperCase(),
  description: "",
  version: "1.0.0"
};

// Load existing project config
if (fs.existsSync("project.config")) {
  try {
    const configData = fs.readFileSync("project.config", "utf-8");
    const config = JSON.parse(configData);
    PROJECT_CONFIG = { ...PROJECT_CONFIG, ...config };
    console.log(chalk.green(`[✓] Loaded project: ${PROJECT_CONFIG.name || 'Unnamed'}`));
  } catch (error) {
    console.log(chalk.yellow("[!] Error loading project config"));
  }
}

// Ask for project details
const setupNew = readline.question("Setup new project? (yes/no): ").toLowerCase();
if (setupNew === 'yes' || !PROJECT_CONFIG.name) {
  console.log(chalk.cyan("\n📝 Enter Project Details:"));
  PROJECT_CONFIG.name = readline.question("Project Name: ") || "Discord Automation";
  PROJECT_CONFIG.description = readline.question("Description: ") || "Automated messaging system";
  PROJECT_CONFIG.version = readline.question("Version (1.0.0): ") || "1.0.0";
  
  fs.writeFileSync("project.config", JSON.stringify(PROJECT_CONFIG, null, 2));
  console.log(chalk.green(`[✓] Project "${PROJECT_CONFIG.name}" saved`));
} else {
  console.log(chalk.green(`[✓] Using existing project: ${PROJECT_CONFIG.name}`));
  console.log(chalk.gray(`Description: ${PROJECT_CONFIG.description}`));
}

// TELEGRAM BOT SETUP
console.log(chalk.cyan("\n🤖 === TELEGRAM BOT SETUP ==="));
console.log("Create Telegram bot for live notifications:");
console.log("1. Open Telegram");
console.log("2. Search: @BotFather");
console.log("3. Send: /newbot");
console.log("4. Choose bot name");
console.log("5. Copy the bot token");
console.log(chalk.cyan("=".repeat(50)));

let TELEGRAM_BOT_TOKEN = "";
let TELEGRAM_CHAT_ID = "";

try {
  // Load Telegram config
  if (fs.existsSync("telegram.config")) {
    const config = fs.readFileSync("telegram.config", "utf-8").split('\n');
    TELEGRAM_BOT_TOKEN = config[0]?.trim() || "";
    TELEGRAM_CHAT_ID = config[1]?.trim() || "";
    
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      console.log(chalk.green("[✓] Telegram config loaded"));
    }
  }
  
  // If not configured, ask user
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log(chalk.yellow("[!] Telegram not configured"));
    
    const setupTG = readline.question("Setup Telegram notifications? (yes/no): ").toLowerCase();
    if (setupTG === 'yes') {
      TELEGRAM_BOT_TOKEN = readline.question("Enter Telegram Bot Token: ");
      TELEGRAM_CHAT_ID = readline.question("Enter your Telegram Chat ID (send /start to @userinfobot): ");
      
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        fs.writeFileSync("telegram.config", `${TELEGRAM_BOT_TOKEN}\n${TELEGRAM_CHAT_ID}`);
        console.log(chalk.green("[✓] Telegram config saved"));
      }
    } else {
      console.log(chalk.yellow("[!] Skipping Telegram setup"));
    }
  }
} catch (error) {
  console.log(chalk.red("[✗] Telegram config error"));
}

// Notification settings
console.log(chalk.cyan("\n🔔 === NOTIFICATION SETTINGS ==="));
const NOTIFICATION_INTERVAL = parseInt(readline.question("Notification interval (minutes, default 2): ") || "2");
const ENABLE_DETAILED_LOGS = readline.question("Enable detailed message logs? (yes/no): ").toLowerCase() === 'yes';

console.log(chalk.green(`[✓] Notifications every: ${NOTIFICATION_INTERVAL} minutes`));

// Send Telegram message function
const sendTelegramMessage = async (text, parse_mode = "HTML") => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false;
  
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: parse_mode,
        disable_web_page_preview: true
      })
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
};

// PROFESSIONAL TELEGRAM NOTIFICATIONS
const sendStartNotification = async (config) => {
  const details = `
┌─ 🎯 <b>PROJECT INFO</b>
├─ 📛 <b>Name:</b> ${PROJECT_CONFIG.name}
├─ 📋 <b>ID:</b> <code>${PROJECT_CONFIG.id}</code>
├─ 📝 <b>Description:</b> ${PROJECT_CONFIG.description}
├─ 🔢 <b>Version:</b> ${PROJECT_CONFIG.version}
│
├─ ⚙️ <b>SYSTEM CONFIG</b>
├─ ⏰ <b>Duration:</b> ${config.duration} minutes
├─ 📊 <b>Channels:</b> ${config.channels}
├─ 👤 <b>Accounts:</b> ${config.accounts}
├─ ⏳ <b>Message Delay:</b> ${config.delay}s
├─ 🗑️ <b>Auto-Delete:</b> ${config.autoDelete}
├─ 🔔 <b>Notifications:</b> ${NOTIFICATION_INTERVAL} min
│
├─ 🚀 <b>LAUNCH DETAILS</b>
├─ 🆔 <b>Session:</b> ${config.sessionId}
├─ 🕒 <b>Start Time:</b> ${new Date().toLocaleTimeString()}
├─ 📅 <b>Date:</b> ${new Date().toLocaleDateString()}
└─ ⚡ <b>Status:</b> <code>INITIALIZING...</code>
  `.trim();

  const message = `
<b>🚀 PROJECT LAUNCH INITIATED</b>
╔═══════════════════════════════════╗
📛 <b>${PROJECT_CONFIG.name}</b> is now starting...
${details}
╚═══════════════════════════════════╝
  `.trim();

  return await sendTelegramMessage(message);
};

const sendMessageNotification = async (messageNumber, content, channelId, token) => {
  if (!ENABLE_DETAILED_LOGS && messageNumber % 5 !== 0) return true; // Send every 5th message
  
  const truncatedContent = content.length > 40 ? content.substring(0, 40) + '...' : content;
  
  const details = `
├─ 📛 <b>Project:</b> ${PROJECT_CONFIG.name}
├─ 🔢 <b>Message #:</b> ${messageNumber}
├─ 📨 <b>Content:</b> <code>${truncatedContent}</code>
├─ 📊 <b>Channel:</b> <code>${channelId.substring(0, 8)}...</code>
├─ 👤 <b>Account:</b> <code>${token.substring(0, 10)}...</code>
└─ 🕒 <b>Time:</b> ${new Date().toLocaleTimeString('en-US', { hour12: false })}
  `.trim();

  const message = `
<b>📤 MESSAGE DISPATCHED</b>
┌───────────────────────────────────┐
✅ Message successfully sent to Discord
${details}
└───────────────────────────────────┘
  `.trim();

  return await sendTelegramMessage(message);
};

const sendPeriodicUpdate = async (stats) => {
  const progress = ((Date.now() - stats.startTime) / (stats.runTimeMs * 100)) * 100;
  const estimatedEnd = new Date(Date.now() + (stats.runTimeMs - (Date.now() - stats.startTime)));
  
  const details = `
┌─ 📊 <b>PERFORMANCE METRICS</b>
├─ 📛 <b>Project:</b> ${PROJECT_CONFIG.name}
├─ 🆔 <b>ID:</b> <code>${PROJECT_CONFIG.id}</code>
│
├─ 📈 <b>Message Stats</b>
├─ 📨 <b>Total Sent:</b> ${stats.totalMessages}
├─ 🔄 <b>Cycles:</b> ${stats.cycles}
├─ 📊 <b>Rate:</b> ${stats.rate} msg/min
├─ 💯 <b>Success:</b> ${stats.successRate}%
│
├─ ⏰ <b>TIME STATS</b>
├─ 🕒 <b>Running:</b> ${stats.runtime}
├─ ⏳ <b>Remaining:</b> ${stats.timeLeft}
├─ 📈 <b>Progress:</b> ${progress.toFixed(1)}%
├─ 🎯 <b>ETA:</b> ${estimatedEnd.toLocaleTimeString()}
│
├─ ⚡ <b>SYSTEM STATUS</b>
├─ 📊 <b>Channels Active:</b> ${stats.activeChannels}
├─ 👤 <b>Accounts Active:</b> ${stats.activeAccounts}
├─ 🔔 <b>Next Update:</b> ${NOTIFICATION_INTERVAL} min
└─ ✅ <b>Status:</b> <code>OPERATIONAL</code>
  `.trim();

  const message = `
<b>📈 PERIODIC SYSTEM UPDATE</b>
╔═══════════════════════════════════╗
🔄 Automation system running normally
${details}
╚═══════════════════════════════════╝
🕒 ${new Date().toLocaleTimeString()}
  `.trim();

  return await sendTelegramMessage(message);
};

const sendErrorNotification = async (errorType, context, details) => {
  const errorDetails = `
┌─ 🚨 <b>ERROR DETAILS</b>
├─ 📛 <b>Project:</b> ${PROJECT_CONFIG.name}
├─ 🔴 <b>Type:</b> ${errorType}
├─ 📍 <b>Context:</b> ${context}
├─ 🕒 <b>Time:</b> ${new Date().toLocaleTimeString()}
│
├─ 🔧 <b>SYSTEM RESPONSE</b>
├─ ⚡ <b>Action:</b> ${errorType.includes('Rate') ? 'Cooldown activated' : 'Automatic retry'}
├─ ⏳ <b>Delay:</b> ${errorType.includes('Rate') ? '30 seconds' : '10 seconds'}
└─ 📊 <b>Status:</b> <code>RECOVERING</code>
  `.trim();

  const message = `
<b>⚠️ SYSTEM ALERT - ${errorType.toUpperCase()}</b>
╔═══════════════════════════════════╗
🚨 System encountered an issue
${errorDetails}
╚═══════════════════════════════════╝
  `.trim();

  return await sendTelegramMessage(message);
};

const sendShutdownNotification = async (stats) => {
  const durationMinutes = (stats.endTime - stats.startTime) / (1000 * 60);
  const completion = (stats.totalMessages / (stats.estimatedMessages || 1000)) * 100;
  
  const details = `
┌─ 🎯 <b>PROJECT SUMMARY</b>
├─ 📛 <b>Name:</b> ${PROJECT_CONFIG.name}
├─ 📋 <b>ID:</b> <code>${PROJECT_CONFIG.id}</code>
├─ 📝 <b>Description:</b> ${PROJECT_CONFIG.description}
│
├─ 📊 <b>PERFORMANCE REPORT</b>
├─ ⏱️ <b>Total Runtime:</b> ${durationMinutes.toFixed(1)} min
├─ 📨 <b>Messages Sent:</b> ${stats.totalMessages}
├─ 🔄 <b>Total Cycles:</b> ${stats.cycles}
├─ 📈 <b>Avg Rate:</b> ${stats.avgRate} msg/min
├─ ⚡ <b>Peak Rate:</b> ${stats.peakRate} msg/min
├─ 💯 <b>Success Rate:</b> ${stats.successRate}%
├─ 🎯 <b>Completion:</b> ${completion.toFixed(1)}%
│
├─ 📅 <b>SESSION DETAILS</b>
├─ 🕒 <b>Start:</b> ${new Date(stats.startTime).toLocaleTimeString()}
├─ 🕒 <b>End:</b> ${new Date(stats.endTime).toLocaleTimeString()}
└─ ✅ <b>Status:</b> <code>COMPLETED SUCCESSFULLY</code>
  `.trim();

  const message = `
<b>🛑 PROJECT SESSION COMPLETED</b>
╔═══════════════════════════════════╗
✅ Automation session finished
${details}
╚═══════════════════════════════════╝
📊 Report generated at ${new Date().toLocaleTimeString()}
  `.trim();

  return await sendTelegramMessage(message);
};

// Load Gemini API key
let GEMINI_API_KEY = "";

try {
  if (fs.existsSync("gemini.key")) {
    GEMINI_API_KEY = fs.readFileSync("gemini.key", "utf-8").trim();
    console.log(chalk.green("[✓] Gemini API key loaded"));
  } else if (fs.existsSync("api.key")) {
    GEMINI_API_KEY = fs.readFileSync("api.key", "utf-8").trim();
    console.log(chalk.green("[✓] API key loaded"));
  } else {
    console.log(chalk.yellow("[!] No API key file found"));
    GEMINI_API_KEY = readline.question("Enter Gemini API key: ");
    
    if (GEMINI_API_KEY.trim()) {
      fs.writeFileSync("gemini.key", GEMINI_API_KEY.trim());
      console.log(chalk.green("[✓] API key saved"));
    }
  }
  
  if (!GEMINI_API_KEY.trim()) {
    console.log(chalk.red("[✗] No API key"));
    process.exit(1);
  }
} catch (error) {
  console.log(chalk.red("[✗] Error loading API key"));
  process.exit(1);
}

// TIMER SETUP
console.log(chalk.cyan("\n⏰ === TIMER SETTINGS ==="));

const timerOptions = [
  { name: "30 minutes", value: 30 },
  { name: "1 hour", value: 60 },
  { name: "2 hours", value: 120 },
  { name: "4 hours", value: 240 },
  { name: "8 hours", value: 480 },
  { name: "12 hours", value: 720 },
  { name: "24 hours", value: 1440 },
  { name: "Custom time", value: 0 }
];

timerOptions.forEach((opt, idx) => {
  console.log(`${idx + 1}. ${opt.name}`);
});

const timerChoice = parseInt(readline.question("\nSelect option (1-8): ")) || 3;
let runTimeMinutes = 120; // Default 2 hours

if (timerChoice === 8) {
  const hours = parseInt(readline.question("Enter hours: ") || "0");
  const minutes = parseInt(readline.question("Enter minutes: ") || "0");
  runTimeMinutes = (hours * 60) + minutes;
  
  if (runTimeMinutes <= 0) {
    console.log(chalk.red("[✗] Invalid time. Using 2 hours default."));
    runTimeMinutes = 120;
  }
} else if (timerChoice >= 1 && timerChoice <= 7) {
  runTimeMinutes = timerOptions[timerChoice - 1].value;
}

const runTimeMs = runTimeMinutes * 60 * 1000;
console.log(chalk.green(`[✓] Bot will run for: ${runTimeMinutes} minutes (${(runTimeMinutes/60).toFixed(1)} hours)`));

// Discord Configuration
console.log(chalk.cyan("\n=== Discord Setup ==="));

let channelIds = [];
if (fs.existsSync("channels.txt")) {
  try {
    const channelData = fs.readFileSync("channels.txt", "utf-8");
    channelIds = channelData.split('\n')
      .map(id => id.trim())
      .filter(id => id.length > 0);
    
    if (channelIds.length > 0) {
      console.log(chalk.green(`[✓] Loaded ${channelIds.length} channels`));
      console.log(chalk.gray("Channels: " + channelIds.join(', ')));
      
      const useThese = readline.question("Use these channels? (yes/no): ").toLowerCase();
      if (useThese !== 'yes') {
        channelIds = [];
      }
    }
  } catch (error) {
    console.log(chalk.yellow("[!] Error reading channels"));
  }
}

if (channelIds.length === 0) {
  const channelInput = readline.question("Enter Discord Channel IDs (comma separated): ");
  channelIds = channelInput.split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);
  
  if (channelIds.length === 0) {
    console.log(chalk.red("[✗] No channels"));
    process.exit(1);
  }
  
  const saveChannels = readline.question("Save channels to file? (yes/no): ").toLowerCase();
  if (saveChannels === 'yes') {
    fs.writeFileSync("channels.txt", channelIds.join('\n'));
    console.log(chalk.green("[✓] Channels saved"));
  }
}

// Settings
console.log(chalk.cyan("\n=== Message Settings ==="));
const deleteOption = readline.question("Delete messages after sending? (yes/no): ").toLowerCase() === 'yes';

let sendDelay = parseInt(readline.question("Delay between messages (seconds, min 15): ") || "25");
sendDelay = Math.max(sendDelay, 15) * 1000;

let deleteDelay = 0;
let afterDeleteDelay = 0;

if (deleteOption) {
  deleteDelay = parseInt(readline.question("Delete after (seconds): ") || "30") * 1000;
  afterDeleteDelay = parseInt(readline.question("Wait after delete (seconds): ") || "5") * 1000;
}

// Load Discord tokens
let tokens = [];
try {
  if (fs.existsSync("tokens.txt")) {
    tokens = fs.readFileSync("tokens.txt", "utf-8")
      .split('\n')
      .map(token => token.trim())
      .filter(token => token.length > 0);
    console.log(chalk.green(`[✓] Loaded ${tokens.length} Discord tokens`));
  } else if (fs.existsSync("token.txt")) {
    tokens = fs.readFileSync("token.txt", "utf-8")
      .split('\n')
      .map(token => token.trim())
      .filter(token => token.length > 0);
    console.log(chalk.green(`[✓] Loaded ${tokens.length} Discord tokens`));
  } else {
    console.log(chalk.red("[✗] No token file found"));
    console.log(chalk.yellow("[!] Create tokens.txt with Discord tokens"));
    process.exit(1);
  }
  
  if (tokens.length === 0) {
    console.log(chalk.red("[✗] Token file empty"));
    process.exit(1);
  }
} catch (error) {
  console.log(chalk.red("[✗] Error loading tokens"));
  process.exit(1);
}

// HUMAN TEXT GENERATOR
const generateHumanText = () => {
  const phrases = [
    "yo wsp", "wyd rn", "fr no cap", "deadass bro", "sheesh",
    "lowkey facts", "ong tho", "ngl i was thinking", "same tbh",
    "idk man", "wait actually", "lmao facts", "thats wild",
    "not gonna lie", "thats valid", "i feel that", "mood",
    "big if true", "crying rn", "im weak", "bruh moment",
    "say less", "bet", "aight cool", "ight bet", "preciate it",
    "you good", "im chillin", "no worries", "all good"
  ];
  
  let text = phrases[Math.floor(Math.random() * phrases.length)];
  
  // Random modifications
  if (Math.random() < 0.4) text = text.toLowerCase();
  if (Math.random() < 0.2) text = text.replace('you', 'u').replace('your', 'ur');
  if (Math.random() < 0.15) text = text + "...";
  if (Math.random() < 0.1) text = "like " + text;
  
  return text.substring(0, 80);
};

// Generate with Gemini
const generateWithGemini = async () => {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const prompt = "Write a casual 1-sentence Discord message with texting slang, no emojis, like a bored person typing on phone";
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 35 }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      text = text.trim().replace(/^["']|["']$/g, '');
      
      if (text && text.length > 3) {
        if (Math.random() < 0.5) text = text.toLowerCase();
        if (text.length > 70) text = text.substring(0, 70);
        return text;
      }
    }
  } catch (error) {
    // Silent fallback
  }
  
  return generateHumanText();
};

// Get channel context
const getChannelContext = async (channelId, token) => {
  try {
    const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages?limit=2`, {
      headers: { 'Authorization': token }
    });
    if (response.ok) return await response.json();
  } catch (error) {}
  return [];
};

// Send Discord message
const sendDiscordMessage = async (channelId, content, token, messageNum) => {
  try {
    const typingDelay = Math.random() * 2000 + 1000;
    await new Promise(resolve => setTimeout(resolve, typingDelay));
    
    const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 
        'Authorization': token, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        content: content.substring(0, 150),
        nonce: Date.now().toString()
      })
    });
    
    if (response.ok) {
      const messageData = await response.json();
      
      // Send Telegram notification for message sent
      await sendMessageNotification(messageNum, content, channelId, token);
      
      console.log(chalk.green(`[✓] Sent #${messageNum}: "${content}"`));
      
      if (deleteOption) {
        await new Promise(resolve => setTimeout(resolve, deleteDelay));
        await deleteDiscordMessage(channelId, messageData.id, token, messageNum);
      }
      return messageData.id;
    } else if (response.status === 429) {
      const retryAfter = (await response.json()).retry_after || 5;
      
      await sendErrorNotification(
        "API Rate Limit", 
        `Message #${messageNum}, Channel: ${channelId}`,
        `Retry after: ${retryAfter} seconds`
      );
      
      console.log(chalk.yellow(`[!] Rate limit, waiting ${retryAfter}s`));
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return sendDiscordMessage(channelId, content, token, messageNum);
    } else {
      await sendErrorNotification(
        "Send Failed", 
        `Message #${messageNum}, Channel: ${channelId}`,
        `Status code: ${response.status}`
      );
      
      console.log(chalk.red(`[✗] Send failed: ${response.status}`));
    }
  } catch (error) {
    await sendErrorNotification("Send Error", `Message #${messageNum}`, error.message);
    console.error(chalk.red("[✗] Send error"));
  }
  return null;
};

// Delete Discord message
const deleteDiscordMessage = async (channelId, messageId, token, messageNum) => {
  try {
    const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages/${messageId}`, {
      method: 'DELETE',
      headers: { 'Authorization': token }
    });
    
    if (response.ok) {
      console.log(chalk.blue(`[✓] Deleted #${messageNum}`));
    }
    
    await new Promise(resolve => setTimeout(resolve, afterDeleteDelay));
  } catch (error) {
    // Silent error
  }
};

// Show time remaining
const showTimeRemaining = (startTime, totalTime) => {
  const elapsed = Date.now() - startTime;
  const remaining = totalTime - elapsed;
  
  if (remaining <= 0) return "00:00:00";
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Calculate message rate
const calculateMessageRate = (messageCount, startTime) => {
  const elapsedMinutes = (Date.now() - startTime) / (1000 * 60);
  return elapsedMinutes > 0 ? (messageCount / elapsedMinutes).toFixed(2) : "0.00";
};

// Main execution with Telegram notifications
(async () => {
  console.log(chalk.cyan("\n" + "=".repeat(60)));
  console.log(chalk.yellow("🎯 PROJECT-BASED DISCORD AUTOMATION"));
  console.log(chalk.cyan("=".repeat(60)));
  
  console.log(chalk.white(`📛 Project: ${PROJECT_CONFIG.name}`));
  console.log(chalk.white(`📋 ID: ${PROJECT_CONFIG.id}`));
  console.log(chalk.white(`⏱️  Running time: ${runTimeMinutes} minutes`));
  console.log(chalk.white(`📊 Discord channels: ${channelIds.length}`));
  console.log(chalk.white(`🔑 Discord accounts: ${tokens.length}`));
  console.log(chalk.white(`🤖 Telegram notifications: ${TELEGRAM_BOT_TOKEN ? 'Enabled' : 'Disabled'}`));
  console.log(chalk.white(`🔔 Notification interval: ${NOTIFICATION_INTERVAL} minutes`));
  console.log(chalk.white(`🗑️  Auto-delete: ${deleteOption ? 'Yes' : 'No'}`));
  console.log(chalk.cyan("=".repeat(60)));
  
  const start = readline.question("\nPress Enter to START bot, 'stop' to exit: ");
  if (start.toLowerCase() === 'stop') {
    console.log(chalk.yellow("[!] Exiting..."));
    process.exit(0);
  }
  
  // Send startup notification to Telegram
  const startTime = Date.now();
  const endTime = startTime + runTimeMs;
  let lastNotificationTime = startTime;
  
  // Performance tracking
  const performanceStats = {
    startTime: startTime,
    totalMessages: 0,
    cycles: 0,
    peakRate: 0,
    errors: 0,
    successMessages: 0
  };
  
  await sendStartNotification({
    duration: runTimeMinutes,
    channels: channelIds.length,
    accounts: tokens.length,
    delay: sendDelay / 1000,
    autoDelete: deleteOption ? "Enabled" : "Disabled",
    sessionId: Date.now().toString(36).toUpperCase()
  });
  
  console.log(chalk.green("\n🚀 Project started! Telegram notifications enabled"));
  console.log(chalk.green(`📛 Project: ${PROJECT_CONFIG.name}`));
  console.log(chalk.green(`📋 Project ID: ${PROJECT_CONFIG.id}`));
  console.log(chalk.yellow(`[!] Bot will auto-stop in ${runTimeMinutes} minutes`));
  console.log(chalk.yellow(`[!] Notifications every ${NOTIFICATION_INTERVAL} minutes`));
  console.log(chalk.yellow("[!] Press Ctrl+C to stop early\n"));
  
  let messageCount = 0;
  let cycleCount = 0;
  
  // Main loop with timer
  while (Date.now() < endTime) {
    cycleCount++;
    const timeLeft = endTime - Date.now();
    
    // Check if it's time for periodic notification (every NOTIFICATION_INTERVAL minutes)
    const currentTime = Date.now();
    if (currentTime - lastNotificationTime >= NOTIFICATION_INTERVAL * 60 * 1000) {
      await sendPeriodicUpdate({
        startTime: startTime,
        runTimeMs: runTimeMs,
        totalMessages: messageCount,
        cycles: cycleCount,
        runtime: showTimeRemaining(startTime, currentTime - startTime),
        timeLeft: showTimeRemaining(currentTime, endTime),
        rate: calculateMessageRate(messageCount, startTime),
        successRate: performanceStats.successMessages > 0 ? 
          ((performanceStats.successMessages / messageCount) * 100).toFixed(1) : "100.0",
        activeChannels: channelIds.length,
        activeAccounts: tokens.length
      });
      lastNotificationTime = currentTime;
    }
    
    // Show console status with project info
    console.log(chalk.magenta(`\n🔄 Cycle ${cycleCount} | Project: ${PROJECT_CONFIG.name}`));
    console.log(chalk.cyan(`⏰ Time left: ${showTimeRemaining(startTime, runTimeMs)} | 📨 Messages: ${messageCount}`));
    
    for (const token of tokens) {
      for (const channelId of channelIds) {
        // Time check
        if (Date.now() >= endTime) {
          console.log(chalk.yellow("\n⏰ Time's up!"));
          break;
        }
        
        try {
          messageCount++;
          
          // Console log with project info
          console.log(chalk.cyan(`\n[#${messageCount}] Project: ${PROJECT_CONFIG.name} | Channel: ${channelId.substring(0, 8)}...`));
          
          // Generate message
          console.log(chalk.yellow("[AI] Generating..."));
          let message;
          
          if (Math.random() < 0.7) {
            message = await generateWithGemini();
          } else {
            message = generateHumanText();
          }
          
          console.log(chalk.green("[Text]:") + chalk.white(` ${message}`));
          
          // Send to Discord
          const messageId = await sendDiscordMessage(channelId, message, token, messageCount);
          if (messageId) {
            performanceStats.successMessages++;
          }
          
          // Update peak rate
          const currentRate = parseFloat(calculateMessageRate(messageCount, startTime));
          if (currentRate > performanceStats.peakRate) {
            performanceStats.peakRate = currentRate;
          }
          
          // Random delay with time checks
          const randomDelay = sendDelay * (0.8 + Math.random() * 0.4);
          const checkInterval = 1000;
          
          let delayRemaining = randomDelay;
          while (delayRemaining > 0) {
            if (Date.now() >= endTime) {
              console.log(chalk.yellow("\n⏰ Time's up during delay"));
              break;
            }
            
            const waitTime = Math.min(checkInterval, delayRemaining);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            delayRemaining -= waitTime;
          }
          
          // Show progress every 10 messages
          if (messageCount % 10 === 0) {
            console.log(chalk.gray(`📊 Progress: ${messageCount} messages | Rate: ${calculateMessageRate(messageCount, startTime)} msg/min | Project: ${PROJECT_CONFIG.name}`));
          }
          
        } catch (error) {
          console.error(chalk.red("[✗] Error:", error.message));
          performanceStats.errors++;
          
          // Error wait
          const errorWait = 10000;
          const errorStart = Date.now();
          while (Date.now() < errorStart + errorWait) {
            if (Date.now() >= endTime) break;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        if (Date.now() >= endTime) break;
      }
      
      if (Date.now() >= endTime) break;
    }
    
    // Cycle complete
    console.log(chalk.magenta(`\n✅ Cycle ${cycleCount} complete | Project: ${PROJECT_CONFIG.name} | Total messages: ${messageCount}`));
    
    // Break between cycles
    const breakTime = 8000;
    const breakStart = Date.now();
    while (Date.now() < breakStart + breakTime) {
      if (Date.now() >= endTime) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (Date.now() >= endTime) break;
  }
  
  // SHUTDOWN SEQUENCE
  console.log(chalk.cyan("\n" + "=".repeat(60)));
  console.log(chalk.green("✅ PROJECT SESSION COMPLETED"));
  console.log(chalk.cyan("=".repeat(60)));
  
  const totalMinutes = (Date.now() - startTime) / (1000 * 60);
  const successRate = performanceStats.successMessages > 0 ? 
    ((performanceStats.successMessages / messageCount) * 100).toFixed(1) : "100.0";
  
  // Send final Telegram notification
  await sendShutdownNotification({
    startTime: startTime,
    endTime: Date.now(),
    totalMessages: messageCount,
    cycles: cycleCount,
    avgRate: (messageCount / totalMinutes).toFixed(2),
    peakRate: performanceStats.peakRate.toFixed(2),
    successRate: successRate,
    estimatedMessages: Math.round(runTimeMinutes * 2) // Estimate 2 messages per minute
  });
  
  // Console stats
  console.log(chalk.white(`📛 Project: ${PROJECT_CONFIG.name}`));
  console.log(chalk.white(`📋 Project ID: ${PROJECT_CONFIG.id}`));
  console.log(chalk.white(`⏱️  Total run time: ${totalMinutes.toFixed(1)} minutes`));
  console.log(chalk.white(`📨 Total messages sent: ${messageCount}`));
  console.log(chalk.white(`🔄 Total cycles: ${cycleCount}`));
  console.log(chalk.white(`📊 Messages per minute: ${(messageCount / totalMinutes).toFixed(2)}`));
  console.log(chalk.white(`⚡ Peak rate: ${performanceStats.peakRate.toFixed(2)} msg/min`));
  console.log(chalk.white(`✅ Success rate: ${successRate}%`));
  console.log(chalk.white(`🤖 Telegram notifications: ${messageCount > 0 ? 'Sent' : 'None'}`));
  console.log(chalk.green("\n🎯 Project session has been completed"));
  console.log(chalk.cyan("📱 Check Telegram for detailed project report"));
  console.log(chalk.yellow("\n[!] Press Ctrl+C to close the program"));
  
  // Save session stats
  const sessionData = {
    project: PROJECT_CONFIG.name,
    projectId: PROJECT_CONFIG.id,
    timestamp: new Date().toISOString(),
    duration: totalMinutes,
    messages: messageCount,
    cycles: cycleCount,
    avgRate: (messageCount / totalMinutes).toFixed(2),
    successRate: successRate
  };
  
  // Append to sessions log
  if (fs.existsSync("sessions.log")) {
    const existing = JSON.parse(fs.readFileSync("sessions.log", "utf-8"));
    existing.push(sessionData);
    fs.writeFileSync("sessions.log", JSON.stringify(existing, null, 2));
  } else {
    fs.writeFileSync("sessions.log", JSON.stringify([sessionData], null, 2));
  }
  
  // Keep alive for user to see
  await new Promise(() => {
    // Infinite wait until Ctrl+C
  });
  
})();
