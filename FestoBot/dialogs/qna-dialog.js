// const { InputHints, MessageFactory } = require("botbuilder");
const {
    ComponentDialog, WaterfallDialog,
    ChoicePrompt, ConfirmPrompt,
    ChoiceFactory, ListStyle
} = require("botbuilder-dialogs");
const { AzureStorageHelper } = require("../services/azurestorage");
const { QnAMaker } = require("botbuilder-ai");

// prompt ids
const CHOICE_PROMPT = "choicePrompt";
const MULTIPLE_CHOICE_PROMPT = "multipleChoicePrompt";
const SINGLE_CONFIRM_PROMPT = "singleConfirmPrompt";
const MULTIPLE_CONFIRM_PROMPT = "multipleConfirmPrompt";

// dialog ids
const QNA_DIALOG_ID = "qnaDialog";
const ROOT_DIALOG_ID = "rootQnAId";

/**
 * Dialog, which searches the QnA-Knowledge base based on the given user input
 *
 * The QnA-Knowledge will return an document id, which will then get downloaded and served to the user.
 * If the document, that matches that question is not helpful, the user can request additional documents.
 * if those are not helpful, the bot offers to create a ticket through an dialog as an alternative
 */
class QnADialog extends ComponentDialog {
    constructor (dialogState) {
        // dialogState to save information
        // step = dialogContext in bot.js for dialog flow controll
        super(ROOT_DIALOG_ID);

        // the endpoint for our knowledge base
        const endpointQnA = {
            knowledgeBaseId: process.env.QNA_KNOWLEDGEBASE_ID,
            endpointKey: process.env.QNA_ENDPOINT_KEY,
            host: process.env.QNA_URL
        };
        // create our service-objects
        this.qnaService = new QnAMaker(endpointQnA, {});
        this.storageHelper = new AzureStorageHelper();
        this.dialogState = dialogState;

        // define our waterfall dialog
        this.addDialog(new WaterfallDialog(QNA_DIALOG_ID, [
            this.presentSingleResult.bind(this),
            this.rightDocument.bind(this),
            this.processActionSelection.bind(this),
            this.multipleAnswersHelpful.bind(this)]))
            .addDialog(new ChoicePrompt(CHOICE_PROMPT))
            .addDialog(new ChoicePrompt(MULTIPLE_CHOICE_PROMPT))
            .addDialog(new ConfirmPrompt(SINGLE_CONFIRM_PROMPT))
            .addDialog(new ConfirmPrompt(MULTIPLE_CONFIRM_PROMPT));

        this.initialDialogId = QNA_DIALOG_ID;
    }

    /**
     * Create the attachments
     * @param {*} dialogState
     */
    async createAttachments (dialogState) {
        const attachments = [];
        return new Promise((resolve, reject) => {
            dialogState.qna_results.forEach(async function (element, index, array) {
                const id = element.answer;
                const storageHelper = new AzureStorageHelper();
                const attachment = await storageHelper.getAttachment("dokumente", id);
                attachments.push(attachment);
                if (index === array.length - 1) resolve(attachments);
            });
        });
    }

    async presentSingleResult (step) {
        const presentedResultsIDs = [];
        this.dialogState.presented_results.forEach(function (element) {
            presentedResultsIDs.push(element.answer);
        });
        // get IDs for results from previes queries
        const qnaResultsIDs = [];
        this.dialogState.qna_results.forEach(function (element) {
            qnaResultsIDs.push(element.answer);
        });
        // A specified question to turnContext
        step.context._activity.text = this.dialogState.question;
        // add results that were not already recieved
        const qnaResultsNew = [];
        // search the top five qna results
        const qnaResults = await this.getTopResults(step.context, 5);
        if (qnaResults.length < 1) {
            // a result has already been presented
            if (this.dialogState.presented_results.length > 0) {
                await step.context.sendActivity("Again no luck, I'll write a ticket for you to help you with your problem.");
                return step.replaceDialog("TICKET_ID");
            } else {
                await step.context.sendActivity("Sorry, no result, please specify your problem.");
                return step.endDialog();
            }
        }
        qnaResults.forEach(function (element) {
            if (!presentedResultsIDs.includes(element.answer) && !qnaResultsIDs.includes(element.answer)) {
                qnaResultsNew.push(element);
            }
        });
        // sort qna results according to propability
        // this.dialogState.qna_results
        // add result with highest confidence
        const qnaResultCurrent = qnaResultsNew.shift();
        this.dialogState.qna_results.push(...qnaResultsNew); // push(...array) extends other array
        this.dialogState.presented_results.push(qnaResultCurrent);

        const id = qnaResultCurrent.answer;
        const attachment = await this.storageHelper.getAttachment("dokumente", id);

        if (this.dialogState.new_input) {
            await step.context.sendActivity({
                text: "Maybe this document is more fitting:",
                attachments: [attachment]
            });
            this.dialogState.new_input = false; // TODO: add new input handling for after answering with "no"
        } else {
            await step.context.sendActivity({
                text: "I found this document:",
                attachments: [attachment]
            });
        }

        return step.next();
    }

    /**
     * Check whether the first presented document was helpful
     * @param {*} step
     */
    async rightDocument (step) {
        return step.prompt(CHOICE_PROMPT, {
            prompt: "Is the document helpful?",
            choices: ChoiceFactory.toChoices(["Yes", "No, show me more results"]),
            style: ListStyle.heroCard
        });
    }

    /**
     * Ask the user, if he needs further help or wether the presented documents were helpful for him
     * @param {*} step
     */
    async multipleAnswersHelpful (step) {
        return step.prompt(MULTIPLE_CHOICE_PROMPT, {
            prompt: "Do you need further help?",
            choices: ChoiceFactory.toChoices(["Yes, create a ticket", "No, I am fine"]),
            style: ListStyle.heroCard
        });
    }

    /**
     * When the user reached this step, the chatbot asked him if his problem is solved
     * based on the response, we will present more results or fall back into the idle state
     * @param {*} step
     */
    async processActionSelection (step) {
        switch (step.result.value) {
        case "Yes":
            resetDialogState(this.dialogState);
            await step.context.sendActivity("Great, can I help you with anything else?");
            return step.endDialog();
        case "No, show me more results":
            // maybe we dont have more documents
            if (this.dialogState.qna_results.length < 1) {
                await step.context.sendActivity("Sorry, there are no more documents.");
                // if the first document was not helpful, and there are no more documents left,
                // the user probably wants to create a ticket
                return step.replaceDialog("TICKET_ID");
            } else {
                // get the other relevant documents
                const attachments = await this.createAttachments(this.dialogState);
                // present the user our documents
                await step.context.sendActivity({
                    attachments: attachments
                });

                return step.next();
            }
        }
        return step.endDialog();
    };

    /**
     * Get the most relevant documents
     * @param {*} context
     */
    async getTopResults (context, amount) {
        var qnaMakerOptions = {
            scoreThreshold: 0.0, // Default is 0.3
            Top: amount // Get 5 best answers
        };
        var result = await this.qnaService.getAnswers(context, qnaMakerOptions);
        return result;
    };

    /**
     * reset the dialogstate
     * @param {*} dialogState
     */
    resetDialogState () {
        this.dialogState.qna_results = [];
        this.dialogState.presented_results = [];
        this.dialogState.question = "";
        this.dialogState.question_specification = [];
        this.dialogState.new_input = false;
    }
}

/// ////////////////////////////////////////////////////////////////
/// /////               Helper functions                  //////////
/// ////////////////////////////////////////////////////////////////

/**
 * reset the dialogstate, for static usage
 * @param {*} dialogState
 */
function resetDialogState (dialogState) {
    dialogState.qna_results = [];
    dialogState.presented_results = [];
    dialogState.question = "";
    dialogState.question_specification = [];
    dialogState.new_input = false;
}

module.exports.QnADialog = QnADialog;
