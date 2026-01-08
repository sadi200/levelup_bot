import fetch from 'node-fetch';
import readline from 'readline-sync';
import fs from 'fs';
import chalk from 'chalk';
import cfonts from 'cfonts';

// Display banner
cfonts.say('AI Chat Generator', {
  font: 'block',
  align: 'center',
  colors: ['cyan', 'magenta'],
  background: 'black',
  letterSpacing: 1,
  lineHeight: 1,
  space: true,
  maxLength: '0',
});
console.log(chalk.green("=== AI Powered Discord Message Generator ==="));

// Load API keys from files
let OPENROUTER_API_KEY = "";

try {
  // Try to load from api.token file first
  if (fs.existsSync("api.token")) {
    OPENROUTER_API_KEY = fs.readFileSync("api.token", "utf-8").trim();
    console.log(chalk.green("[✓] OpenRouter API key loaded from api.token file"));
  } else if (fs.existsSync("openrouter.token")) {
    // Alternative file name
    OPENROUTER_API_KEY = fs.readFileSync("openrouter.token", "utf-8").trim();
    console.log(chalk.green("[✓] OpenRouter API key loaded from openrouter.token file"));
  } else {
    // If no file exists, ask user
    console.log(chalk.yellow("[!] api.token file not found"));
    const useFile = readline.question("Do you want to create api.token file? (yes/no): ").toLowerCase();
    
    if (useFile === 'yes') {
      OPENROUTER_API_KEY = readline.question("Enter your OpenRouter API key: ", {
        hideEchoBack: true // Hide input for security
      });
      
      // Save to file
      fs.writeFileSync("api.token", OPENROUTER_API_KEY);
      console.log(chalk.green("[✓] API key saved to api.token file"));
    } else {
      // Use direct input
      OPENROUTER_API_KEY = readline.question("Enter your OpenRouter API key: ", {
        hideEchoBack: true
      });
    }
  }
  
  // Verify API key is not empty
  if (!OPENROUTER_API_KEY) {
    console.log(chalk.red("[✗] No API key provided. Exiting..."));
    process.exit(1);
  }
  
} catch (error) {
  console.log(chalk.red("[✗] Error loading API key:", error.message));
  OPENROUTER_API_KEY = readline.question("Enter OpenRouter API key manually: ", {
    hideEchoBack: true
  });
}

// Model selection with default
console.log(chalk.cyan("\n=== Available Models ==="));
console.log("1. openai/gpt-3.5-turbo (Fast & Cheap)");
console.log("2. google/gemini-pro (Good for casual chat)");
console.log("3. meta-llama/llama-3-8b-instruct (Free tier friendly)");
console.log("4. anthropic/claude-3-haiku (Smart & Fast)");
console.log("5. mistralai/mistral-7b-instruct (Good balance)");
console.log("6. Custom model input");

const modelChoice = readline.question("\nSelect model (1-6) or press Enter for default: ");

let MODEL;
switch(modelChoice) {
  case "1":
    MODEL = "openai/gpt-3.5-turbo";
    break;
  case "2":
    MODEL = "google/gemini-pro";
    break;
  case "3":
    MODEL = "meta-llama/llama-3-8b-instruct";
    break;
  case "4":
    MODEL = "anthropic/claude-3-haiku";
    break;
  case "5":
    MODEL = "mistralai/mistral-7b-instruct";
    break;
  case "6":
    MODEL = readline.question("Enter custom model ID: ");
    break;
  default:
    MODEL = "openai/gpt-3.5-turbo";
}

console.log(chalk.green(`[✓] Selected model: ${MODEL}`));

// Discord Configuration
console.log(chalk.cyan("\n=== Discord Configuration ==="));

// Load channel IDs from file if exists
let channelIds = [];
if (fs.existsSync("channels.txt")) {
  const channelData = fs.readFileSync("channels.txt", "utf-8");
  channelIds = channelData.split('\n')
    .map(id => id.trim())
    .filter(id => id.length > 0);
  console.log(chalk.green(`[✓] Loaded ${channelIds.length} channels from channels.txt`));
  
  if (channelIds.length > 0) {
    console.log("Loaded channels:", channelIds.join(", "));
    const useFileChannels = readline.question("Use these channels? (yes/no): ").toLowerCase();
    if (useFileChannels !== 'yes') {
      channelIds = [];
    }
  }
}

// If no channels from file or user declined, ask for input
if (channelIds.length === 0) {
  const channelInput = readline.question("Enter Discord channel IDs (separate with commas): ");
  channelIds = channelInput.split(',').map(id => id.trim()).filter(id => id.length > 0);
  
  // Save to file for future use
  const saveChannels = readline.question("Save these channels to channels.txt? (yes/no): ").toLowerCase();
  if (saveChannels === 'yes') {
    fs.writeFileSync("channels.txt", channelIds.join('\n'));
    console.log(chalk.green("[✓] Channels saved to channels.txt"));
  }
}

if (channelIds.length === 0) {
  console.log(chalk.red("[✗] No channels specified. Exiting..."));
  process.exit(1);
}

// Settings
const deleteOption = readline.question("Delete messages after sending? (yes/no): ").toLowerCase() === 'yes';
const sendDelay = parseInt(readline.question("Set message sending delay (in seconds, min 5): ") || "10") * 1000;
let deleteDelay = 0;
let afterDeleteDelay = 0;

if (deleteOption) {
    deleteDelay = parseInt(readline.question("Set message deletion delay (in seconds): ") || "30") * 1000;
    afterDeleteDelay = parseInt(readline.question("Set delay after deletion (in seconds): ") || "5") * 1000;
}

// Load Discord tokens
let tokens = [];
try {
  if (fs.existsSync("token.txt")) {
    tokens = fs.readFileSync("token.txt", "utf-8")
      .split('\n')
      .map(token => token.trim())
      .filter(token => token.length > 0);
    
    console.log(chalk.green(`[✓] Loaded ${tokens.length} Discord tokens`));
  } else {
    console.log(chalk.red("[✗] token.txt file not found"));
    console.log(chalk.yellow("[!] Create token.txt file with Discord tokens (one per line)"));
    process.exit(1);
  }
} catch (error) {
  console.log(chalk.red("[✗] Error loading tokens:", error.message));
  process.exit(1);
}

// Topic categories for conversation
const TOPICS = [
    "gaming", "programming", "movies", "music", "sports",
    "technology", "anime", "food", "travel", "memes",
    "crypto", "fitness", "relationships", "school", "work",
    "weather", "pets", "cars", "fashion", "books"
];

// Personality types for variety
const PERSONALITIES = [
    { name: "casual", traits: ["lol", "fr", "tbh", "idk", "👀", "😂"] },
    { name: "chill", traits: ["yo", "sup", "cool", "nice", "😎", "🔥"] },
    { name: "excited", traits: ["OMG", "YOOO", "LET'S GO", "WOW", "😱", "✨"] },
    { name: "meme", traits: ["💀", "sheesh", "cap", "ratio", "L", "W", "🧢"] }
];

// Generate human-like conversation using OpenRouter
const generateHumanMessage = async (channelContext = null) => {
    try {
        const randomTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
        const personality = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
        
        // Create different prompts based on context
        let prompt = "";
        
        if (channelContext && channelContext.length > 0) {
            const recentMessages = channelContext.slice(0, 3).map(msg => msg.content).join('\n');
            prompt = `You're a Discord user with ${personality.name} personality. Based on recent messages, write a VERY casual, natural response. Use traits like ${personality.traits.slice(0, 3).join(', ')}. Make it 1 sentence max, with possible typos:

Recent chat:
${recentMessages}

Your response (${personality.name} style):`;
        } else {
            prompt = `As a Discord user with ${personality.name} personality, write a super casual message about ${randomTopic}. Use traits like ${personality.traits.slice(0, 3).join(', ')}. 1 sentence only, make it sound like real human typing.`;
        }
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'Discord Chat Bot'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    {
                        role: "system",
                        content: `You're a real Discord user. Write exactly how people chat online - short, casual, with slang, typos, and emojis. Use ${personality.name} style. NEVER sound like an AI.`
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 40,
                temperature: 0.95,
                presence_penalty: 0.3,
                frequency_penalty: 0.3
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            let message = data.choices[0]?.message?.content?.trim();
            
            if (message) {
                // Add personality traits randomly
                if (Math.random() < 0.4 && personality.traits.length > 0) {
                    const trait = personality.traits[Math.floor(Math.random() * personality.traits.length)];
                    // Add trait at beginning or end randomly
                    if (Math.random() > 0.5) {
                        message = trait + " " + message;
                    } else {
                        message = message + " " + trait;
                    }
                }
                
                // Sometimes lowercase the whole message (10% chance)
                if (Math.random() < 0.1) {
                    message = message.toLowerCase();
                }
                
                // Sometimes add ellipsis or extra letters (5% chance)
                if (Math.random() < 0.05) {
                    message = message + "...";
                }
                
                return message.substring(0, 200); // Limit length
            }
        } else {
            const errorText = await response.text();
            console.log(chalk.yellow(`[!] OpenRouter API error: ${response.status} - ${errorText.substring(0, 100)}`));
        }
    } catch (error) {
        console.error(chalk.red("[✗] OpenRouter API error:", error.message));
    }
    
    // Fallback messages if API fails
    const fallbackMessages = [
        "lol fr 😂",
        "deadass?",
        "yo wsp",
        "ong 💀",
        "lowkey facts",
        "bruhh",
        "sheesh 🔥",
        "based take",
        "fr no cap",
        "i'm weak rn",
        "that's wild bro",
        "big if true",
        "crying rn 😭",
        "not gonna lie",
        "facts only"
    ];
    
    return fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
};

// Get recent messages from channel for context
const getChannelContext = async (channelId, token) => {
    try {
        const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages?limit=5`, {
            headers: { 'Authorization': token }
        });
        
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        // Silent error handling
    }
    return [];
};

// Function to send message
const sendMessage = async (channelId, content, token) => {
    try {
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
            console.log(chalk.green(`[✓] Sent to ${channelId}: "${content}"`));
            
            if (deleteOption) {
                await new Promise(resolve => setTimeout(resolve, deleteDelay));
                await deleteMessage(channelId, messageData.id, token);
            }
            return messageData.id;
        } else if (response.status === 429) {
            const retryAfter = (await response.json()).retry_after;
            console.log(chalk.yellow(`[!] Rate limited, waiting ${retryAfter}s`));
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            return sendMessage(channelId, content, token);
        } else {
            console.log(chalk.red(`[✗] Send failed: ${response.status}`));
        }
    } catch (error) {
        console.error(chalk.red("[✗] Send error:", error.message));
    }
    return null;
};

// Function to delete message
const deleteMessage = async (channelId, messageId, token) => {
    try {
        const delResponse = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages/${messageId}`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        if (delResponse.ok) {
            console.log(chalk.blue(`[✓] Deleted message ${messageId}`));
        } else {
            console.log(chalk.yellow(`[!] Delete failed: ${delResponse.status}`));
        }
        await new Promise(resolve => setTimeout(resolve, afterDeleteDelay));
    } catch (error) {
        console.error(chalk.red("[✗] Delete error:", error.message));
    }
};

// Test OpenRouter API connection
const testOpenRouterConnection = async () => {
    console.log(chalk.cyan("\n🔌 Testing OpenRouter API connection..."));
    
    try {
        const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(chalk.green(`[✓] API Key valid - ${data.data?.label || 'No label'}`));
            console.log(chalk.green(`[✓] Credits: $${data.data?.credits || 'Unknown'}`));
            return true;
        } else {
            console.log(chalk.red(`[✗] API Key invalid: ${response.status}`));
            return false;
        }
    } catch (error) {
        console.log(chalk.red("[✗] Connection test failed:", error.message));
        return false;
    }
};

// Main execution
(async () => {
    console.log(chalk.cyan("\n" + "=".repeat(50)));
    console.log(chalk.yellow("🤖 AI Discord Message Generator"));
    console.log(chalk.cyan("=".repeat(50)));
    
    // Test API connection
    const apiValid = await testOpenRouterConnection();
    if (!apiValid) {
        const proceed = readline.question("API test failed. Continue anyway? (yes/no): ").toLowerCase();
        if (proceed !== 'yes') {
            process.exit(1);
        }
    }
    
    console.log(chalk.green(`\n✅ Configuration Complete!`));
    console.log(chalk.white(`📊 Channels: ${channelIds.length}`));
    console.log(chalk.white(`🤖 Model: ${MODEL}`));
    console.log(chalk.white(`⏱️  Delay: ${sendDelay / 1000}s`));
    console.log(chalk.white(`🗑️  Auto-delete: ${deleteOption ? 'Yes' : 'No'}`));
    console.log(chalk.white(`🔑 Tokens: ${tokens.length}`));
    console.log(chalk.cyan("=".repeat(50)));
    
    const start = readline.question("\nPress Enter to start, or type 'stop' to exit: ");
    if (start.toLowerCase() === 'stop') {
        console.log(chalk.yellow("[!] Exiting..."));
        process.exit(0);
    }
    
    console.log(chalk.green("\n🚀 Starting message generation..."));
    console.log(chalk.yellow("[!] Press Ctrl+C to stop at any time\n"));
    
    let messageCount = 0;
    let errorCount = 0;
    
    while (true) {
        for (const token of tokens) {
            for (const channelId of channelIds) {
                try {
                    messageCount++;
                    console.log(chalk.cyan(`\n📨 [${messageCount}] Channel: ${channelId}`));
                    
                    // Get context
                    const context = await getChannelContext(channelId, token);
                    
                    // Generate message
                    console.log(chalk.yellow("[AI] Generating..."));
                    const message = await generateHumanMessage(context);
                    
                    console.log(chalk.green("[AI]:") + chalk.white(` ${message}`));
                    
                    // Send message
                    await sendMessage(channelId, message, token);
                    
                    // Wait before next message
                    if (sendDelay > 0) {
                        console.log(chalk.gray(`⏳ Waiting ${sendDelay / 1000}s...`));
                        await new Promise(resolve => setTimeout(resolve, sendDelay));
                    }
                    
                    errorCount = 0; // Reset error count on success
                    
                } catch (error) {
                    errorCount++;
                    console.error(chalk.red(`[✗] Error (${errorCount}/5):`, error.message));
                    
                    if (errorCount >= 5) {
                        console.log(chalk.red("[!] Too many errors. Pausing for 60 seconds..."));
                        await new Promise(resolve => setTimeout(resolve, 60000));
                        errorCount = 0;
                    } else {
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                }
            }
        }
        
        // Cycle complete
        console.log(chalk.magenta("\n♻️  Cycle complete. Starting next cycle..."));
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
})();
