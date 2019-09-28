// const { InputHints, MessageFactory } = require("botbuilder");
const {
    ComponentDialog, WaterfallDialog,
    TextPrompt, ChoicePrompt,
    ChoiceFactory, ListStyle
} = require("botbuilder-dialogs");
const { CardFactory } = require("botbuilder");
const { QnAMaker } = require("botbuilder-ai");

const TEXT_PROMPT = "textPrompt";
const CHOICE_PROMPT = "choicePrompt";
const QNA_DIALOG_ID = "qnaDialog";
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

        this.dialogState = dialogState;

        this.addDialog(new WaterfallDialog(QNA_DIALOG_ID, [
            this.presentSingleResult.bind(this),
            this.rightDocument.bind(this),
            this.processActionSelection.bind(this)]))
            .addDialog(new ChoicePrompt(CHOICE_PROMPT));

        this.initialDialogId = QNA_DIALOG_ID;
    }

    async presentSingleResult (step) {
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
        // add results that were not already recieved
        const qnaResults = await this.getTop5QnAMakerResults(step.context);
        qnaResults.forEach(function (element) {
            if (!presentedResultsIDs.includes(element.answer) && !qnaResultsIDs.includes(element.answer)) {
                this.dialogState.qna_results.push(element);
            }
        });
        // sort qna results according to propability
        //this.dialogState.qna_results.

        if (this.dialogState.qna_results.length < 1) {
            await step.context.sendActivity("Sorry, no result, please specify your problem.");
            return step.endDialog();
        }

        this.dialogState.presented_results.push(this.dialogState.qna_results.shift());
        const id = this.dialogState.presented_results.answer;
        const adaptiveCard = this.createAdaptiveCard(id);
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

    getCarouselAttachments () {
        // const cardArray = [];
        const attachments = [];
        this.dialogState.qna_results.forEach(function (element) {
            /*
            attachments.push({
                name: "PDF",
                contentType: "application/pdf",
                contentUrl: "D:\\chatbot\festo\\" + element.answer
            });
            */
            const id = element.answer;
            // const cardJson = this.createAdaptiveCard(id);
            const cardJson = {
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
            const card = CardFactory.adaptiveCard(cardJson);
            attachments.push(card);
        });
        return attachments;
    }

    async rightDocument (step) {
        return step.prompt(CHOICE_PROMPT, {
            prompt: "Is the document helpful?",
            choices: ChoiceFactory.toChoices(["Yes", "No, show me more results"]),
            style: ListStyle.button
        });
    }

    async processActionSelection (step) {
        switch (step.result.value) {
        case "Yes":
            await step.context.sendActivity("Great, can I help you with anything else?");
            return step.endDialog();
        case "No, show me more results":
            if (this.dialogState.qna_results.length === 0) {
                await step.context.sendActivity("Thats all, please create a ticket");
                step.beginDialog("TICKET_ID");
                return step.endDialog();
            }
            const attachments = this.getCarouselAttachments();
            // return cardArray;
            await step.context.sendActivity({
                text: "Maybe this is more helpful:",
                attachments: [attachments]
            });
            return step.endDialog();
        default:
            if (this.dialogState.new_input) {
                this.dialogState.question = this.dialogState.question + " " + this.dialogState.question_specification;
                step.replaceDialog(QNA_DIALOG_ID);
            }
        }
        return step.endDialog();
    };

    createAdaptiveCard (id) {
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

    async restartDialog (step) {
        return step.replaceDialog(QNA_DIALOG_ID);
    }

    async getTop5QnAMakerResults (context) {
        var qnaMakerOptions = {
            ScoreThreshold: 0.0, // Default is 0.3
            Top: 5 // Get 5 best answers
        };
        var result = await this.qnaService.getAnswers(context, qnaMakerOptions);
        return result;
    };
}

module.exports.QnADialog = QnADialog;
