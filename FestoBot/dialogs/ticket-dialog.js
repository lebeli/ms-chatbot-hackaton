/* eslint-disable no-return-await */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const {
    ComponentDialog,
    ActivityPrompt,
    DialogSet,
    DialogTurnStatus,
    TextPrompt,
    WaterfallDialog
} = require("botbuilder-dialogs");
const { CardFactory, MessageFactory } = require("botbuilder");

const TICKET_WATERFALL_DIALOG = "TICKET_WATERFALL_DIALOG";
const ROOT_DIALOG_ID = "TICKET_ID"; // purpose?

const COMPANY_ID_PROMPT = "COMPANY_ID_PROMPT";
const TITLE_PROMPT = "TITLE_PROMPT";
const CONTENT_PROMPT = "CONTENT_PROMPT";
const SUMMARY_PROMPT = "SUMMARY_PROMPT";
const CARD_PROMPT = "CARD_PROMPT";
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
        this.addDialog(new TextPrompt(SUMMARY_PROMPT));
        this.addDialog(new ActivityPrompt(CARD_PROMPT, this.inputValidator));
        // this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));

        this.addDialog(new WaterfallDialog(TICKET_WATERFALL_DIALOG, [
            this.companyStep.bind(this),
            this.titleStep.bind(this),
            this.contentStep.bind(this),
            this.summaryStep.bind(this),
            this.showUserInputStep.bind(this)
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
        if (turnContext._activity.text == null &&
            turnContext._activity.value.text != null) {
            this.logger.log("replacing null text with Activity Card text input");
            turnContext._activity.text = turnContext._activity.value.text;
        }

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async companyStep (step) {
        return await step.prompt(COMPANY_ID_PROMPT, "What is your company id?");
    }

    async titleStep (step) {
        step.values.companyID = step.result;

        // We can send messages to the user at any point in the WaterfallStep.
        // await step.context.sendActivity(`Thanks ${step.result}.`);

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        return await step.prompt(TITLE_PROMPT, "Please enter your ticket title:");
    }

    async contentStep (step) {
        // ticket title
        step.values.title = step.result;

        // We can send messages to the user at any point in the WaterfallStep.
        // await step.context.sendActivity(`Thanks ${step.result}.`);

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        return await step.prompt(CONTENT_PROMPT, "Please describe your ticket as detailed as possible:");
    }

    async summaryStep (step) {
        step.values.content = step.result;
        // if (step.result) {
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

        const inputForm = MessageFactory.attachment(CardFactory.adaptiveCard(TicketCard));
        return await step.prompt(CARD_PROMPT, {
            prompt: inputForm
        });

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is the end.
    }

    async showUserInputStep (step) {
        const userInput = step.result.value;
        if (userInput) {
            if (userInput.submit === true) {
                await step.context.sendActivity(`Ticket with following content has been sent to the support: 
                \n\n  Company Id: ${userInput.companyID} \n\n Title: ${userInput.titleID} \n\n Message: ${userInput.messageID}`);
            } else {
                await step.context.sendActivity("Your Ticket has been cancelled!");
            }
        }
        return await step.endDialog();
    }

    async confirmStep (step) {
        // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is a Prompt Dialog.
        return step.prompt(CONFIRM_PROMPT, "Thanks your ticket has been sent!");
        // await step.context.sendActivity("Thanks your ticket has been sent!");
        // return step.endDialog();
    }

    async inputValidator (promptContext) {
        // eslint-disable-next-line no-unused-vars
        const userInputObject = promptContext.recognized.value.value;

        // You can add some validation logic for email address and phone number
        // userInputObject.myEmail, userInputObject.myTel

        return true;
    }
}

module.exports.TicketDialog = TicketDialog;
