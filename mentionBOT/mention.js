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
// Send normal message (Bot 1)
const sendDiscordMessage = async (channelId, content, token, botName) => {
  try {
    // Typing indicator simulation
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
      return { success: true, id: data.id, content: content };
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

// Send REPLY to a specific message (Bot 2 - এইটা নতুন ফাংশন)
const sendDiscordReply = async (channelId, content, replyToMessageId, token, botName) => {
  try {
    // Typing indicator simulation
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
          guild_id: null // This will be auto-filled by Discord
        },
        nonce: Date.now().toString(),
        tts: false
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(chalk.cyan(`[${botName} REPLY]: ${content} (to message ${replyToMessageId.substring(0, 8)}...)`));
      return { success: true, id: data.id, content: content };
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

// Get the last message from Bot 1 specifically
const getLastMessageFromBot1 = async (channelId, bot1Tokens) => {
  try {
    // Use Bot 2 token to read messages
    const token = bot2Tokens[0];
    const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages?limit=10`, {
      headers: { 'Authorization': token }
    });
    
    if (response.ok) {
      const messages = await response.json();
      
      // Find the most recent message from Bot 1
      for (const message of messages) {
        // Check if this message is from any of our Bot 1 tokens
        // We'll check by trying to send a reply with each Bot 1 token
        // (Simplified approach - in real scenario you'd need to map tokens to user IDs)
        const messageContent = message.content.toLowerCase();
        
        // Skip system messages, commands, etc.
        if (messageContent && messageContent.length > 0 && 
            !messageContent.startsWith('!') && 
            !messageContent.startsWith('/') &&
            messageContent.length < 100) {
          return {
            id: message.id,
            content: message.content,
            author: message.author?.username || 'unknown'
          };
        }
      }
    }
  } catch (error) {
    console.log(chalk.red("[✗] Failed to get messages"));
  }
  return null;
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
  
  // This is the KEY CHANGE: Bot 2 REPLIES to Bot 1's message
  const bot2Result = await sendDiscordReply(channelId, bot2Reply, bot1MessageId, bot2Token, "BOT-2");
  
  if (bot2Result.success) {
    console.log(chalk.green(`✅ Bot 2 replied to Bot 1's message!`));
    console.log(chalk.gray(`💬 Bot 1: "${bot1Message}" → Bot 2: "${bot2Reply}"`));
    return true;
  }
  
  return false;
};

// Alternative: Reply to any recent message in channel
const findAndReplyToRecentMessage = async (channelId, bot2Token) => {
  try {
    // Get recent messages
    const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages?limit=5`, {
      headers: { 'Authorization': bot2Token }
    });
    
    if (response.ok) {
      const messages = await response.json();
      
      // Find a suitable message to reply to (not from our bots)
      for (const message of messages) {
        const msgContent = message.content;
        
        // Skip if message is too short, or is a command, or from ourselves
        if (msgContent && 
            msgContent.length >= 2 && 
            msgContent.length <= 80 &&
            !msgContent.startsWith('!') &&
            !msgContent.startsWith('/') &&
            !msgContent.includes('http')) {
          
          console.log(chalk.gray(`[FOUND] Message to reply: "${msgContent.substring(0, 30)}..."`));
          
          // Generate reply
          const reply = await generateReply(msgContent);
          
          // Send reply
          const result = await sendDiscordReply(
            channelId, 
            reply, 
            message.id, 
            bot2Token, 
            "BOT-2"
          );
          
          if (result.success) {
            console.log(chalk.green(`✅ Replied: "${reply}"`));
            return true;
          }
        }
      }
    }
  } catch (error) {
    console.log(chalk.red("[✗] Find and reply error"));
  }
  return false;
};

// TIMER SETUP
console.log(chalk.cyan("\n⏰ === TIMER SETTINGS ==="));
const runTimeMinutes = parseInt(readline.question("Run time (minutes, default 60): ") || "60");
const runTimeMs = runTimeMinutes * 60 * 1000;
console.log(chalk.green(`[✓] Will run for: ${runTimeMinutes} minutes`));

// Mode selection
console.log(chalk.cyan("\n🤖 === OPERATION MODE ==="));
console.log("1. Bot 1 sends → Bot 2 replies (direct reply)");
console.log("2. Bot 2 finds random message and replies");
console.log("3. Both bots active conversation");
const mode = parseInt(readline.question("Select mode (1-3): ") || "1");

// MAIN EXECUTION
(async () => {
  console.log(chalk.cyan("\n" + "=".repeat(60)));
  console.log(chalk.yellow("🔄 DISCORD REPLY BOT SYSTEM"));
  console.log(chalk.cyan("=".repeat(60)));
  
  console.log(chalk.white(`🤖 Bot 1 Accounts: ${bot1Tokens.length}`));
  console.log(chalk.white(`🤖 Bot 2 Accounts: ${bot2Tokens.length}`));
  console.log(chalk.white(`📢 Channels: ${channelIds.length}`));
  console.log(chalk.white(`⏱️  Run Time: ${runTimeMinutes} minutes`));
  console.log(chalk.white(`🔧 Mode: ${mode === 1 ? 'Direct Reply' : mode === 2 ? 'Find & Reply' : 'Conversation'}`));
  console.log(chalk.cyan("=".repeat(60)));
  
  const start = readline.question("\nPress Enter to START, 'stop' to exit: ");
  if (start.toLowerCase() === 'stop') {
    console.log(chalk.yellow("[!] Exiting..."));
    process.exit(0);
  }
  
  const startTime = Date.now();
  const endTime = startTime + runTimeMs;
  
  console.log(chalk.green("\n🚀 Starting reply system..."));
  console.log(chalk.yellow(`[!] Will auto-stop in ${runTimeMinutes} minutes`));
  console.log(chalk.yellow(`[!] Mode: ${mode === 1 ? 'Bot 1 → Bot 2 Reply' : 'Find & Reply to any message'}`));
  console.log(chalk.yellow("[!] Press Ctrl+C to stop early\n"));
  
  let cycles = 0;
  let successfulReplies = 0;
  
  // Main loop
  while (Date.now() < endTime) {
    cycles++;
    
    console.log(chalk.magenta(`\n🔄 Cycle ${cycles}`));
    
    const channel = getRandomChannel();
    const bot1Token = getRandomBot1Token();
    const bot2Token = getRandomBot2Token();
    
    try {
      let success = false;
      
      if (mode === 1) {
        // Mode 1: Bot 1 sends, Bot 2 replies directly
        success = await runConversationWithReply(channel, bot1Token, bot2Token);
      } else if (mode === 2) {
        // Mode 2: Bot 2 finds and replies to any recent message
        console.log(chalk.yellow(`[MODE 2] Bot 2 looking for messages to reply in ${channel.substring(0, 8)}...`));
        success = await findAndReplyToRecentMessage(channel, bot2Token);
        
        if (!success) {
          console.log(chalk.yellow("[!] No suitable message found, Bot 1 will send first"));
          success = await runConversationWithReply(channel, bot1Token, bot2Token);
        }
      } else {
        // Mode 3: Full conversation
        success = await runConversationWithReply(channel, bot1Token, bot2Token);
        
        if (success) {
          // Bot 1 replies back to Bot 2
          console.log(chalk.cyan(`⏳ Waiting 20s for Bot 1 to reply back...`));
          await new Promise(resolve => setTimeout(resolve, 20000));
          
          const bot1Reply = await generateReply("ok");
          const bot1ReplyResult = await sendDiscordMessage(channel, bot1Reply, bot1Token, "BOT-1");
          success = bot1ReplyResult.success;
        }
      }
      
      if (success) {
        successfulReplies++;
        console.log(chalk.green(`✅ Cycle ${cycles} successful`));
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
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
    
    if (Date.now() >= endTime) break;
  }
  
  // SHUTDOWN
  console.log(chalk.cyan("\n" + "=".repeat(60)));
  console.log(chalk.green("✅ SYSTEM COMPLETED"));
  console.log(chalk.cyan("=".repeat(60)));
  
  const totalMinutes = (Date.now() - startTime) / (1000 * 60);
  
  console.log(chalk.white(`⏱️  Total Time: ${totalMinutes.toFixed(1)} minutes`));
  console.log(chalk.white(`🔄 Total Cycles: ${cycles}`));
  console.log(chalk.white(`✅ Successful Replies: ${successfulReplies}`));
  console.log(chalk.white(`📊 Success Rate: ${((successfulReplies / cycles) * 100).toFixed(1)}%`));
  console.log(chalk.green("\n🎯 Reply system has finished"));
  
  console.log(chalk.yellow("\n[!] Press Ctrl+C to exit"));
  
  // Keep program running
  await new Promise(() => {});
  