// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const {
    ComponentDialog,
    ConfirmPrompt,
    DialogSet,
    DialogTurnStatus,
    TextPrompt,
    WaterfallDialog
} = require("botbuilder-dialogs");
const { CardFactory } = require("botbuilder");

const TICKET_WATERFALL_DIALOG = "TICKET_WATERFALL_DIALOG";
const ROOT_DIALOG_ID = "TICKET_ID"; // purpose?

const COMPANY_ID_PROMPT = "COMPANY_ID_PROMPT";
const TITLE_PROMPT = "TITLE_PROMPT";
const CONTENT_PROMPT = "CONTENT_PROMPT";
// const CREATE_TICKET = "CREATE_TICKET";
const CONFIRM_PROMPT = "CONFIRM_PROMPT";
const TicketCard = require("../resources/TicketCard.json");

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
            this.summaryStep.bind(this)
            /* this.confirmStep.bind(this) */
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
        step.values.companyID = await step.result;

        // We can send messages to the user at any point in the WaterfallStep.
        // await step.context.sendActivity(`Thanks ${step.result}.`);

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        return step.prompt(TITLE_PROMPT, "Please enter your ticket title:");
    }

    async contentStep (step) {
        // ticket title
        step.values.title = await step.result;

        // We can send messages to the user at any point in the WaterfallStep.
        // await step.context.sendActivity(`Thanks ${step.result}.`);

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        return step.prompt(TITLE_PROMPT, "Please describe your ticket as detailed as possible:");
    }

    async summaryStep (step) {
        step.values.content = await step.result;
        if (step.result) {
            // Get the current profile object from user state.
            // const userProfile = await this.userProfile.get(step.context, new UserProfile());

            const id = step.values.companyID;
            const title = step.values.title;
            const content = step.values.content;

            // const msg = `Title: ${title} \n\n Company Id: ${id} \n\n Content: ${content} .`;

            // await step.context.sendActivity(msg);
            TicketCard.body[3].value = id;
            TicketCard.body[5].value = title;
            TicketCard.body[7].value = content;

            await step.context.sendActivity({
                text: "Here is your Ticket:",
                attachments: [CardFactory.adaptiveCard(TicketCard)]
            });
        } else {
            await step.context.sendActivity("Thanks. Your profile will not be kept.");
        }
        return step.endDialog();
        // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is the end.
    }

    async confirmStep (step) {
        // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is a Prompt Dialog.
        return step.prompt(CONFIRM_PROMPT, "Thanks your ticket has been sent!");
        // await step.context.sendActivity("Thanks your ticket has been sent!");
        // return step.endDialog();
    }
}

module.exports.TicketDialog = TicketDialog;
