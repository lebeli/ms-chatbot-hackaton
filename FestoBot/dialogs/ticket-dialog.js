const { InputHints, MessageFactory } = require('botbuilder');
const { ComponentDialog, WaterfallDialog,
    TextPrompt, ChoicePrompt,
    ChoiceFactory, ListStyle } = require('botbuilder-dialogs');

const TEXT_PROMPT = 'textPrompt';
const CHOICE_PROMPT = 'choicePrompt';

const DELETE_PRODUCT_ID = "deleteProductId";
const ADD_PRODUCT_ID = "addProductId";
const MANAGE_PRODUCTS_DIALOG_ID = "manageProductsDialog";
const ROOT_DIALOG_ID = "rootDialogId";


class TicketDialog extends ComponentDialog {
    constructor(dialogState) {
        super(ROOT_DIALOG_ID);

        this.dialogState = dialogState;

       /* this.addDialog(new WaterfallDialog(MANAGE_PRODUCTS_DIALOG_ID, [
            this.showActions.bind(this),
            this.processActionSelection.bind(this),
            this.restartDialog.bind(this)]))
            .addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new ChoicePrompt(CHOICE_PROMPT))
             .addDialog(new WaterfallDialog(ADD_PRODUCT_ID, [
                async (step) => {
                    return await step.endDialog();
                }
            ])) 
            .addDialog(new AddProductDialog(dialogState))
            .addDialog(new WaterfallDialog(DELETE_PRODUCT_ID, [
                this.chooseProductStep.bind(this),
                this.deleteProductStep.bind(this)
            ]));
            */
           this.addDialog(new TextPrompt(TEXT_PROMPT));
           

        //this.initialDialogId = MANAGE_PRODUCTS_DIALOG_ID;
    }

    async chooseProductStep(step) {
        const msg = MessageFactory.text('Which product you want?', '', InputHints.ExpectingInput);
        return await step.prompt(TEXT_PROMPT, { prompt: msg });
    }

    async addProductStep(step) {
        var product = step.result;

        /* Adding product to the state */
        var basket = await this.getBasket(step.context);
        basket.products.push(product);

        await step.context.sendActivity("Added to basket: " + product);

        return await step.endDialog();
    }

    async deleteProductStep(step) {
        var product = step.result;

        /* Removing product to the state */
        var basket = await this.getBasket(step.context);
        basket.products = basket.products.filter(e => e !== product);

        await step.context.sendActivity("Removed from basket: " + product);

        return await step.endDialog();
    }

    async showActions(step) {
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Do you want to:',
            choices: ChoiceFactory.toChoices(['Add product', 'Remove Product', 'List products', 'Nothing']),
            style: ListStyle.heroCard
        });
    }

    async processActionSelection(step) {
        switch (step.result.value) {
            case 'Add product':
                return await step.beginDialog(ADD_PRODUCT_ID);
            case 'Remove Product':
                return await step.beginDialog(DELETE_PRODUCT_ID);
            case 'List products':
                {
                    var basket = await this.getBasket(step.context);
                    var productsLines = "Empty";
                    if (basket.products && basket.products.length) {
                        productsLines = basket.products.join("\r\n");
                    }
                    await step.context.sendActivity("Products list : \n\n" + productsLines);
                    return await step.next();
                }
            case 'Nothing':
                await step.context.sendActivity("Ok, just say anything to start the dialog again");
                return await step.endDialog();
        }
        await step.context.sendActivity("Incorrect choice");
        return await step.next();
    }

    async restartDialog(step) {
        return await step.replaceDialog(MANAGE_PRODUCTS_DIALOG_ID);
    }

    async getBasket(context) {
        var basket = await this.dialogState.get(context, {});

        if (!basket.products) {
            basket.products = [];
        }

        return basket;
    }
}

module.exports.TicketDialog = TicketDialog;
