const {
    ActivityHandler
    // MessageFactory,
    // CardFactory
} = require("botbuilder");
const {
    LuisRecognizer
} = require("botbuilder-ai");
// var Store = require("./store");
const { QnAMaker } = require("botbuilder-ai");

class FestoBot extends ActivityHandler {
    constructor () {
        super();
        const endpointQnA = {
            knowledgeBaseId: "8b28463a-ad6f-45fc-9cba-789a2d935b1f",
            endpointKey: "4ccf2f7f-ecb6-4923-994c-8121615eca4e",
            host: "https://festokb.azurewebsites.net/qnamaker"
        };
        this.qnaService = new QnAMaker(endpointQnA, {});
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
                const resultArray = await this.getTop5QnAMakerResults(context);
                await this.qnaMakerDialog(context, resultArray);
                break;
            }
            default:
                await context.sendActivity(`Top intent is '${topIntent}'`);
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

        this.getTop5QnAMakerResults = async function (context) {
            var qnaMakerOptions = {
                ScoreThreshold: 0.0, // Default is 0.3
                Top: 5 // Get 5 best answers
            };
            var result = await this.qnaService.getAnswers(context, qnaMakerOptions);
            return result;
        };

        this.qnaMakerDialog = async function (context, resultArray) {
            if (resultArray.length) { // If > 0 possible answers exist
                // Display top1 answer
                await context.sendActivity("Take a look at article: " + resultArray[0].answer);

                await context.sendActivity("Did this answer solve your problem?");
            } else { // Handle no results from QnA Maker
                await context.sendActivity("Sorry, no answers in our database matched your question. Try to adjust the question. If you want to create a support ticket, type 'ticket'.");
            }
        };
    }
}
module.exports.FestoBot = FestoBot;
