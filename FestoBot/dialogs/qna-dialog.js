// const { InputHints, MessageFactory } = require("botbuilder");
const {
    ComponentDialog, WaterfallDialog,
    TextPrompt, ChoicePrompt,
    ChoiceFactory, ListStyle
} = require("botbuilder-dialogs");
const { Adaptive } = require("adaptivecards");
const { CardFactory } = require("botbuilder");
const { QnAMaker } = require("botbuilder-ai");

const TEXT_PROMPT = "textPrompt";
const CHOICE_PROMPT = "choicePrompt";
const QNA_PRODUCTS_DIALOG_ID = "qnaDialog";
const ROOT_DIALOG_ID = "rootQnAId"; // purpose?

class QnADialog extends ComponentDialog {
    constructor (dialogState) {
        super(ROOT_DIALOG_ID);

        const endpointQnA = {
            knowledgeBaseId: "8b28463a-ad6f-45fc-9cba-789a2d935b1f",
            endpointKey: "4ccf2f7f-ecb6-4923-994c-8121615eca4e",
            host: "https://festokb.azurewebsites.net/qnamaker"
        };
        this.qnaService = new QnAMaker(endpointQnA, {});

        this.resultArray = 0;
        this.dialogState = dialogState;

        this.addDialog(new WaterfallDialog(QNA_PRODUCTS_DIALOG_ID, [
            this.presentSingleResult.bind(this),
            this.rightDocument.bind(this),
            this.processActionSelection.bind(this)]))
            .addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new ChoicePrompt(CHOICE_PROMPT));

        this.initialDialogId = QNA_PRODUCTS_DIALOG_ID;
    }

    async presentSingleResult (step) {
        // return await step.prompt(TEXT_PROMPT, { prompt: "I found this document: " + this.top5Result });
        this.resultArray = await this.getTop5QnAMakerResults(step.context);
        if (this.resultArray.length < 1) {
            await step.context.sendActivity("Sorry, no result, please specify your problem.");
            return step.replaceDialog(this.dialogState.id);
            // return step.endDialog();
        }
        const id = this.resultArray[0].answer;
        this.presented = this.resultArray.shift();

        const adaptiveCard = this.createAdaptiveCard(id);

        const card = CardFactory.adaptiveCard(adaptiveCard);

        await step.context.sendActivity({
            text: "I found this document:",
            attachments: [card]
        });
        // const resultArray = await this.getTop5QnAMakerResults(step.context);
        // await step.context.sendActivity("I found this document: " + resultArray[0].answer);
        return step.next();
    }

    async presentMultipleResults () {
        // return await step.prompt(TEXT_PROMPT, { prompt: "I found this document: " + this.top5Result });
        const resultArray = this.resultArray;

        // const cardArray = [];
        const attachments = [];
        resultArray.forEach(function (element) {
            attachments.push({
                name: "PDF",
                contentType: "application/pdf",
                contentUrl: "D:\\chatbot\festo\\" + resultArray[0].answer
            });
            /*
            const id = element.answer;
            const cardJson = this.createAdaptiveCard(id);
            const card = CardFactory.adaptiveCard(cardJson);
            cardArray.push(card);
            */
        });
        //return cardArray;
        await step.context.sendActivity({
            text: "I found this document:",
            attachments: [attachment]
        });
        return step.next();
    }

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
            await step.context.sendActivity("Yasss!");
            return step.endDialog();
        case "No, show me more results": 
            const resultArray = this.resultArray;
            if (resultArray.length === 0) {
                await step.context.sendActivity("Thats all, please create a ticket");
                return step.endDialog();
            }

            // const cardArray = [];
            const attachments = [];
            resultArray.forEach(function (element) {
                attachments.push({
                    name: "Document " + element.answer,
                    contentType: "application/pdf",
                    contentUrl: "D:\\chatbot\festo\\" + resultArray[0].answer
                });
                /*
                const id = element.answer;
                const cardJson = this.createAdaptiveCard(id);
                const card = CardFactory.adaptiveCard(cardJson);
                cardArray.push(card);
                */
            });
            //return cardArray;
            await step.context.sendActivity({
                text: "I found this document:",
                attachments: attachments
            });
        }
        // await step.context.sendActivity("Incorrect choice");
        return step.next();
    }

    async restartDialog (step) {
        return step.replaceDialog(QNA_PRODUCTS_DIALOG_ID);
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
