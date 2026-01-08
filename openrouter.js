import fetch from 'node-fetch';
import readline from 'readline-sync';
import fs from 'fs';
import chalk from 'chalk';
import cfonts from 'cfonts';

// Display banner
cfonts.say('Human Chat Bot', {
  font: 'block',
  align: 'center',
  colors: ['cyan', 'magenta'],
  background: 'black',
  letterSpacing: 1,
  lineHeight: 1,
  space: true,
  maxLength: '0',
});
console.log(chalk.green("=== Real Human Typing Simulator ==="));

// Load API keys
let OPENROUTER_API_KEY = "";

try {
  if (fs.existsSync("api.token")) {
    OPENROUTER_API_KEY = fs.readFileSync("api.token", "utf-8").trim();
    console.log(chalk.green("[✓] API key loaded"));
  } else {
    console.log(chalk.yellow("[!] api.token file not found"));
    OPENROUTER_API_KEY = readline.question("Enter OpenRouter API key: ", { hideEchoBack: true });
    
    const saveKey = readline.question("Save to api.token file? (yes/no): ").toLowerCase();
    if (saveKey === 'yes') {
      fs.writeFileSync("api.token", OPENROUTER_API_KEY);
      console.log(chalk.green("[✓] API key saved"));
    }
  }
  
  if (!OPENROUTER_API_KEY) {
    console.log(chalk.red("[✗] No API key. Exiting..."));
    process.exit(1);
  }
} catch (error) {
  console.log(chalk.red("[✗] Error:", error.message));
  process.exit(1);
}

// Select model
console.log(chalk.cyan("\n=== Model Selection ==="));
console.log("1. gpt-3.5-turbo (Recommended - most natural)");
console.log("2. google/gemini-pro");
console.log("3. meta-llama/llama-3-8b-instruct");

const modelChoice = readline.question("Select model (1-3, Enter for default): ");
let MODEL;
switch(modelChoice) {
  case "2": MODEL = "google/gemini-pro"; break;
  case "3": MODEL = "meta-llama/llama-3-8b-instruct"; break;
  default: MODEL = "openai/gpt-3.5-turbo";
}
console.log(chalk.green(`[✓] Model: ${MODEL}`));

// Discord config
let channelIds = [];
if (fs.existsSync("channels.txt")) {
  const channelData = fs.readFileSync("channels.txt", "utf-8");
  channelIds = channelData.split('\n').map(id => id.trim()).filter(id => id.length > 0);
  if (channelIds.length > 0) {
    console.log(chalk.green(`[✓] Loaded ${channelIds.length} channels`));
    const useFile = readline.question("Use these channels? (yes/no): ").toLowerCase();
    if (useFile !== 'yes') channelIds = [];
  }
}

if (channelIds.length === 0) {
  const input = readline.question("Enter channel IDs (comma separated): ");
  channelIds = input.split(',').map(id => id.trim()).filter(id => id.length > 0);
  
  if (channelIds.length === 0) {
    console.log(chalk.red("[✗] No channels. Exiting..."));
    process.exit(1);
  }
  
  const save = readline.question("Save channels? (yes/no): ").toLowerCase();
  if (save === 'yes') {
    fs.writeFileSync("channels.txt", channelIds.join('\n'));
    console.log(chalk.green("[✓] Channels saved"));
  }
}

// Settings
const deleteOption = readline.question("Delete messages? (yes/no): ").toLowerCase() === 'yes';
const sendDelay = Math.max(parseInt(readline.question("Delay between messages (seconds, min 15): ") || "20"), 15) * 1000;
let deleteDelay = 0;
let afterDeleteDelay = 0;

if (deleteOption) {
  deleteDelay = parseInt(readline.question("Delete after (seconds): ") || "30") * 1000;
  afterDeleteDelay = parseInt(readline.question("Pause after delete (seconds): ") || "5") * 1000;
}

// Load Discord tokens
let tokens = [];
try {
  if (fs.existsSync("token.txt")) {
    tokens = fs.readFileSync("token.txt", "utf-8")
      .split('\n')
      .map(token => token.trim())
      .filter(token => token.length > 0);
    
    if (tokens.length === 0) {
      console.log(chalk.red("[✗] token.txt is empty"));
      process.exit(1);
    }
    console.log(chalk.green(`[✓] Loaded ${tokens.length} tokens`));
  } else {
    console.log(chalk.red("[✗] token.txt not found"));
    process.exit(1);
  }
} catch (error) {
  console.log(chalk.red("[✗] Error loading tokens:", error.message));
  process.exit(1);
}

// REAL HUMAN TYPING PATTERNS
const HUMAN_TYPING_PATTERNS = {
  // Common typing mistakes
  typos: [
    "teh", "adn", "waht", "becuase", "tahnk", "yuor", "liek",
    "cna", "dont", "im", "idk", "idc", "tbh", "nvm", "lmao",
    "wsp", "wyd", "hbu", "ikr", "fr", "ong", "deadass"
  ],
  
  // Casual sentence starters
  starters: [
    "yo", "hey", "so", "like", "actually", "tbh", "fr",
    "lowkey", "ngl", "bruh", "damn", "wait", "okay",
    "anyways", "lmao", "sheesh"
  ],
  
  // Sentence connectors
  connectors: [
    "but like", "and then", "so yeah", "anyway",
    "i mean", "you know", "like i said", "honestly",
    "at least", "i guess", "maybe", "probably"
  ],
  
  // Abbreviations real people use
  abbrevs: {
    "you": "u",
    "your": "ur",
    "are": "r",
    "be": "b",
    "see": "c",
    "the": "da",
    "to": "2",
    "too": "2",
    "for": "4",
    "before": "b4",
    "because": "cuz",
    "what's up": "wsp",
    "what you doing": "wyd",
    "how about you": "hbu",
    "i don't know": "idk",
    "i don't care": "idc",
    "to be honest": "tbh",
    "never mind": "nvm",
    "laughing my ass off": "lmao",
    "on god": "ong",
    "for real": "fr"
  },
  
  // Natural pauses
  pauses: ["...", "..", "umm", "like", "you know", "i mean"]
};

// Generate REAL human-like messages
const generateHumanMessage = async (context = null) => {
  try {
    // Choose a natural conversation topic
    const topics = [
      "just saw something crazy online",
      "thinking about food rn",
      "this game is wild",
      "had a weird dream last night",
      "work/school was rough today",
      "watching something good",
      "my phone battery dies so fast",
      "weather is something else",
      "need to get my sleep schedule right",
      "internet is slow af today"
    ];
    
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    
    // Create prompt that forces human-like speech
    let prompt;
    
    if (context && context.length > 0) {
      // Respond to existing conversation
      const recent = context.slice(0, 2).map(m => m.content).join(' ');
      prompt = `You're a real person in a Discord chat. Someone just said: "${recent.substring(0, 100)}"
      
Write a VERY casual, natural response like a normal human typing on phone. Use:
- Slang and abbreviations (u, ur, lol, fr, idk)
- Small typing mistakes sometimes
- No emojis at all
- Max 2 short sentences
- Sound tired/bored/chill like real people

Your response (as if typing quickly):`;
    } else {
      // Start new conversation
      prompt = `You're a real person bored on Discord. Start a casual chat about ${randomTopic}.

Write exactly how people type in real life:
- Use slang (fr, lol, ngl, tbh)
- Abbreviate words (u for you, ur for your)
- Maybe one small typo
- NO EMOJIS AT ALL
- Sound lazy/casual
- 1-2 sentences max

Your message:`;
    }
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Discord User'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `You are a real human Discord user. You type like people actually do:
1. Use casual language and slang
2. Abbreviate common words (u, ur, r, lol, fr)
3. Sometimes make small typos but don't overdo it
4. NEVER use emojis or emoticons
5. Keep messages short (1-3 sentences max)
6. Sound like you're typing on phone while distracted
7. Use lowercase mostly, only capitalize for emphasis
8. Add "..." or "idk" when thinking
9. Use filler words like "like", "i mean", "you know"
10. Be inconsistent sometimes with punctuation`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 50,
        temperature: 0.92, // More random
        presence_penalty: 0.3,
        frequency_penalty: 0.4
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      let message = data.choices[0]?.message?.content?.trim() || "";
      
      if (message) {
        // Apply human-like transformations
        message = applyHumanTransformations(message);
        return message.substring(0, 150); // Keep it short
      }
    }
  } catch (error) {
    console.error(chalk.red("[✗] API error:", error.message));
  }
  
  // Fallback: Real human-sounding messages (no emojis)
  const fallbacks = [
    "yo whats good",
    "lol fr",
    "deadass bro",
    "lowkey facts",
    "sheesh thats wild",
    "ngl i was thinking the same",
    "bruh moment fr",
    "wait actually",
    "like fr tho",
    "ok but hear me out",
    "i mean i guess",
    "thats crazy ngl",
    "wyd rn",
    "same tbh",
    "idk man",
    "true that",
    "lmao facts",
    "ong tho",
    "not gonna lie",
    "thats valid"
  ];
  
  let msg = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  return applyHumanTransformations(msg);
};

// Apply human-like text transformations
const applyHumanTransformations = (text) => {
  let result = text;
  
  // 1. Lowercase everything (mostly)
  if (Math.random() < 0.7) {
    result = result.toLowerCase();
  }
  
  // 2. Add occasional typos (20% chance)
  if (Math.random() < 0.2 && result.length > 5) {
    const typoWords = HUMAN_TYPING_PATTERNS.typos;
    const typo = typoWords[Math.floor(Math.random() * typoWords.length)];
    
    // Replace random word or add typo
    const words = result.split(' ');
    if (words.length > 2) {
      const idx = Math.floor(Math.random() * words.length);
      words[idx] = typo;
      result = words.join(' ');
    }
  }
  
  // 3. Apply abbreviations (30% chance)
  if (Math.random() < 0.3) {
    const abbrevs = HUMAN_TYPING_PATTERNS.abbrevs;
    for (const [full, abbrev] of Object.entries(abbrevs)) {
      if (Math.random() < 0.5) {
        const regex = new RegExp(`\\b${full}\\b`, 'gi');
        result = result.replace(regex, abbrev);
      }
    }
  }
  
  // 4. Remove punctuation (40% chance)
  if (Math.random() < 0.4) {
    result = result.replace(/[.,!?;:]/g, '');
  }
  
  // 5. Add filler words (25% chance)
  if (Math.random() < 0.25 && result.split(' ').length < 10) {
    const fillers = ["like", "i mean", "you know", "tbh", "fr"];
    const filler = fillers[Math.floor(Math.random() * fillers.length)];
    
    if (Math.random() > 0.5) {
      result = filler + " " + result;
    } else {
      result = result + " " + filler;
    }
  }
  
  // 6. Add thinking pauses (15% chance)
  if (Math.random() < 0.15) {
    result = result + "..." + (Math.random() > 0.5 ? " idk" : "");
  }
  
  // 7. Remove any remaining emojis
  result = result.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  
  // 8. Ensure not too perfect
  if (result.length > 10 && Math.random() < 0.1) {
    // Remove a space randomly
    result = result.replace(/\s+/, ' ');
  }
  
  return result.trim();
};

// Get recent messages for context
const getChannelContext = async (channelId, token) => {
  try {
    const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages?limit=3`, {
      headers: { 'Authorization': token }
    });
    if (response.ok) return await response.json();
  } catch (error) {}
  return [];
};

// Send message with human-like timing variation
const sendMessage = async (channelId, content, token) => {
  try {
    // Random small delay before sending (like human thinking time)
    const thinkDelay = Math.random() * 2000 + 1000;
    await new Promise(resolve => setTimeout(resolve, thinkDelay));
    
    const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 
        'Authorization': token, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        content,
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
      const retryAfter = (await response.json()).retry_after;
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

// Test API
const testAPI = async () => {
  console.log(chalk.cyan("\n🔌 Testing connection..."));
  try {
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}` }
    });
    
    if (response.ok) {
      console.log(chalk.green("[✓] API connected"));
      return true;
    }
  } catch (error) {}
  
  console.log(chalk.yellow("[!] API test failed, but continuing..."));
  return true;
};

// Main
(async () => {
  console.log(chalk.cyan("\n" + "=".repeat(50)));
  console.log(chalk.yellow("👤 REAL HUMAN TEXT GENERATOR"));
  console.log(chalk.cyan("=".repeat(50)));
  
  await testAPI();
  
  console.log(chalk.white(`📊 Channels: ${channelIds.length}`));
  console.log(chalk.white(`⏱️  Delay: ${sendDelay / 1000}s (randomized)`));
  console.log(chalk.white(`🗑️  Delete: ${deleteOption ? 'Yes' : 'No'}`));
  console.log(chalk.white(`🔑 Accounts: ${tokens.length}`));
  console.log(chalk.cyan("=".repeat(50)));
  
  const start = readline.question("\nPress Enter to start, 'stop' to exit: ");
  if (start.toLowerCase() === 'stop') {
    console.log(chalk.yellow("[!] Exiting..."));
    process.exit(0);
  }
  
  console.log(chalk.green("\n🚀 Starting human-like messaging..."));
  console.log(chalk.yellow("[!] Ctrl+C to stop\n"));
  
  // Show example of human-like messages
  console.log(chalk.cyan("Example human messages:"));
  console.log(chalk.gray("  yo whats good"));
  console.log(chalk.gray("  lol fr deadass"));
  console.log(chalk.gray("  i mean idk maybe"));
  console.log(chalk.gray("  sheesh thats wild ngl"));
  console.log(chalk.gray("  wyd rn like fr"));
  console.log("");
  
  let messageCount = 0;
  
  while (true) {
    for (const token of tokens) {
      for (const channelId of channelIds) {
        try {
          messageCount++;
          console.log(chalk.cyan(`\n[${messageCount}] Channel: ${channelId}`));
          
          // Get context for natural replies
          const context = await getChannelContext(channelId, token);
          
          // Generate human message
          console.log(chalk.yellow("[Thinking...]"));
          const message = await generateHumanMessage(context);
          
          console.log(chalk.green("[Typing]:") + chalk.white(` ${message}`));
          
          // Send with human-like timing
          await sendMessage(channelId, message, token);
          
          // Random delay between messages (like human activity)
          const randomDelay = sendDelay * (0.8 + Math.random() * 0.4);
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
