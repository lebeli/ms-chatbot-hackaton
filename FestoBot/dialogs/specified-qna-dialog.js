const {
    ComponentDialog, WaterfallDialog,
    TextPrompt, ChoicePrompt,
    ChoiceFactory, ListStyle
} = require("botbuilder-dialogs");
const { CardFactory } = require("botbuilder");
const { QnAMaker } = require("botbuilder-ai");

const QNA_PRODUCTS_DIALOG_ID = "specifiedQnADialog";
const ROOT_DIALOG_ID = "rootSpecifiedQnAId";

class SpecifiedQnADialog extends ComponentDialog {
    constructor (dialogState) {
        super(ROOT_DIALOG_ID);

        const endpointQnA = {
            knowledgeBaseId: "8b28463a-ad6f-45fc-9cba-789a2d935b1f",
            endpointKey: "4ccf2f7f-ecb6-4923-994c-8121615eca4e",
            host: "https://festokb.azurewebsites.net/qnamaker"
        };
        this.qnaService = new QnAMaker(endpointQnA, {});

        this.dialogState = dialogState;

        this.addDialog(new WaterfallDialog(QNA_PRODUCTS_DIALOG_ID, [
            this.presentSingleResult.bind(this),
            this.rightDocument.bind(this),
            this.processActionSelection.bind(this)]));

        this.initialDialogId = QNA_PRODUCTS_DIALOG_ID;
    }
}

module.exports.SpecifiedQnADialog = SpecifiedQnADialog;
