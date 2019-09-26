// This loads the environment variables from the .env file
require("dotenv-extended").load();

const { BotFrameworkAdapter, ConversationState, InputHints, MemoryStorage, UserState } = require("botbuilder");

var restify = require("restify");
const { FestoBot } = require("./bot");
// Create HTTP server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log(`\n${server.name} listening to ${server.url}`);
});

// Create an adapter to connect to the bot framework
const adapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights.
    console.error(`\n [onTurnError]: ${error}`);
    // Send a message to the user
    const onTurnErrorMessage = "Sorry, it looks like something went wrong!";
    await context.sendActivity(onTurnErrorMessage, onTurnErrorMessage, InputHints.ExpectingInput);
};
/* For local development, in-memory storage is used. */
// A bot requires a state store to persist the dialog and user state between messages.
const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

// Create bot
const bot = new FestoBot(conversationState, userState);

// Listen for incoming activities and route them to your bot main dialog.
server.post("/api/messages", (req, res) => {
    // Route received a request to adapter for processing
    adapter.processActivity(req, res, async (turnContext) => {
        // route to bot activity handler.
        await bot.run(turnContext);
    });
});
