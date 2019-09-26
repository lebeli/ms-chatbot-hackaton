// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const {
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    ConfirmPrompt,
    DialogSet,
    DialogTurnStatus,    
    TextPrompt,
    WaterfallDialog
} = require("botbuilder-dialogs");

const TICKET_WATERFALL_DIALOG = "TICKET_WATERFALL_DIALOG";
const ROOT_DIALOG_ID = "TICKET_ID"; // purpose?

const COMPANY_ID_PROMPT = "COMPANY_ID_PROMPT";
const TITLE_PROMPT = "TITLE_PROMPT";
const CONTENT_PROMPT = "CONTENT_PROMPT";
// const CREATE_TICKET = "CREATE_TICKET";
const CONFIRM_PROMPT = "CONFIRM_PROMPT";

class TicketDialog extends ComponentDialog {
    constructor (userState) {
        super(ROOT_DIALOG_ID);

        // this.userProfile = userState.createProperty(USER_PROFILE);

        this.addDialog(new TextPrompt(COMPANY_ID_PROMPT));
        this.addDialog(new TextPrompt(TITLE_PROMPT));
        this.addDialog(new TextPrompt(CONTENT_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));

        this.addDialog(new WaterfallDialog(TICKET_WATERFALL_DIALOG, [
            this.companyStep.bind(this),
            this.titleStep.bind(this),
            this.contentStep.bind(this),
            this.confirmStep.bind(this)
        ]));

        this.initialDialogId = TICKET_WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    async run (turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }


    async companyStep (step) {
        return step.prompt(COMPANY_ID_PROMPT, "What is your company id?");
    }

    async titleStep (step) {
        this.ticket = {};
        this.ticket.companyid = step.result;

        // We can send messages to the user at any point in the WaterfallStep.
        // await step.context.sendActivity(`Thanks ${step.result}.`);

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        return step.prompt(TITLE_PROMPT, "Please enter your ticket title:");
    }

    async contentStep (step) {
        // ticket title
        this.ticket.title = step.result;

        // We can send messages to the user at any point in the WaterfallStep.
        // await step.context.sendActivity(`Thanks ${step.result}.`);

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        return step.prompt(TITLE_PROMPT, "Please describe your ticket as detailed as possible:");
    }

    async confirmStep (step) {
        // get ticket - content from previous step
        this.ticket.content = step.result;
        // We can send messages to the user at any point in the WaterfallStep.
        // await step.context.sendActivity("");

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is a Prompt Dialog.
        return step.prompt(CONFIRM_PROMPT, { prompt: "Is this okay?" });
    }
}

module.exports.TicketDialog = TicketDialog;
