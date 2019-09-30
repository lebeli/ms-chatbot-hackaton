/* eslint-disable no-return-await */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const {
    ComponentDialog,
    ActivityPrompt,
    // ChoicePrompt,
    DialogSet,
    DialogTurnStatus,
    TextPrompt,
    ConfirmPrompt,
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
// const CHOICE_PROMPT = "CHOICE_PROMPT";
const CONFIRM_PROMPT = "CONFIRM_PROMPT";
const TicketCard = require("../resources/TicketCard.json");

class TicketDialog extends ComponentDialog {
    constructor (state) {
        super(ROOT_DIALOG_ID);
        this.addDialog(new TextPrompt(COMPANY_ID_PROMPT));
        this.addDialog(new TextPrompt(TITLE_PROMPT));
        this.addDialog(new TextPrompt(CONTENT_PROMPT));
        this.addDialog(new TextPrompt(SUMMARY_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new ActivityPrompt(CARD_PROMPT, this.inputValidator));
        this.state = state;

        this.addDialog(new WaterfallDialog(TICKET_WATERFALL_DIALOG, [
            this.companyStep.bind(this),
            this.titleStep.bind(this),
            this.confirmQuestion.bind(this),
            this.contentStep.bind(this),
            this.summaryStep.bind(this),
            this.showUserInputStep.bind(this)
        ]));

        this.initialDialogId = TICKET_WATERFALL_DIALOG;
    }

    async companyStep (step) {
        return await step.prompt(COMPANY_ID_PROMPT, "Create Ticket: What is your company id?");
    }

    async titleStep (step) {
        step.values.companyID = step.result;

        return await step.prompt(TITLE_PROMPT, "Please enter a title for your ticket:");
    }

    async confirmQuestion (step) {
        step.values.title = step.result;
        this.question = await this.state.question;
        if (this.question) {
            await step.context.sendActivity(this.question);
            return await step.prompt(CONFIRM_PROMPT, "Is this your question?", ["yes", "no"]);
        } else {
            return step.next();
        }
    }

    async contentStep (step) {
        if (step.result) {
            return await step.next();
        } else {
            return await step.prompt(CONTENT_PROMPT, "Give me a brief description of the problem:");
        }
    }

    async summaryStep (step) {
        this.question = await this.state.question;
        if (!step.result) {
            this.content = this.question;
        } else {
            this.content = step.result;
        }
        const id = step.values.companyID;
        const title = step.values.title;
        
        TicketCard.body[3].value = id;
        TicketCard.body[5].value = title;
        TicketCard.body[7].value = this.content;

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

    async inputValidator (promptContext) {
        // eslint-disable-next-line no-unused-vars
        const userInputObject = promptContext.recognized.value.value;

        // You can add some validation logic for email address and phone number
        // userInputObject.myEmail, userInputObject.myTel

        return true;
    }
}

module.exports.TicketDialog = TicketDialog;
