import { Telegraf } from "telegraf";
import userModel from "./src/models/user.js";
import connectdb from "./src/config/db.js";
import eventModel from "./src/models/event.js";
import { message } from "telegraf/filters";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();


 

// make a instance of bot 
const bot = new Telegraf(process.env.TELEGRAM_BOT_API_TOKEN);
const openai = new OpenAI({  
  apiKey: process.env["OPENAI_API_KEY"], // This is the default and can be omitted
});
try { 
  connectdb();
} catch (err) {
  process.kill(process.pid, "SIGTERM");
}



bot.start(async (ctx) => {
  const from = ctx.update.message.from;
  // let greeting = getRandomGreeting();
  let greeting = "Hey there!";

  try {
    await userModel.findOneAndUpdate(
      { tgId: from.id },
      {
        $setOnInsert: {
          firstName: from.first_name,
          lastName: from.last_name,
          isBot: from.is_bot,
          userName: from.username,
        },
      },
      { upsert: true, new: true }
    );

    await ctx.replyWithHTML(
      `${greeting} <b>${from.first_name}</b>\nWelcome to your personal social media magic maker! ✨ I'm here to turn your daily happenings into captivating posts that'll grab attention.\nJust feed me with the latest updates, and let's make waves on social media together! 🌊`
    );
  } catch (err) {

    await ctx.reply("Something went wrong! Please try again later.");
  }
});
 
// ______________________________________________________________________________________________
bot.command("generate", async (ctx) => {

  const from = ctx.update.message.from;

  const { message_id: messageId } = await ctx.reply(
    `Hey ${from.first_name}! Let me generate the posts for you. Please wait...`
  );

  const { message_id: stickerId } = await ctx.replyWithSticker(
    "CAACAgIAAxkBAANbZghTRG2e4z8pJTKOhMHFe-gJ3m8AAmwCAAJWnb0KKhlenMTQ3p80BA"
  );

  const startOfTheDay = new Date();
  startOfTheDay.setHours(0, 0, 0, 0);

  const endOfTheDay = new Date();
  endOfTheDay.setHours(23, 59, 59, 999);

  // get evnet from the database_____________________________________________________
  const events = await eventModel.find({
    tgId: from.id,
    createdAt: {
      $gte: startOfTheDay,
      $lt: endOfTheDay,
    },
  });

  if (events.length === 0) {
    await ctx.deleteMessage(messageId);
    await ctx.deleteMessage(stickerId);
    await ctx.reply(
      "You haven't shared any thoughts with me today. Share your thoughts to generate posts."
    );
    return;
  }

  //   make openai call____________________________________________
  try {
    const chatCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Act as a senior copywriter, you write highly engaging posts for linkedin, facebook and twitter using provided thoughts/events throught the day.",
        },
        {
          role: "user",
          content: `Write like a human, for humans. Craft three engaging social media posts tailored for LinkedIn, Facebook, and Twitter audiences. Use simple language. Use given time labels just to understand the order of the event, don't mention the time in the posts. Each post should creatively highlight the following events. Ensure the tone is conversational and impactful. Focus on engaging the respective platform's audience, encouraging interaction, and driving interest in the events:
            ${events.map((event) => event.text).join(", ")}`,
        },
      ],

      model: process.env.OPENAI_MODEL,
    });
 
    // store token count
    await userModel.findOneAndUpdate(
      {
        tgId: from.id,
      },
      {
        $inc: {
          promptToken: chatCompletion.usage.prompt_tokens,
          completionToken: chatCompletion.usage.completion_tokens,
        },
      }
    );

    await ctx.deleteMessage(messageId);
    await ctx.deleteMessage(stickerId);
    await ctx.reply(chatCompletion.choices[0].message.content);
    // console.log(chatCompletion);
  } catch (error) {
    // console.log(error);
    await ctx.deleteMessage(messageId);
    await ctx.deleteMessage(stickerId);
    await ctx.reply(
      "You exceeded your current quota of tokens. Please try again later"
    );
  }
  // send response to the user
});


// write help command_________________________________________________________________________________
bot.help((ctx) => {
  ctx.replyWithHTML(
    `Welcome to the help section!\n\nHere are the commands you can use:\n\n/start - Start the bot\n/generate - Generate social media posts\n\nJust text me your thoughts and I'll help you generate posts for your social media accounts.
    \n\nFor more information, you can visit my <a href="https://www.linkedin.com/in/rahul-yadav-482156223/">LinkedIn</a> profile
    `
  );
});



/* bot.on("sticker", (ctx) => {
  console.log('sticker', ctx.update.message.sticker);
});
 */

//messages_________________________________________________________________________________
bot.on(message("text"), async (ctx) => {
  const from = ctx.update.message.from;
  const text = ctx.update.message.text;

  try {
    await eventModel.create({
      text: text,
      tgId: from.id,
    });
    await ctx.replyWithHTML(
      `Noted 👍, <b>${from.first_name}</b>!  Keep texting me your thoughts.\nTo generate the posts, just enter the command: /generate`
    );
  } catch (error) {
    await ctx.reply("Something went wrong! Please try again later.");
  }
});

bot.launch();

// Enable graceful stop 
// A graceful stop is when the bot is stopped without abruptly ending the process or interrupting the current operation.
process.once("SIGINT", () => bot.stop("SIGINT"));
// The SIGINT signal is sent to a process by its controlling terminal when a user wishes to interrupt the process. This is typically initiated by pressing Ctrl+C. 
process.once("SIGTERM", () => bot.stop("SIGTERM"));
