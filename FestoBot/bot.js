const {
    ActivityHandler,
    MessageFactory,
    CardFactory
} = require('botbuilder');
const {
    LuisRecognizer
} = require('botbuilder-ai');
var Store = require('./store');
const { QnAMaker } = require('botbuilder-ai');
const { TicketDialog } = require('./dialogs/ticket-dialog');
const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');

class FestoBot extends ActivityHandler {
    constructor(conversationState, userState) {
        super();
        const endpointQnA = {
            knowledgeBaseId: "8b28463a-ad6f-45fc-9cba-789a2d935b1f",
            endpointKey: "4ccf2f7f-ecb6-4923-994c-8121615eca4e",
            host: "https://festokb.azurewebsites.net/qnamaker"
        };
        this.qnaService = new QnAMaker(endpointQnA, {});
        this.conversationState = conversationState;
        this.userState = userState;
        this.dialogState = conversationState.createProperty('DialogState');
    
        

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
            if (!topIntent || topIntent == "") {
                topIntent = "None";
            }

            switch (topIntent) {
                case 'help':
                    await context.sendActivity(`Happy to help you '${topIntent}'`);
                    break;
                case 'CreateTicket':
                    this.ticketDialog = new TicketDialog(this.dialogState);
                    this.ticketDialog.add(this.dialog);
                    break;
                case 'ContactHelpdesk':
                    // #TODO
                    break;
                case 'QnAMaker':
                    let result = await this.searchKnowledgeBase(context);
                        if (result.length) {
                            console.log(result);
                            await context.sendActivity(result[0].answer);
                            
                        } else {
                            await context.sendActivity("I cannot answer your question.");
                        }
                    break;
                
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
                    await context.sendActivity('Hello and welcome!');
                }
            } /* By calling next() you ensure that the next BotHandler is run. */
            await next();
        });
        this.searchKnowledgeBase = async function(context) {
            var qnaResult = await this.qnaService.getAnswers(context);
            return qnaResult;
            // console.log(context);
            // if (qnaResult.length) {
            //     await context.sendActivity(qnaResult[0].answer);
            // } else {
            //     await context.sendActivity("I cannot answer your question.");
            // }
            // await next();

        }
        this.onDialog(async (context, next) => {
            /* Save any state changes. The load happened during the execution of the Dialog. */
            await this.conversationState.saveChanges(context, false);
            await this.userState.saveChanges(context, false);

            /* By calling next() you ensure that the next BotHandler is run. */
            await next();
        });
    }
}
module.exports.FestoBot = FestoBot;