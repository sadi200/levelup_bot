import fetch from 'node-fetch';
import readline from 'readline-sync';
import fs from 'fs';
import chalk from 'chalk';
import cfonts from 'cfonts';

// Display banner
cfonts.say('Timer Bot', {
  font: 'block',
  align: 'center',
  colors: ['cyan', 'yellow'],
  background: 'black',
  letterSpacing: 1,
  lineHeight: 1,
  space: true,
  maxLength: '0',
});
console.log(chalk.green("=== Auto-Timer Discord Bot ==="));

// Load Gemini API key
let GEMINI_API_KEY = "";

try {
  // Check for API key file
  if (fs.existsSync("gemini.key")) {
    GEMINI_API_KEY = fs.readFileSync("gemini.key", "utf-8").trim();
    console.log(chalk.green("[✓] API key loaded from gemini.key"));
  } else if (fs.existsSync("api.key")) {
    GEMINI_API_KEY = fs.readFileSync("api.key", "utf-8").trim();
    console.log(chalk.green("[✓] API key loaded from api.key"));
  } else {
    console.log(chalk.yellow("[!] No API key file found"));
    console.log(chalk.cyan("\n=== Get FREE Gemini API Key ==="));
    console.log("1. Go to: https://aistudio.google.com/app/apikey");
    console.log("2. Create API key");
    console.log("3. Copy and save");
    console.log(chalk.cyan("=".repeat(50)));
    
    GEMINI_API_KEY = readline.question("Enter Gemini API key: ");
    
    if (GEMINI_API_KEY.trim()) {
      fs.writeFileSync("gemini.key", GEMINI_API_KEY.trim());
      console.log(chalk.green("[✓] Saved to gemini.key"));
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
console.log("Set how long the bot should run:");

const timerOptions = [
  { name: "30 minutes", value: 30 },
  { name: "1 hour", value: 60 },
  { name: "2 hours", value: 120 },
  { name: "4 hours", value: 240 },
  { name: "8 hours", value: 480 },
  { name: "Custom time", value: 0 }
];

timerOptions.forEach((opt, idx) => {
  console.log(`${idx + 1}. ${opt.name}`);
});

const timerChoice = parseInt(readline.question("\nSelect option (1-6): ")) || 1;
let runTimeMinutes = 0;

if (timerChoice === 6) {
  // Custom time
  const hours = parseInt(readline.question("Enter hours: ") || "0");
  const minutes = parseInt(readline.question("Enter minutes: ") || "0");
  runTimeMinutes = (hours * 60) + minutes;
  
  if (runTimeMinutes <= 0) {
    console.log(chalk.red("[✗] Invalid time. Using 1 hour default."));
    runTimeMinutes = 60;
  }
} else if (timerChoice >= 1 && timerChoice <= 5) {
  runTimeMinutes = timerOptions[timerChoice - 1].value;
}

const runTimeMs = runTimeMinutes * 60 * 1000;
console.log(chalk.green(`[✓] Bot will run for: ${runTimeMinutes} minutes (${runTimeMinutes/60} hours)`));

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
      const useThese = readline.question("Use these channels? (yes/no): ").toLowerCase();
      if (useThese !== 'yes') {
        channelIds = [];
      }
    }
  } catch (error) {
    console.log(chalk.yellow("[!] Error reading channels file"));
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

let sendDelay = parseInt(readline.question("Delay between messages (seconds, min 15): ") || "20");
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
    console.log(chalk.green(`[✓] Loaded ${tokens.length} tokens`));
  } else if (fs.existsSync("token.txt")) {
    tokens = fs.readFileSync("token.txt", "utf-8")
      .split('\n')
      .map(token => token.trim())
      .filter(token => token.length > 0);
    console.log(chalk.green(`[✓] Loaded ${tokens.length} tokens`));
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

// HUMAN TEXT DATABASE
const HUMAN_TEXTS = {
  casual: [
    "yo wsp", "wyd rn", "fr no cap", "deadass bro", "sheesh",
    "lowkey facts", "ong tho", "ngl i was thinking", "same tbh",
    "idk man", "wait actually", "lmao facts", "thats wild",
    "not gonna lie", "thats valid", "i feel that", "mood",
    "big if true", "crying rn", "im weak", "bruh moment"
  ],
  
  questions: [
    "wym", "you sure", "for real", "you think", "how come",
    "why though", "since when", "since when tho", "you good"
  ],
  
  reactions: [
    "facts", "true", "same", "fr", "ong", "deadass",
    "sheesh", "wild", "crazy", "insane", "unreal"
  ],
  
  starters: [
    "yo", "hey", "sup", "lol", "wait", "damn", "okay",
    "aight", "bet", "ight", "bruh", "ngl", "tbh", "fr"
  ]
};

// Generate human text
const generateHumanText = () => {
  const types = Object.keys(HUMAN_TEXTS);
  const type = types[Math.floor(Math.random() * types.length)];
  const words = HUMAN_TEXTS[type];
  let text = words[Math.floor(Math.random() * words.length)];
  
  // Combine sometimes
  if (Math.random() < 0.3 && type !== 'starters') {
    const secondType = types[Math.floor(Math.random() * types.length)];
    const secondWords = HUMAN_TEXTS[secondType];
    const secondText = secondWords[Math.floor(Math.random() * secondWords.length)];
    
    if (Math.random() > 0.5) {
      text = text + " " + secondText;
    } else {
      text = secondText + " " + text;
    }
  }
  
  // Apply human-like modifications
  if (Math.random() < 0.4) {
    text = text.toLowerCase();
  }
  if (Math.random() < 0.2) {
    text = text.replace('you', 'u').replace('your', 'ur').replace('are', 'r');
  }
  if (Math.random() < 0.15) {
    text = text + "...";
  }
  if (Math.random() < 0.1) {
    text = "like " + text;
  }
  
  return text.substring(0, 100);
};

// Generate with Gemini (optional)
const generateWithGemini = async () => {
  try {
    const model = "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    
    const prompts = [
      "Write a casual 1-sentence Discord message like a bored person texting",
      "Write a short Discord message with texting slang, no emojis",
      "Write a 1-line casual chat message like real people type"
    ];
    
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 30 }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      text = text.trim().replace(/^["']|["']$/g, '');
      
      if (text && text.length > 3) {
        // Make it more casual
        if (Math.random() < 0.5) text = text.toLowerCase();
        if (text.length > 60) text = text.substring(0, 60);
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

// Send message
const sendMessage = async (channelId, content, token) => {
  try {
    // Human-like typing delay
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
      console.log(chalk.green(`[✓] Sent: "${content}"`));
      
      if (deleteOption) {
        await new Promise(resolve => setTimeout(resolve, deleteDelay));
        await deleteMessage(channelId, messageData.id, token);
      }
      return messageData.id;
    } else if (response.status === 429) {
      const retryAfter = (await response.json()).retry_after || 5;
      console.log(chalk.yellow(`[!] Rate limit, waiting ${retryAfter}s`));
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return sendMessage(channelId, content, token);
    }
  } catch (error) {
    console.error(chalk.red("[✗] Send error"));
  }
  return null;
};

// Delete message
const deleteMessage = async (channelId, messageId, token) => {
  try {
    const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages/${messageId}`, {
      method: 'DELETE',
      headers: { 'Authorization': token }
    });
    if (response.ok) {
      console.log(chalk.blue(`[✓] Deleted`));
    }
    await new Promise(resolve => setTimeout(resolve, afterDeleteDelay));
  } catch (error) {}
};

// Timer display function
const showTimeRemaining = (startTime, totalTime) => {
  const elapsed = Date.now() - startTime;
  const remaining = totalTime - elapsed;
  
  if (remaining <= 0) return "00:00:00";
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Main execution with TIMER
(async () => {
  console.log(chalk.cyan("\n" + "=".repeat(50)));
  console.log(chalk.yellow("⏰ TIMER BOT - AUTO SHUTDOWN"));
  console.log(chalk.cyan("=".repeat(50)));
  
  console.log(chalk.white(`⏱️  Running time: ${runTimeMinutes} minutes`));
  console.log(chalk.white(`📊 Channels: ${channelIds.length}`));
  console.log(chalk.white(`🔑 Accounts: ${tokens.length}`));
  console.log(chalk.white(`🗑️  Auto-delete: ${deleteOption ? 'Yes' : 'No'}`));
  console.log(chalk.white(`⏳ Message delay: ${sendDelay / 1000}s`));
  console.log(chalk.cyan("=".repeat(50)));
  
  const start = readline.question("\nPress Enter to start, 'stop' to exit: ");
  if (start.toLowerCase() === 'stop') {
    console.log(chalk.yellow("[!] Exiting..."));
    process.exit(0);
  }
  
  console.log(chalk.green("\n🚀 Starting bot with timer..."));
  console.log(chalk.yellow(`[!] Bot will auto-stop in ${runTimeMinutes} minutes`));
  console.log(chalk.yellow("[!] Press Ctrl+C to stop early\n"));
  
  const startTime = Date.now();
  const endTime = startTime + runTimeMs;
  let messageCount = 0;
  let cycleCount = 0;
  
  // Display initial timer
  console.log(chalk.cyan(`⏰ Time remaining: ${showTimeRemaining(startTime, runTimeMs)}`));
  
  // Main loop with timer check
  while (Date.now() < endTime) {
    cycleCount++;
    const timeLeft = endTime - Date.now();
    
    // Show time remaining every cycle
    console.log(chalk.magenta(`\n🔄 Cycle ${cycleCount} | Time left: ${showTimeRemaining(startTime, runTimeMs)}`));
    
    for (const token of tokens) {
      for (const channelId of channelIds) {
        // Check if time's up
        if (Date.now() >= endTime) {
          console.log(chalk.yellow("\n⏰ Time's up! Stopping bot..."));
          break;
        }
        
        try {
          messageCount++;
          console.log(chalk.cyan(`\n[${messageCount}] Channel: ${channelId}`));
          
          // Get context (optional)
          const context = await getChannelContext(channelId, token);
          
          // Generate message (mix of Gemini and fallback)
          console.log(chalk.yellow("[Generating...]"));
          let message;
          
          // Use Gemini sometimes, fallback sometimes
          if (Math.random() < 0.6) {
            message = await generateWithGemini();
          } else {
            message = generateHumanText();
          }
          
          console.log(chalk.green("[Message]:") + chalk.white(` ${message}`));
          
          // Send message
          await sendMessage(channelId, message, token);
          
          // Random delay with time check
          const randomDelay = sendDelay * (0.7 + Math.random() * 0.6);
          const checkInterval = 1000; // Check every second if time's up
          
          let delayRemaining = randomDelay;
          while (delayRemaining > 0) {
            // Check if time's up
            if (Date.now() >= endTime) {
              console.log(chalk.yellow("\n⏰ Time's up during delay!"));
              break;
            }
            
            const waitTime = Math.min(checkInterval, delayRemaining);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            delayRemaining -= waitTime;
          }
          
          // Show remaining time occasionally
          if (messageCount % 5 === 0) {
            console.log(chalk.gray(`⏰ Remaining: ${showTimeRemaining(startTime, runTimeMs)}`));
          }
          
        } catch (error) {
          console.error(chalk.red("[✗] Error:", error.message));
          
          // Wait on error, but check timer
          const errorWait = 10000;
          const errorStart = Date.now();
          while (Date.now() < errorStart + errorWait) {
            if (Date.now() >= endTime) break;
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // Break inner loop if time's up
        if (Date.now() >= endTime) break;
      }
      
      // Break token loop if time's up
      if (Date.now() >= endTime) break;
    }
    
    // Break main loop if time's up
    if (Date.now() >= endTime) break;
    
    // Cycle complete, show status
    console.log(chalk.magenta(`\n✅ Cycle ${cycleCount} complete | Messages: ${messageCount}`));
    console.log(chalk.cyan(`⏰ Time remaining: ${showTimeRemaining(startTime, runTimeMs)}`));
    
    // Short break between cycles
    const breakTime = 5000;
    const breakStart = Date.now();
    while (Date.now() < breakStart + breakTime) {
      if (Date.now() >= endTime) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (Date.now() >= endTime) break;
  }
  
  // SHUTDOWN SEQUENCE
  console.log(chalk.cyan("\n" + "=".repeat(50)));
  console.log(chalk.green("✅ BOT SHUTDOWN COMPLETE"));
  console.log(chalk.cyan("=".repeat(50)));
  console.log(chalk.white(`⏰ Total run time: ${runTimeMinutes} minutes`));
  console.log(chalk.white(`📨 Total messages sent: ${messageCount}`));
  console.log(chalk.white(`🔄 Total cycles: ${cycleCount}`));
  console.log(chalk.green("\n🎯 Bot has been automatically stopped"));
  console.log(chalk.yellow("[!] Press Ctrl+C to close the program"));
  
  // Keep process alive for user to see stats
  await new Promise(resolve => {
    console.log(chalk.gray("\nPress Ctrl+C to exit..."));
    // Process will stay until manually closed
  });
  
})();
