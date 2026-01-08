import fetch from 'node-fetch';
import readline from 'readline-sync';
import fs from 'fs';
import chalk from 'chalk';
import cfonts from 'cfonts';

// Display banner
cfonts.say('NT Exhaust', {
  font: 'block',
  align: 'center',
  colors: ['cyan', 'magenta'],
  background: 'black',
  letterSpacing: 1,
  lineHeight: 1,
  space: true,
  maxLength: '0',
});
console.log(chalk.green("=== Telegram Channel: NT Exhaust (@NTExhaust) ==="));

// Get user inputs
const channelIds = readline.question("Enter channel IDs (separate with commas for multiple channels): ").split(',').map(id => id.trim());
const deleteOption = readline.question("Delete messages after sending? (yes/no): ").toLowerCase() === 'yes';
const sendDelay = parseInt(readline.question("Set message sending delay (in seconds): ")) * 1000;
let deleteDelay = 0;
let afterDeleteDelay = 0;

if (deleteOption) {
    deleteDelay = parseInt(readline.question("Set message deletion delay (in seconds): ")) * 1000;
    afterDeleteDelay = parseInt(readline.question("Set delay after deletion (in seconds): ")) * 1000;
}

// Read tokens from file
const tokens = fs.readFileSync("token.txt", "utf-8").split('\n').map(token => token.trim());

// Function to get random comment from channel history
const getRandomComment = async (channelId, token) => {
    try {
        const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
            headers: { 'Authorization': token }
        });
        
        if (response.ok) {
            const messages = await response.json();
            if (messages.length) {
                let comment = messages[Math.floor(Math.random() * messages.length)].content;
                // Remove random character from comment (original behavior)
                if (comment.length > 1) {
                    const index = Math.floor(Math.random() * comment.length);
                    comment = comment.slice(0, index) + comment.slice(index + 1);
                }
                return comment;
            }
        }
    } catch (error) {
        // Silent error handling
    }
    return "Generated Message";
};

// Function to send message
const sendMessage = async (channelId, content, token) => {
    try {
        const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
            method: 'POST',
            headers: { 'Authorization': token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        
        if (response.ok) {
            const messageData = await response.json();
            console.log(chalk.green(`[✔] Message sent to ${channelId}: ${content}`));
            
            // Delete message if option is enabled
            if (deleteOption) {
                await new Promise(resolve => setTimeout(resolve, deleteDelay));
                await deleteMessage(channelId, messageData.id, token);
            }
            return messageData.id;
        } else if (response.status === 429) {
            // Handle rate limiting
            const retryAfter = (await response.json()).retry_after;
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            return sendMessage(channelId, content, token);
        }
    } catch (error) {
        // Silent error handling
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
            console.log(chalk.blue(`[✔] Deleted message ${messageId} in channel ${channelId}`));
        }
        await new Promise(resolve => setTimeout(resolve, afterDeleteDelay));
    } catch (error) {
        // Silent error handling
    }
};

// Main execution loop
(async () => {
    while (true) {
        for (const token of tokens) {
            for (const channelId of channelIds) {
                const randomComment = await getRandomComment(channelId, token);
                await sendMessage(channelId, randomComment, token);
                await new Promise(resolve => setTimeout(resolve, sendDelay));
            }
        }
    }
})();
