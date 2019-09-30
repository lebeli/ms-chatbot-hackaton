/* eslint-disable no-return-await */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const {
    ComponentDialog,
    ActivityPrompt,
    TextPrompt,
    ConfirmPrompt,
    WaterfallDialog
} = require("botbuilder-dialogs");
const { CardFactory, MessageFactory } = require("botbuilder");

// dialog ids
const TICKET_WATERFALL_DIALOG = "TICKET_WATERFALL_DIALOG";
const ROOT_DIALOG_ID = "TICKET_ID"; // purpose?

// prompts
const COMPANY_ID_PROMPT = "COMPANY_ID_PROMPT";
const TITLE_PROMPT = "TITLE_PROMPT";
const CONTENT_PROMPT = "CONTENT_PROMPT";
const SUMMARY_PROMPT = "SUMMARY_PROMPT";
const CARD_PROMPT = "CARD_PROMPT";
const CONFIRM_PROMPT = "CONFIRM_PROMPT";

// ticket card for adaptive cards
const TicketCard = require("../resources/TicketCard.json");

/**
 * Guide the user through the ticket creation
 */
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

    /**
     * Ask the user for the company id
     * In a real world scenario, that company can be mapped to the telephone, email, location etc.
     * @param {*} step
     */
    async companyStep (step) {
        return await step.prompt(COMPANY_ID_PROMPT, "Create Ticket: What is your company id?");
    }

    /**
     * Save the company id and prompt for the ticket title
     * @param {*} step
     */
    async titleStep (step) {
        step.values.companyID = step.result;

        return await step.prompt(TITLE_PROMPT, "Please enter a title for your ticket:");
    }

    /**
     * If the user interacted with the chatbot earlier, he might want to create a ticket
     * based on his previous question. In this step, we will ask him if he wants to input that question into the ticket
     * @param {*} step
     */
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

    /**
     * if no question was previously asked, the user should describe his problem in this step
     * @param {*} step
     */
    async contentStep (step) {
        if (step.result) {
            return await step.next();
        } else {
            return await step.prompt(CONTENT_PROMPT, "Give me a brief description of the problem:");
        }
    }

    /**
     * create a summary based on the input that the chatbot received from the user
     * this will be done in a adaptive card, where he will be able to edit his ticket before he can
     * submit or cancels the ticket
     * @param {*} step
     */
    async summaryStep (step) {
        this.question = await this.state.question;
        if (!step.result) {
            this.content = this.question;
        } else {
            this.content = step.result;
        }
        const id = step.values.companyID;
        const title = step.values.title;

        // fill the ticket card with our values
        TicketCard.body[3].value = id;
        TicketCard.body[5].value = title;
        TicketCard.body[7].value = this.content;

        // create the adaptive card
        const inputForm = MessageFactory.attachment(CardFactory.adaptiveCard(TicketCard));
        // present the card
        return await step.prompt(CARD_PROMPT, {
            prompt: inputForm
        });
    }

    /**
     * Verifiy, wether the user wants to submit or cancel the ticket
     * @param {*} step
     */
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

    // maybe we can validate input here
    async inputValidator (promptContext) {
        const userInputObject = promptContext.recognized.value.value;
        return true;
    }
}

module.exports.TicketDialog = TicketDialog;
