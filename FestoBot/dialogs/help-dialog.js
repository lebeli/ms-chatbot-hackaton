// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

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

class HelpDialog extends ComponentDialog {
    constructor (userState) {
        super(ROOT_DIALOG_ID);

        // this.userProfile = userState.createProperty(USER_PROFILE);

        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.helpCardStep.bind(this),
            this.helpChoiceStep.bind(this)
            // this.transportStep.bind(this),
            // this.nameStep.bind(this),
            // this.nameConfirmStep.bind(this),
            // this.ageStep.bind(this),
            // this.confirmStep.bind(this),
            // this.summaryStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    async run (turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async helpCardStep (step) {
        await step.context.sendActivity({
            attachments: [CardFactory.adaptiveCard(HelpCard)]
        });
        return step.prompt(CHOICE_PROMPT, {
            prompt: " ",
            choices: ChoiceFactory.toChoices(["Ask a Question", "Create a Ticket"]),
            style: ListStyle.heroCard
        });
    }

    async helpChoiceStep (step) {
        if (step.result.value === "Ask a Question") {
            await step.prompt(TEXT_PROMPT, "Please type in your Question");
            return step.endDialog();
        } else {
            return step.endDialog();
        }
    }
}

module.exports.HelpDialog = HelpDialog;
