const { InputHints, MessageFactory } = require('botbuilder');
const { ComponentDialog, WaterfallDialog,
    TextPrompt, ChoicePrompt,
    ChoiceFactory, ListStyle } = require('botbuilder-dialogs');

const TEXT_PROMPT = 'textPrompt';
const CHOICE_PROMPT = 'choicePrompt';
const QNA_PRODUCTS_DIALOG_ID = "qnaDialog";
const ROOT_DIALOG_ID = "rootDialogId"; // purpose?


class QnADialog extends ComponentDialog {
    constructor(dialogState) {
        super(ROOT_DIALOG_ID);

        this.resultArray = 0;
        this.dialogState = dialogState;

        this.addDialog(new WaterfallDialog(QNA_PRODUCTS_DIALOG_ID, [
            this.presentResult.bind(this),
            this.rightDocument.bind(this),
            this.processActionSelection.bind(this),
            this.restartDialog.bind(this)]))
            .addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new ChoicePrompt(CHOICE_PROMPT));

        this.initialDialogId = QNA_PRODUCTS_DIALOG_ID;
    }

    async presentResult(step) {
        // return await step.prompt(TEXT_PROMPT, { prompt: "I found this document: " + this.top5Result });
        await step.context.sendActivity("I found this document: " + this.resultArray[0]);
        return await step.next();
    }

    async rightDocument(step) {
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Is the document helpful:',
            choices: ChoiceFactory.toChoices(['Yes', 'No']),
            style: ListStyle.list
        });
    }

    async processActionSelection(step) {
        switch (step.result.value) {
            case 'Yes':
                await step.context.sendActivity("Yasss!");
                return await step.endDialog();
            case 'No':
                await step.context.sendActivity("Too bad!");
                return await step.endDialog();
        }
        await step.context.sendActivity("Incorrect choice");
        return await step.next();
    }

    async restartDialog(step) {
        return await step.replaceDialog(QNA_PRODUCTS_DIALOG_ID);
    }

    async getBasket(context) {
        var basket = await this.dialogState.get(context, {});

        if (!basket.products) {
            basket.products = [];
        }

        return basket;
    }
}

module.exports.QnADialog = QnADialog;
