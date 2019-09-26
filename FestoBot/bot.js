const {
    ActivityHandler
    // MessageFactory,
    // CardFactory
} = require("botbuilder");
const {
    LuisRecognizer
} = require("botbuilder-ai");
// var Store = require("./store");
const { DialogSet, DialogTurnStatus } = require("botbuilder-dialogs");
const { QnADialog } = require("./dialogs/qna-dialog");

class FestoBot extends ActivityHandler {
    constructor (conversationState, userState) {
        super();

        // store for dialog and user state
        this.conversationState = conversationState;
        this.userState = userState;
        this.dialogState = conversationState.createProperty("DialogState");
        this.qnaDialog = new QnADialog(this.dialogState);
        this.dialogSet = new DialogSet(this.dialogState);
        this.dialogSet.add(this.qnaDialog); // TODO: add further dialogs for tickets etc.
        this.onMessage(async (context, next) => {
            var endpointLuis = {
                applicationId: "e3ed9236-2b5e-45ee-8eac-0f167760ee7c",
                endpointKey: "7719b427d93d4fdd9722766c75b85f3e",
                endpoint: "https://westeurope.api.cognitive.microsoft.com/luis/v2.0/apps/e3ed9236-2b5e-45ee-8eac-0f167760ee7c?verbose=true&timezoneOffset=0&subscription-key=7719b427d93d4fdd9722766c75b85f3e&q="
            };

            var recognizer = null;
            const luisIsConfigured = endpointLuis && endpointLuis.applicationId && endpointLuis.endpointKey && endpointLuis.endpoint;
            if (luisIsConfigured) {
                recognizer = new LuisRecognizer(endpointLuis, {}, true);
            }
            var recognizerResult = await recognizer.recognize(context);
            var topIntent = LuisRecognizer.topIntent(recognizerResult);
            if (!topIntent || topIntent === "") {
                topIntent = "None";
            }

            let dialogContext = await this.dialogSet.createContext(context);
            let results = await dialogContext.continueDialog();

            switch (topIntent) {
            case "help":
                await context.sendActivity(`Happy to help you '${topIntent}'`);
                break;
            case "CreateTicket":
                // #TODO
                break;
            case "ContactHelpdesk":
                // #TODO
                break;
            case "QnAMaker": {
                // Run the Dialog with the new message Activity.
                // Shout be outside the switch statement. Cases just for dialog stack management
                if (results.status === DialogTurnStatus.empty) {
                    // this.qnaDialog.resultArray = test; // TODO: how to set member variable for result?
                    await dialogContext.beginDialog(this.qnaDialog.id);
                }
                // await this.qnaMakerDialog(context, resultArray);
                break;
            }
            default:
                dialogContext = await this.dialogSet.createContext(context);
                results = await dialogContext.continueDialog();
                break;
            }

            await next();
        });
        // Initial Conversation starter
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity("Hello and welcome!");
                }
            } /* By calling next() you ensure that the next BotHandler is run. */
            await next();
        });

        this.onDialog(async (context, next) => {
            /* Save any state changes. The load happened during the execution of the Dialog. */
            await this.conversationState.saveChanges(context, false);
            await this.userState.saveChanges(context, false);

            /* By calling next() you ensure that the next BotHandler is run. */
            await next();
        });

        /*
        this.qnaMakerDialog = async function (context, resultArray) {
            if (resultArray.length) { // If > 0 possible answers exist
                // Display top1 answer
                await context.sendActivity("Take a look at article: " + resultArray[0].answer);

                await context.sendActivity("Did this answer solve your problem?");
            } else { // Handle no results from QnA Maker
                await context.sendActivity("Sorry, no answers in our database matched your question. Try to adjust the question. If you want to create a support ticket, type 'ticket'.");
            }
        };
        */
    }
}
module.exports.FestoBot = FestoBot;
