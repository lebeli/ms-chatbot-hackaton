/*
const {
    InputHints, MessageFactory
} = require("botbuilder");
*/
const {
    ComponentDialog, WaterfallDialog, DialogSet, DialogTurnStatus,
    TextPrompt
} = require("botbuilder-dialogs");

const ROOT_DIALOG_ID = "ROOT_TICKET_ID";
const COMPANY_ID_PROMPT = "COMPANY_ID_PROMPT";
const TITLE_PROMPT = "TITLE_PROMPT";
const CONTENT_PROMPT = "CONTENT_PROMPT";
// const VERIFY_TICKET = "VERIFY_TICKET";
const TICKET_STATE = "TICKET_STATE";

class TicketDialog extends ComponentDialog {
    constructor (userState) {
        super(ROOT_DIALOG_ID);

        // wir haben einen User Context
        console.log(userState);
        // zusätzlich einen neuen Context, extra für die Ticket-Erstellung
        this.userProfile = userState.createProperty(TICKET_STATE);

        this.addDialog(new TextPrompt(COMPANY_ID_PROMPT));
        this.addDialog(new TextPrompt(TITLE_PROMPT));
        this.addDialog(new TextPrompt(CONTENT_PROMPT));

        this.addDialog(new WaterfallDialog(ROOT_DIALOG_ID, [
            this.companyIdPrompt.bind(this)
        ]
        ));

        this.initialDialogId = ROOT_DIALOG_ID;
    }

    async run (turnContext, accessor) {
        const dialogSet = new DialogSet(accessor); // TODO 1.
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async companyIdPrompt (step) {
        step.values.companyid = await step.prompt(this.COMPANY_ID_PROMPT, "Please enter your company ID.");
    }

    async confirmStep (step) {
        step.values.age = step.result;

        // We can send messages to the user at any point in the WaterfallStep.
        await step.context.sendActivity("Is this the correct ticket?");

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is a Prompt Dialog.
        return step.prompt(this.CONFIRM_PROMPT, { prompt: "Is this okay?" });
    }

    async restartDialog (step) {
        return step.replaceDialog(this.MANAGE_PRODUCTS_DIALOG_ID);
    }

    async getBasket (context) {
        var basket = await this.dialogState.get(context, {});

        if (!basket.products) {
            basket.products = [];
        }

        return basket;
    }
}

module.exports.TicketDialog = TicketDialog;
