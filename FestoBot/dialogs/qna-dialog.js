// const { InputHints, MessageFactory } = require("botbuilder");
const {
    ComponentDialog, WaterfallDialog,
    TextPrompt, ChoicePrompt, ConfirmPrompt,
    ChoiceFactory, ListStyle
} = require("botbuilder-dialogs");
const { AzureStorageHelper } = require("../services/azurestorage");
const { CardFactory, AttachmentLayoutTypes } = require("botbuilder");
const { QnAMaker } = require("botbuilder-ai");

const CHOICE_PROMPT = "choicePrompt";
const TICKET_CHOICE_PROMPT = "ticketConfirmPrompt";
const TICKET_TRANSITION_DIALOG_PROMPT = "ticketIdDialogPrompt";
const QNA_DIALOG_ID = "qnaDialog";
const TICKET_DIALOG_ID = "TICKET_ID";
const ROOT_DIALOG_ID = "rootQnAId"; // purpose?

class QnADialog extends ComponentDialog {
    constructor (dialogState) {
        // dialogState to save information
        // step = dialogContext in bot.js for dialog flow controll
        super(ROOT_DIALOG_ID);

        const endpointQnA = {
            knowledgeBaseId: "8b28463a-ad6f-45fc-9cba-789a2d935b1f",
            endpointKey: "4ccf2f7f-ecb6-4923-994c-8121615eca4e",
            host: "https://festokb.azurewebsites.net/qnamaker"
        };
        this.qnaService = new QnAMaker(endpointQnA, {});
        var storageHelper = new AzureStorageHelper();

        this.dialogState = dialogState;

        this.addDialog(new WaterfallDialog(QNA_DIALOG_ID, [
            this.presentSingleResult.bind(this),
            this.rightDocument.bind(this),
            this.processActionSelection.bind(this)]))
            .addDialog(new ChoicePrompt(CHOICE_PROMPT))
            .addDialog(new WaterfallDialog(TICKET_TRANSITION_DIALOG_PROMPT, [
                this.confirmTicketTransition.bind(this),
                this.redirectToTicketDialog.bind(this)]))
            .addDialog(new ChoicePrompt(TICKET_CHOICE_PROMPT));

        this.initialDialogId = QNA_DIALOG_ID;
    }

    async presentSingleResult (step) {
        // TODO: just testing, do delete
        // step.replaceDialog(QNA_DIALOG_ID);
        // get IDs for already presented results
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
        const qnaResults = await this.getTop5QnAMakerResults(step.context);
        // no qna results
        if (qnaResults.length < 1) {
            // a result has already been presented
            if (this.dialogState.presented_results.length > 0) {
                await step.context.sendActivity("Again no luck, I'll write a ticket for you to help you with your problem.");
                step.replaceDialog("TICKET_ID");
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
        // now new unique qna results
        if (qnaResultsNew.length < 1) {
            await step.context.sendActivity("Again no luck.");
            return step.replaceDialog(TICKET_TRANSITION_DIALOG_PROMPT);
        }
        // sort qna results according to propability
        // this.dialogState.qna_results
        // add result with highest confidence
        const qnaResultCurrent = qnaResultsNew.shift();
        this.dialogState.qna_results.push(...qnaResultsNew);  // push(...array) extends other array
        this.dialogState.presented_results.push(qnaResultCurrent);

        const id = qnaResultCurrent.answer;
        const adaptiveCard = createAdaptiveCard(id);
        const card = CardFactory.adaptiveCard(adaptiveCard);

        if (this.dialogState.new_input) {
            await step.context.sendActivity({
                text: "Maybe this document is more fitting:",
                attachments: [card]
            });
            this.dialogState.new_input = false; // TODO: add new input handling for after answering with "no"
        } else {
            await step.context.sendActivity({
                text: "I found this document:",
                attachments: [card]
            });
        }

        return step.next();
    }

    async rightDocument (step) {
        return step.prompt(CHOICE_PROMPT, {
            prompt: "Is the document helpful?",
            choices: ChoiceFactory.toChoices(["Yes", "No, show me more results", "I want to rephrase my question"]),
            style: ListStyle.heroCard
        });
    }

    async processActionSelection (step) {
        switch (step.result.value) {
        case "Yes":
            resetDialogState(this.dialogState);
            await step.context.sendActivity("Great, can I help you with anything else?");
            this.resetDialogState();
            return step.endDialog();
        case "No, show me more results":
            if (this.dialogState.qna_results.length < 1) {
                await step.context.sendActivity("Thats all I have.");
                return step.replaceDialog(TICKET_TRANSITION_DIALOG_PROMPT);
            } else {
                const attachments = createAttachments(this.dialogState);
                await step.context.sendActivity({
                    attachments: attachments,
                    attachmentLayout: AttachmentLayoutTypes.Carousel
                });
                return step.endDialog();
            }
        case "I want to rephrase my question":
            await step.context.sendActivity("Go ahead, I'll try my best.");
            return step.endDialog();
        }
        return step.endDialog();
    };

    async confirmTicketTransition (step) {
        return step.prompt(TICKET_CHOICE_PROMPT, {
            prompt: "Do you want to create a ticket for your problem?",
            choices: ChoiceFactory.toChoices(["Yes", "No"]),
            style: ListStyle.heroCard
        });
    }

    async redirectToTicketDialog (step) {
        switch (step.result.value) {
        case "Yes":
            return step.replaceDialog("TICKET_ID");
        case "No":
            await step.context.sendActivity("Ok, just ask me again if you are ready!");
            return step.endDialog();
        }
    }

    async getTop5QnAMakerResults (context) {
        var qnaMakerOptions = {
            scoreThreshold: 0.0, // Default is 0.3
            Top: 5 // Get 5 best answers
        };
        var result = await this.qnaService.getAnswers(context, qnaMakerOptions);
        return result;
    };

    resetDialogState () {
        this.dialogState.qna_results = [];
        this.dialogState.presented_results = [];
        this.dialogState.question = "";
        this.dialogState.question_specification = [];
        this.dialogState.new_input = false;
    }
}

///////////////////////////////////////////////////////////////////
////////               Helper functions                  //////////
///////////////////////////////////////////////////////////////////

function resetDialogState (dialogState) {
    dialogState.qna_results = [];
    dialogState.presented_results = [];
    dialogState.question = "";
    dialogState.question_specification = [];
    dialogState.new_input = false;
}

function createAttachments (dialogState) {
    const attachments = [];
    dialogState.qna_results.forEach(function (element) {
        attachments.push(createHeroCard(element.answer));
    });
    return attachments;
}

function createHeroCard (id) {
    const card = CardFactory.heroCard(
        "Document " + id,
        CardFactory.images(["https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/PDF_file_icon.svg/833px-PDF_file_icon.svg.png"]),
        CardFactory.actions([
            {
                type: "messageBack",
                title: "Open",
                value: id
            }
        ])
    );
    return card;
}

function createAdaptiveCard (id) {
    return {
        type: "AdaptiveCard",
        version: "1.0",
        body: [
            {
                type: "TextBlock",
                text: "Dokument " + id
            },
            {
                type: "Image",
                altText: "",
                // url: ".\\resources\\pdf_icon.png",
                url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/PDF_file_icon.svg/833px-PDF_file_icon.svg.png",
                selectAction: {
                    type: "Action.OpenUrl",
                    url: "D:\\chatbot\\festo\\" + id + ".pdf"
                },
                separator: true,
                size: "Medium"
            }
        ],
        $schema: "http://adaptivecards.io/schemas/adaptive-card.json"
    };
};

/*              
var attachment = await storageHelper.getAttachment("dokumente", "185.pdf");                
await context.sendActivity({
    text: "this might help you:",
    attachments: [attachment]
});
*/

module.exports.QnADialog = QnADialog;
