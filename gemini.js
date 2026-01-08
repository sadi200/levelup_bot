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
  if (fs.existsSync("gemini.token")) {
    GEMINI_API_KEY = fs.readFileSync("gemini.token", "utf-8").trim();
    console.log(chalk.green("[✓] Gemini API key loaded from gemini.token"));
  } else if (fs.existsSync("api.key")) {
    GEMINI_API_KEY = fs.readFileSync("api.key", "utf-8").trim();
    console.log(chalk.green("[✓] API key loaded from api.key"));
  } else {
    console.log(chalk.yellow("[!] No API key file found"));
    console.log(chalk.cyan("\n=== Get FREE Gemini API Key ==="));
    console.log("1. Go to: https://makersuite.google.com/app/apikey");
    console.log("2. Sign in with Google account");
    console.log("3. Click 'Create API Key'");
    console.log("4. Copy the API key");
    console.log(chalk.cyan("=".repeat(50)));
    
    GEMINI_API_KEY = readline.question("\nEnter your Gemini API key: ", {
      hideEchoBack: true
    });
    
    if (GEMINI_API_KEY.trim()) {
      const saveKey = readline.question("Save to gemini.token file? (yes/no): ").toLowerCase();
      if (saveKey === 'yes') {
        fs.writeFileSync("gemini.token", GEMINI_API_KEY.trim());
        console.log(chalk.green("[✓] API key saved to gemini.token"));
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
      console.log(chalk.green(`[✓] Loaded ${channelIds.length} channels from file`));
      console.log(chalk.gray("Channels: " + channelIds.join(', ')));
      
      const useThese = readline.question("Use these channels? (yes/no): ").toLowerCase();
      if (useThese !== 'yes') {
        channelIds = [];
      }
    }
  } catch (error) {
    console.log(chalk.yellow("[!] Error reading channels file:", error.message));
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
  const saveChannels = readline.question("Save these channels to file? (yes/no): ").toLowerCase();
  if (saveChannels === 'yes') {
    fs.writeFileSync("channels.txt", channelIds.join('\n'));
    console.log(chalk.green("[✓] Channels saved to channels.txt"));
  }
}

// Settings
console.log(chalk.cyan("\n=== Settings ==="));
const deleteOption = readline.question("Delete messages after sending? (yes/no): ").toLowerCase() === 'yes';

// Time settings with minimum values
let sendDelay = parseInt(readline.question("Delay between messages (seconds, min 10): ") || "15");
sendDelay = Math.max(sendDelay, 10) * 1000; // Convert to milliseconds

let deleteDelay = 0;
let afterDeleteDelay = 0;

if (deleteOption) {
  deleteDelay = parseInt(readline.question("Delete after (seconds): ") || "30") * 1000;
  afterDeleteDelay = parseInt(readline.question("Wait after delete (seconds): ") || "5") * 1000;
}

// Load Discord tokens
let tokens = [];
try {
  if (fs.existsSync("token.txt")) {
    tokens = fs.readFileSync("token.txt", "utf-8")
      .split('\n')
      .map(token => token.trim())
      .filter(token => token.length > 0 && token !== '');
    
    if (tokens.length === 0) {
      console.log(chalk.red("[✗] token.txt file is empty"));
      console.log(chalk.yellow("[!] Add Discord tokens to token.txt (one per line)"));
      process.exit(1);
    }
    console.log(chalk.green(`[✓] Loaded ${tokens.length} Discord tokens`));
  } else {
    console.log(chalk.red("[✗] token.txt file not found"));
    console.log(chalk.yellow("[!] Create token.txt with Discord tokens (one per line)"));
    process.exit(1);
  }
} catch (error) {
  console.log(chalk.red("[✗] Error loading tokens:", error.message));
  process.exit(1);
}

// REAL HUMAN TEXTING PATTERNS
const HUMAN_TEXTING = {
  // Common texting styles
  styles: [
    "casual_lazy",      // "yo", "sup", "idk"
    "thinking",         // "...", "hmm", "idk maybe"
    "excited",          // "yo!", "wait fr?", "deadass?"
    "chill",            // "cool", "nice", "aight"
    "agreeing",         // "facts", "true", "same"
    "questioning"       // "wyd", "wym", "fr?"
  ],
  
  // Texting abbreviations
  abbrevs: {
    "you": "u", "your": "ur", "are": "r", "be": "b", 
    "see": "c", "the": "da", "to": "2", "too": "2",
    "for": "4", "before": "b4", "because": "cuz", "with": "wit",
    "what's up": "wsp", "what you doing": "wyd", "what you mean": "wym",
    "how about you": "hbu", "i don't know": "idk", "i don't care": "idc",
    "to be honest": "tbh", "never mind": "nvm", "for real": "fr",
    "on god": "ong", "laughing my ass off": "lmao", "be right back": "brb",
    "by the way": "btw", "oh my god": "omg", "talk to you later": "ttyl"
  },
  
  // Common texting phrases
  phrases: [
    "yo wsp", "wyd rn", "fr no cap", "deadass bro", "sheesh",
    "lowkey facts", "ong tho", "ngl i was thinking", "same tbh",
    "idk man", "wait actually", "lmao facts", "thats wild",
    "not gonna lie", "thats valid", "i feel that", "mood",
    "big if true", "crying rn", "im weak", "bruh moment",
    "say less", "bet", "aight cool", "ight bet", "preciate it"
  ],
  
  // Natural errors people make
  naturalErrors: [
    "teh", "adn", "waht", "becuase", "tahnk", "yuor", "liek",
    "cna", "dont", "cant", "wanna", "gonna", "gotta", "ima",
    "kinda", "sorta", "outta", "lemme", "gimme", "tryna"
  ]
};

// Generate message using Gemini API
const generateWithGemini = async (context = null) => {
  try {
    // Select random texting style
    const style = HUMAN_TEXTING.styles[Math.floor(Math.random() * HUMAN_TEXTING.styles.length)];
    
    // Select a casual topic
    const topics = [
      "just scrolling through my phone bored",
      "thinking about what to eat",
      "this youtube video i just watched",
      "my internet being slow af",
      "need to wake up earlier tomorrow",
      "forgot to do something important",
      "phone battery dying too fast",
      "random thought i just had",
      "something funny that happened",
      "tired but cant sleep"
    ];
    
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    
    // Create prompt for Gemini
    let prompt;
    
    if (context && context.length > 0) {
      // Respond to existing chat
      const recentMsg = context[0]?.content?.substring(0, 80) || "";
      prompt = `You're in a Discord chat. Someone said: "${recentMsg}"
      
Reply like a real person texting casually. Rules:
1. Use texting slang (u, ur, lol, fr, idk)
2. NO EMOJIS at all
3. Sound natural, maybe 1 small typo
4. Keep it short (1 sentence, max 2)
5. Style: ${style}
6. Use lowercase mostly
7. Add filler words like "like", "i mean", "you know" sometimes
8. Sound like you're typing while doing something else

Your reply:`;
    } else {
      // Start new conversation
      prompt = `Write a casual Discord message about: ${randomTopic}

Write it exactly how real people text:
- Use slang and abbreviations
- NO EMOJIS (zero emojis)
- Maybe 1 typing mistake
- Keep it very short (1 sentence)
- Sound ${style}
- Use lowercase letters
- Add "..." or "idk" if thinking
- Sound natural, not like AI

Your message:`;
    }
    
    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
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
          temperature: 0.95, // More creative
          maxOutputTokens: 50, // Keep it short
          topP: 0.9,
          topK: 40
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE"
          }
        ]
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      let message = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      if (message) {
        // Clean and humanize the message
        message = humanizeText(message);
        return message.substring(0, 120); // Limit length
      }
    } else {
      const errorData = await response.json();
      console.log(chalk.yellow(`[!] Gemini API error: ${JSON.stringify(errorData.error || response.status)}`));
    }
  } catch (error) {
    console.error(chalk.red("[✗] Gemini error:", error.message));
  }
  
  // Fallback to realistic texting phrases
  return getRandomTextingPhrase();
};

// Make text more human-like
const humanizeText = (text) => {
  let result = text.trim();
  
  // 1. Remove any emojis
  result = result.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  
  // 2. Remove quotes if present
  result = result.replace(/^["']|["']$/g, '');
  
  // 3. Apply abbreviations (40% chance)
  if (Math.random() < 0.4) {
    const abbrevs = HUMAN_TEXTING.abbrevs;
    for (const [full, short] of Object.entries(abbrevs)) {
      const regex = new RegExp(`\\b${full}\\b`, 'gi');
      if (regex.test(result)) {
        result = result.replace(regex, short);
      }
    }
  }
  
  // 4. Add natural errors (20% chance)
  if (Math.random() < 0.2 && result.length > 10) {
    const errors = HUMAN_TEXTING.naturalErrors;
    const errorWord = errors[Math.floor(Math.random() * errors.length)];
    
    // Replace random short word with error
    const words = result.split(' ');
    const shortWords = words.filter(w => w.length <= 4);
    if (shortWords.length > 0) {
      const target = shortWords[Math.floor(Math.random() * shortWords.length)];
      const idx = words.indexOf(target);
      if (idx !== -1) {
        words[idx] = errorWord;
        result = words.join(' ');
      }
    }
  }
  
  // 5. Lowercase everything (70% chance)
  if (Math.random() < 0.7) {
    result = result.toLowerCase();
  }
  
  // 6. Remove punctuation (30% chance)
  if (Math.random() < 0.3) {
    result = result.replace(/[.,!?;:]$/g, '');
  }
  
  // 7. Add thinking ellipsis (15% chance)
  if (Math.random() < 0.15 && !result.includes('...')) {
    if (Math.random() > 0.5) {
      result = result + '...';
    } else {
      result = '...' + result;
    }
  }
  
  // 8. Add filler word (25% chance)
  if (Math.random() < 0.25) {
    const fillers = ['like', 'i mean', 'you know', 'tbh', 'fr', 'ngl'];
    const filler = fillers[Math.floor(Math.random() * fillers.length)];
    
    if (Math.random() > 0.5) {
      result = filler + ' ' + result;
    } else if (!result.endsWith('...')) {
      result = result + ' ' + filler;
    }
  }
  
  // 9. Ensure it's not empty
  if (!result.trim()) {
    result = getRandomTextingPhrase();
  }
  
  return result.trim();
};

// Get random texting phrase
const getRandomTextingPhrase = () => {
  const phrases = HUMAN_TEXTING.phrases;
  let phrase = phrases[Math.floor(Math.random() * phrases.length)];
  
  // Sometimes modify the phrase
  if (Math.random() < 0.3) {
    phrase = phrase.toLowerCase();
  }
  if (Math.random() < 0.2) {
    phrase = phrase + '...';
  }
  if (Math.random() < 0.1) {
    const words = phrase.split(' ');
    if (words.length > 1) {
      // Swap two words randomly (like natural speaking)
      const idx1 = Math.floor(Math.random() * words.length);
      let idx2 = Math.floor(Math.random() * words.length);
      while (idx2 === idx1) {
        idx2 = Math.floor(Math.random() * words.length);
      }
      [words[idx1], words[idx2]] = [words[idx2], words[idx1]];
      phrase = words.join(' ');
    }
  }
  
  return phrase;
};

// Get recent messages for context
const getChannelContext = async (channelId, token) => {
  try {
    const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages?limit=2`, {
      headers: { 'Authorization': token }
    });
    
    if (response.ok) {
      const messages = await response.json();
      return messages.filter(msg => msg.content && msg.content.trim().length > 0);
    }
  } catch (error) {
    // Silent error
  }
  return [];
};

// Send message to Discord
const sendMessage = async (channelId, content, token) => {
  try {
    // Add small random delay (like human thinking)
    const thinkTime = Math.random() * 1500 + 500;
    await new Promise(resolve => setTimeout(resolve, thinkTime));
    
    const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { 
        'Authorization': token, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        content: content.substring(0, 200), // Discord limit
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
      // Rate limited
      const retryAfter = (await response.json()).retry_after || 5;
      console.log(chalk.yellow(`[!] Rate limited, waiting ${retryAfter}s`));
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return sendMessage(channelId, content, token);
    } else {
      console.log(chalk.red(`[✗] Send failed: ${response.status}`));
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
      console.log(chalk.blue(`[✓] Deleted message`));
    }
    
    await new Promise(resolve => setTimeout(resolve, afterDeleteDelay));
  } catch (error) {
    // Silent error
  }
};

// Test Gemini API connection
const testGeminiAPI = async () => {
  console.log(chalk.cyan("\n🔌 Testing Gemini API..."));
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Say 'API connected' if you can read this"
          }]
        }],
        generationConfig: {
          maxOutputTokens: 10
        }
      })
    });
    
    if (response.ok) {
      console.log(chalk.green("[✓] Gemini API connected successfully"));
      return true;
    } else {
      const error = await response.json();
      console.log(chalk.red(`[✗] API error: ${error.error?.message || 'Unknown error'}`));
      return false;
    }
  } catch (error) {
    console.log(chalk.red("[✗] Connection failed:", error.message));
    return false;
  }
};

// Main execution
(async () => {
  console.log(chalk.cyan("\n" + "=".repeat(50)));
  console.log(chalk.green("🤖 GOOGLE GEMINI DISCORD BOT"));
  console.log(chalk.cyan("=".repeat(50)));
  
  // Test API
  const apiConnected = await testGeminiAPI();
  if (!apiConnected) {
    const proceed = readline.question("API test failed. Continue anyway? (yes/no): ").toLowerCase();
    if (proceed !== 'yes') {
      process.exit(1);
    }
  }
  
  console.log(chalk.green("\n✅ Configuration Complete!"));
  console.log(chalk.white(`📊 Channels: ${channelIds.length}`));
  console.log(chalk.white(`⏱️  Delay: ${sendDelay / 1000}s`));
  console.log(chalk.white(`🗑️  Auto-delete: ${deleteOption ? 'Yes' : 'No'}`));
  console.log(chalk.white(`🔑 Discord accounts: ${tokens.length}`));
  console.log(chalk.cyan("=".repeat(50)));
  
  console.log(chalk.yellow("\n📝 Example human messages (no emojis):"));
  console.log(chalk.gray("  yo wsp"));
  console.log(chalk.gray("  fr no cap"));
  console.log(chalk.gray("  idk maybe later"));
  console.log(chalk.gray("  sheesh thats wild"));
  console.log(chalk.gray("  wyd rn like fr"));
  console.log("");
  
  const start = readline.question("Press Enter to start, type 'stop' to exit: ");
  if (start.toLowerCase() === 'stop') {
    console.log(chalk.yellow("[!] Exiting..."));
    process.exit(0);
  }
  
  console.log(chalk.green("\n🚀 Starting Gemini-powered messaging..."));
  console.log(chalk.yellow("[!] Press Ctrl+C to stop\n"));
  
  let messageCount = 0;
  let cycleCount = 0;
  
  while (true) {
    cycleCount++;
    console.log(chalk.magenta(`\n🔄 Cycle ${cycleCount}`));
    
    for (const token of tokens) {
      for (const channelId of channelIds) {
        try {
          messageCount++;
          console.log(chalk.cyan(`\n[${messageCount}] Channel: ${channelId}`));
          
          // Get context
          const context = await getChannelContext(channelId, token);
          
          // Generate human-like message
          console.log(chalk.yellow("[Gemini] Thinking..."));
          const message = await generateWithGemini(context);
          
          console.log(chalk.green("[Texting]:") + chalk.white(` ${message}`));
          
          // Send message
          await sendMessage(channelId, message, token);
          
          // Random delay between messages
          const randomDelay = sendDelay * (0.8 + Math.random() * 0.4);
          console.log(chalk.gray(`⏳ Next in ${Math.round(randomDelay/1000)}s...`));
          await new Promise(resolve => setTimeout(resolve, randomDelay));
          
        } catch (error) {
          console.error(chalk.red("[✗] Error:", error.message));
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
    }
    
    // Small break between cycles
    console.log(chalk.magenta("\n💤 Taking a short break..."));
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
})();
