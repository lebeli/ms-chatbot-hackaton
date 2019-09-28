const {
    ActivityHandler,
    ActionTypes
    // MessageFactory,
    // CardFactory
} = require("botbuilder");
const {
    LuisRecognizer
} = require("botbuilder-ai");
// var Store = require("./store");
const {
    QnAMaker
} = require("botbuilder-ai");
const {
    TicketDialog
} = require("./dialogs/ticket-dialog");
const {
    DialogSet,
    DialogTurnStatus
} = require("botbuilder-dialogs");
const {
    QnADialog
} = require("./dialogs/qna-dialog");
const {
    HelpDialog
} = require("./dialogs/help-dialog");

const {
    AzureStorageHelper
} = require("./services/azurestorage");



class FestoBot extends ActivityHandler {
    constructor (conversationState, userState) {
        super();

        // store for dialog and user state
        this.conversationState = conversationState;
        this.userState = userState;

        // store information within a dialog -> example for storage: this.dialogState.userName = "Franz Franzhausen"
        this.dialogState = conversationState.createProperty("DialogState");
        this.dialogState.qna_results = [];
        this.dialogState.presented_results = [];
        this.dialogState.question = "";
        this.dialogState.question_specification = [];

        this.qnaDialog = new QnADialog(this.dialogState);
        this.ticketDialog = new TicketDialog(this.dialogState);
        this.helpDialog = new HelpDialog(this.dialogState);
        this.dialogSet = new DialogSet(this.dialogState);
        this.dialogSet.add(this.qnaDialog); // TODO: add further dialogs for tickets etc.
        this.dialogSet.add(this.ticketDialog);
        this.dialogSet.add(this.helpDialog);

        this.onMessage(async (context, next) => {
            var endpointLuis = {
                applicationId: "e3ed9236-2b5e-45ee-8eac-0f167760ee7c",
                endpointKey: "95866d1b04244934899cc84729cc7c4c",
                endpoint: "https://westeurope.api.cognitive.microsoft.com/luis/v2.0/apps/e3ed9236-2b5e-45ee-8eac-0f167760ee7c?verbose=true&timezoneOffset=0&subscription-key=95866d1b04244934899cc84729cc7c4c&q="
            };

            let recognizer = null;
            const luisIsConfigured = endpointLuis && endpointLuis.applicationId && endpointLuis.endpointKey && endpointLuis.endpoint;
            if (luisIsConfigured) {
                recognizer = new LuisRecognizer(endpointLuis, {}, true);
            }
            const recognizerResult = await recognizer.recognize(context);
            var topIntent = LuisRecognizer.topIntent(recognizerResult);
            
            if (!topIntent || topIntent === "") {
                topIntent = "None";
            }

            // dialog context starts or continues dialogs in a dialog set
            let dialogContext = await this.dialogSet.createContext(context);
            // contains information from the dialog to store it if needed
            let results = await dialogContext.continueDialog();

            switch (topIntent) {
            case "Utilities_Help":
                // await this.helpDialog.run(context, this.dialogState);
                // await context.sendActivity(`Happy to help you '${topIntent}'`);
                
                if (results.status === DialogTurnStatus.empty) {
                    await dialogContext.beginDialog(this.helpDialog.id);
                }
                break;
            case "CreateTicket":
                // jetzt müssen wir ein ticket starten
                // await this.ticketDialog.run(context, this.dialogState);

                // const dialogContext = await dialogSet.createContext(turnContext);
                // const results = await dialogContext.continueDialog();
                if (results.status === DialogTurnStatus.empty) {
                    await dialogContext.beginDialog(this.ticketDialog.id);
                }

                await next();
                break;
            case "ContactHelpdesk":
                // #TODO
                break;
            case "QnAMaker": {
                // Run the Dialog with the new message Activity.
                // Shout be outside the switch statement. Cases just for dialog stack management
                if (results.status === DialogTurnStatus.empty) {
                    // persist initial question
                    this.dialogState.question = context.activity.text;
                    await dialogContext.beginDialog(this.qnaDialog.id);
                } 
                /*
                else {
                    // user has specified his problem in the qna-dialog
                    this.dialogState.new_input = true;
                    this.dialogState.question_specification.push(context.activity.text);
                }
                */
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
                    await context.sendActivity("Hi, How can i help you with your IT problem?");
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
    }
}
module.exports.FestoBot = FestoBot;
