const {
    ChoiceFactory,
    ChoicePrompt,
    ListStyle,
    ComponentDialog,
    DialogSet,
    DialogTurnStatus,
    TextPrompt,
    WaterfallDialog
} = require("botbuilder-dialogs");
const { CardFactory } = require("botbuilder");

const CHOICE_PROMPT = "CHOICE_PROMPT";
const TEXT_PROMPT = "TEXT_PROMPT";
const WATERFALL_DIALOG = "WATERFALL_DIALOG";
const ROOT_DIALOG_ID = "HELP_ID"; // purpose?
const HelpCard = require("../resources/HelpCard.json");

/**
 * Dialog, that guides the user through the various ways he will be able to interact with the chatbot
 */
class HelpDialog extends ComponentDialog {
    constructor () {
        super(ROOT_DIALOG_ID);
        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.helpCardStep.bind(this),
            this.helpChoiceStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * Create an adaptive card, which points the user to the various ways he can interact with the chatbot
     * This can be either asking a question or creating a ticket
     * @param {*} step 
     */
    async helpCardStep (step) {
        // adaptive card to give the user information about the bot
        await step.context.sendActivity({
            attachments: [CardFactory.adaptiveCard(HelpCard)]
        });
        // let the user choose between asking a question or creating a ticket
        return step.prompt(CHOICE_PROMPT, {
            prompt: " ",
            choices: ChoiceFactory.toChoices(["Ask a Question", "Create a Ticket"]),
            style: ListStyle.heroCard
        });
    }

    /**
     * Choice step, always ends with end Dialog
     * This step shows the user, that he can simply ask the question without further steps
     * @param {*} step 
     */
    async helpChoiceStep (step) {
        // if user has choosen to ask a question he gets asked to type it in
        // otherwise the ticket dialog starts
        if (step.result.value === "Ask a Question") {
            await step.prompt(TEXT_PROMPT, "Please type in your Question");
            return step.endDialog();
        } else {
            return step.endDialog();
        }
    }
}

module.exports.HelpDialog = HelpDialog;
