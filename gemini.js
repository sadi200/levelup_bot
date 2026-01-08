import fetch from 'node-fetch';
import readline from 'readline-sync';
import fs from 'fs';
import chalk from 'chalk';
import cfonts from 'cfonts';

// Display banner
cfonts.say('Gemini Chat Bot', {
  font: 'block',
  align: 'center',
  colors: ['green', 'blue'],
  background: 'black',
  letterSpacing: 1,
  lineHeight: 1,
  space: true,
  maxLength: '0',
});
console.log(chalk.green("=== Google Gemini AI Message Generator ==="));

// Load Gemini API key
let GEMINI_API_KEY = "";

try {
  // Check for API key file
  if (fs.existsSync("gemini.key")) {
    GEMINI_API_KEY = fs.readFileSync("gemini.key", "utf-8").trim();
    console.log(chalk.green("[✓] Gemini API key loaded from gemini.key"));
  } else if (fs.existsSync("gemini_token.txt")) {
    GEMINI_API_KEY = fs.readFileSync("gemini_token.txt", "utf-8").trim();
    console.log(chalk.green("[✓] API key loaded from gemini_token.txt"));
  } else {
    console.log(chalk.yellow("[!] No API key file found"));
    console.log(chalk.cyan("\n=== Get FREE Gemini API Key ==="));
    console.log("1. Go to: https://aistudio.google.com/app/apikey");
    console.log("2. Sign in with Google account");
    console.log("3. Click 'Create API Key'");
    console.log("4. Choose 'Create API Key in new project'");
    console.log("5. Copy the API key");
    console.log(chalk.cyan("=".repeat(50)));
    
    GEMINI_API_KEY = readline.question("\nEnter your Gemini API key: ", {
      hideEchoBack: false // Show for easier copy-paste
    });
    
    if (GEMINI_API_KEY.trim()) {
      const saveKey = readline.question("Save to gemini.key file? (yes/no): ").toLowerCase();
      if (saveKey === 'yes') {
        fs.writeFileSync("gemini.key", GEMINI_API_KEY.trim());
        console.log(chalk.green("[✓] API key saved to gemini.key"));
      }
    }
  }
  
  if (!GEMINI_API_KEY.trim()) {
    console.log(chalk.red("[✗] No API key provided. Exiting..."));
    process.exit(1);
  }
} catch (error) {
  console.log(chalk.red("[✗] Error:", error.message));
  process.exit(1);
}

// Try different model versions
const GEMINI_MODELS = [
  "gemini-1.5-flash",  // Fast and free
  "gemini-1.0-pro",    // Older but works
  "gemini-pro",        // Original
  "models/gemini-pro"  // Full path
];

let SELECTED_MODEL = "gemini-1.5-flash"; // Default

console.log(chalk.cyan("\n=== Gemini Model Selection ==="));
console.log("1. gemini-1.5-flash (Recommended - Fast & Free)");
console.log("2. gemini-1.0-pro");
console.log("3. Let me test all models");

const modelChoice = readline.question("Choose option (1-3, Enter for default): ");
if (modelChoice === "2") {
  SELECTED_MODEL = "gemini-1.0-pro";
} else if (modelChoice === "3") {
  SELECTED_MODEL = "auto"; // Will test all
}

console.log(chalk.green(`[✓] Selected: ${SELECTED_MODEL}`));

// Discord Configuration
console.log(chalk.cyan("\n=== Discord Setup ==="));

// Load channels from file
let channelIds = [];
if (fs.existsSync("channels.txt")) {
  try {
    const channelData = fs.readFileSync("channels.txt", "utf-8");
    channelIds = channelData.split('\n')
      .map(id => id.trim())
      .filter(id => id.length > 0 && !id.startsWith('#'));
    
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

// Get channels if not loaded
if (channelIds.length === 0) {
  const channelInput = readline.question("Enter Discord Channel IDs (comma separated): ");
  channelIds = channelInput.split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);
  
  if (channelIds.length === 0) {
    console.log(chalk.red("[✗] No channels specified"));
    process.exit(1);
  }
  
  // Save channels
  const saveChannels = readline.question("Save channels to file? (yes/no): ").toLowerCase();
  if (saveChannels === 'yes') {
    fs.writeFileSync("channels.txt", channelIds.join('\n'));
    console.log(chalk.green("[✓] Channels saved"));
  }
}

// Settings
console.log(chalk.cyan("\n=== Settings ==="));
const deleteOption = readline.question("Delete messages after sending? (yes/no): ").toLowerCase() === 'yes';

// Time settings
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
    console.log(chalk.green(`[✓] Loaded ${tokens.length} tokens from tokens.txt`));
  } else if (fs.existsSync("token.txt")) {
    tokens = fs.readFileSync("token.txt", "utf-8")
      .split('\n')
      .map(token => token.trim())
      .filter(token => token.length > 0);
    console.log(chalk.green(`[✓] Loaded ${tokens.length} tokens from token.txt`));
  } else {
    console.log(chalk.red("[✗] No token file found"));
    console.log(chalk.yellow("[!] Create tokens.txt or token.txt with Discord tokens"));
    process.exit(1);
  }
  
  if (tokens.length === 0) {
    console.log(chalk.red("[✗] Token file is empty"));
    process.exit(1);
  }
} catch (error) {
  console.log(chalk.red("[✗] Error loading tokens"));
  process.exit(1);
}

// HUMAN TEXTING DATABASE
const HUMAN_TEXT_DB = {
  // Casual starters
  starters: [
    "yo", "hey", "sup", "lol", "fr", "deadass", "sheesh",
    "ngl", "tbh", "idk", "wyd", "wsp", "wait", "bruh",
    "damn", "okay", "aight", "bet", "ight", "lowkey"
  ],
  
  // Common phrases
  phrases: [
    "whats good", "you good", "im chillin", "same here",
    "no cap", "fr fr", "ong tho", "thats wild", "thats crazy",
    "i feel that", "mood af", "big facts", "say less",
    "you right", "i feel you", "true that", "preciate it",
    "my bad", "all good", "no worries", "you straight"
  ],
  
  // Action phrases
  actions: [
    "just chilling", "on my phone", "watching stuff",
    "playing games", "thinking about", "trying to",
    "need to", "gonna", "probably", "maybe later",
    "idk yet", "figure it out", "see what happens"
  ],
  
  // Questions
  questions: [
    "wym", "wyd", "wsp", "hbu", "fr", "ong", "deadass",
    "you sure", "for real", "you think", "how come",
    "why though", "since when", "since when tho"
  ],
  
  // Fillers and connectors
  fillers: [
    "like", "i mean", "you know", "tbh", "fr", "ngl",
    "honestly", "literally", "actually", "basically",
    "lowkey", "highkey", "kinda", "sorta", "maybe"
  ]
};

// Generate random human text (fallback)
const generateRandomHumanText = () => {
  const structure = [
    [HUMAN_TEXT_DB.starters, ""],
    [HUMAN_TEXT_DB.phrases, ""],
    [HUMAN_TEXT_DB.actions, ""],
    [HUMAN_TEXT_DB.questions, "?"],
    [HUMAN_TEXT_DB.fillers, HUMAN_TEXT_DB.phrases]
  ];
  
  const randomStruct = structure[Math.floor(Math.random() * structure.length)];
  let text = "";
  
  if (Array.isArray(randomStruct[0]) && Array.isArray(randomStruct[1])) {
    // Two-part structure
    const part1 = randomStruct[0][Math.floor(Math.random() * randomStruct[0].length)];
    const part2 = randomStruct[1][Math.floor(Math.random() * randomStruct[1].length)];
    text = `${part1} ${part2}`;
  } else {
    // Single part with optional suffix
    const word = randomStruct[0][Math.floor(Math.random() * randomStruct[0].length)];
    text = word + (randomStruct[1] || "");
  }
  
  // Apply random transformations
  if (Math.random() < 0.3) {
    text = text.toLowerCase();
  }
  if (Math.random() < 0.2) {
    text = text.replace(/\s+/g, ' ');
  }
  if (Math.random() < 0.15) {
    text = text + '...';
  }
  if (Math.random() < 0.1) {
    // Add typo
    text = text.replace('you', 'u').replace('your', 'ur').replace('are', 'r');
  }
  
  return text.trim();
};

// Test Gemini models
const testGeminiModels = async () => {
  console.log(chalk.cyan("\n🔍 Testing available Gemini models..."));
  
  for (const model of GEMINI_MODELS) {
    try {
      const modelName = model.startsWith("models/") ? model : `models/${model}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: "test"
            }]
          }],
          generationConfig: {
            maxOutputTokens: 5
          }
        })
      });
      
      if (response.ok) {
        console.log(chalk.green(`[✓] ${model} - WORKING`));
        return model;
      } else if (response.status === 404) {
        console.log(chalk.yellow(`[!] ${model} - Not found`));
      } else {
        const error = await response.json();
        console.log(chalk.red(`[✗] ${model} - ${error.error?.message?.substring(0, 50) || 'Error'}`));
      }
    } catch (error) {
      console.log(chalk.red(`[✗] ${model} - Network error`));
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(chalk.red("\n[✗] No working models found. Using fallback text generation."));
  return "fallback";
};

// Generate with Gemini
const generateWithGemini = async (model, context = null) => {
  // If no model or fallback, use random text
  if (model === "fallback" || !model) {
    return generateRandomHumanText();
  }
  
  try {
    // Prepare prompt
    let prompt;
    
    if (context && context.length > 0) {
      const recentMsg = context[0]?.content?.substring(0, 60) || "hey";
      prompt = `Reply to this Discord message: "${recentMsg}"
      
Write a VERY casual, short reply like a real person texting. Rules:
- Use texting slang (u, ur, lol, fr, idk, wyd)
- NO EMOJIS at all
- 1-2 sentences max
- Sound natural, like typing on phone
- Maybe 1 small typo
- Lowercase mostly
- Examples: "yo wsp", "fr no cap", "idk maybe", "sheesh thats wild"

Your reply:`;
    } else {
      prompt = `Write a casual Discord message like a real person texting bored. Rules:
- Use texting slang (u, ur, lol, fr, idk, wyd)
- NO EMOJIS at all
- 1 sentence only
- Sound natural and lazy
- Maybe 1 small typo
- Lowercase
- Examples: "yo whats good", "lol fr", "deadass bro", "wyd rn"

Your message:`;
    }
    
    // Prepare model name
    const modelName = model.startsWith("models/") ? model : `models/${model}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 40,
          topP: 0.9,
          topK: 40
        }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      let message = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      if (message) {
        // Clean up
        message = message.trim();
        message = message.replace(/^["']|["']$/g, '');
        message = message.replace(/\n/g, ' ');
        
        // Make it more human-like
        if (Math.random() < 0.3) {
          message = message.toLowerCase();
        }
        if (Math.random() < 0.2) {
          message = message.replace(/[.,!?]$/, '');
        }
        if (message.length > 80) {
          message = message.substring(0, 80) + '...';
        }
        
        return message || generateRandomHumanText();
      }
    }
  } catch (error) {
    // Silent error
  }
  
  return generateRandomHumanText();
};

// Get recent messages
const getChannelContext = async (channelId, token) => {
  try {
    const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages?limit=2`, {
      headers: { 'Authorization': token }
    });
    if (response.ok) {
      const messages = await response.json();
      return messages.filter(msg => msg.content && msg.content.trim().length > 0);
    }
  } catch (error) {}
  return [];
};

// Send message
const sendMessage = async (channelId, content, token) => {
  try {
    const thinkTime = Math.random() * 2000 + 1000;
    await new Promise(resolve => setTimeout(resolve, thinkTime));
    
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

// Main execution
(async () => {
  console.log(chalk.cyan("\n" + "=".repeat(50)));
  console.log(chalk.green("💬 HUMAN TEXT GENERATOR"));
  console.log(chalk.cyan("=".repeat(50)));
  
  // Determine working model
  let workingModel = SELECTED_MODEL;
  if (SELECTED_MODEL === "auto") {
    workingModel = await testGeminiModels();
  }
  
  if (workingModel === "fallback") {
    console.log(chalk.yellow("\n⚠️  Using fallback text generation (no API)"));
    console.log(chalk.green("✓ Human-like text will still be generated"));
  } else {
    console.log(chalk.green(`\n✅ Using model: ${workingModel}`));
  }
  
  console.log(chalk.white(`📊 Channels: ${channelIds.length}`));
  console.log(chalk.white(`⏱️  Delay: ${sendDelay / 1000}s`));
  console.log(chalk.white(`🗑️  Delete: ${deleteOption ? 'Yes' : 'No'}`));
  console.log(chalk.white(`🔑 Accounts: ${tokens.length}`));
  console.log(chalk.cyan("=".repeat(50)));
  
  console.log(chalk.yellow("\n📝 Example messages:"));
  console.log(chalk.gray("  yo wsp"));
  console.log(chalk.gray("  fr no cap"));
  console.log(chalk.gray("  idk maybe"));
  console.log(chalk.gray("  sheesh thats wild"));
  console.log(chalk.gray("  wyd rn like fr"));
  console.log("");
  
  const start = readline.question("Press Enter to start, 'stop' to exit: ");
  if (start.toLowerCase() === 'stop') {
    console.log(chalk.yellow("[!] Exiting..."));
    process.exit(0);
  }
  
  console.log(chalk.green("\n🚀 Starting message generation..."));
  console.log(chalk.yellow("[!] Press Ctrl+C to stop\n"));
  
  let messageCount = 0;
  
  while (true) {
    for (const token of tokens) {
      for (const channelId of channelIds) {
        try {
          messageCount++;
          console.log(chalk.cyan(`\n[${messageCount}] Channel: ${channelId}`));
          
          // Get context
          const context = await getChannelContext(channelId, token);
          
          // Generate message
          console.log(chalk.yellow("[Generating...]"));
          const message = await generateWithGemini(workingModel, context);
          
          console.log(chalk.green("[Text]:") + chalk.white(` ${message}`));
          
          // Send
          await sendMessage(channelId, message, token);
          
          // Random delay
          const randomDelay = sendDelay * (0.7 + Math.random() * 0.6);
          console.log(chalk.gray(`⏳ Next in ${Math.round(randomDelay/1000)}s...`));
          await new Promise(resolve => setTimeout(resolve, randomDelay));
          
        } catch (error) {
          console.error(chalk.red("[✗] Error"));
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
    }
    
    console.log(chalk.magenta("\n♻️  Cycle complete"));
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
})();
