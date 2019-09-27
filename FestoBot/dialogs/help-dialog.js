// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const {
    ChoiceFactory,
    ChoicePrompt,
    ListStyle,
    ComponentDialog,
    ConfirmPrompt,
    DialogSet,
    DialogTurnStatus,
    NumberPrompt,
    TextPrompt,
    WaterfallDialog
} = require("botbuilder-dialogs");
const { CardFactory } = require("botbuilder");

const CHOICE_PROMPT = "CHOICE_PROMPT";
const CONFIRM_PROMPT = "CONFIRM_PROMPT";
const TEXT_PROMPT = "TEXT_PROMPT";
const NUMBER_PROMPT = "NUMBER_PROMPT";
const WATERFALL_DIALOG = "WATERFALL_DIALOG";
const ROOT_DIALOG_ID = "HELP_ID"; // purpose?
const HelpCard = require("../resources/HelpCard.json");

class HelpDialog extends ComponentDialog {
    constructor (userState) {
        super(ROOT_DIALOG_ID);

        // this.userProfile = userState.createProperty(USER_PROFILE);

        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT, this.agePromptValidator));

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
        await step.prompt(CHOICE_PROMPT, {
            prompt: " ",
            choices: ChoiceFactory.toChoices(["Ask a Question", "Create a Ticket"]),
            style: ListStyle.heroCard
        });
        return step.next();
    }

    async helpChoiceStep (step) {
        // tbd
    }

    async transportStep (step) {
        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        // Running a prompt here means the next WaterfallStep will be run when the users response is received.
        return step.prompt(CHOICE_PROMPT, {
            prompt: "Please enter your mode of transport.",
            choices: ChoiceFactory.toChoices(["Car", "Bus", "Bicycle"])
        });
    }

    async nameStep (step) {
        step.values.transport = step.result.value;
        return step.prompt(TEXT_PROMPT, "What is your name, human?");
    }

    async nameConfirmStep (step) {
        step.values.name = step.result;

        // We can send messages to the user at any point in the WaterfallStep.
        await step.context.sendActivity(`Thanks ${step.result}.`);

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        return step.prompt(CONFIRM_PROMPT, "Do you want to give your age?", ["yes", "no"]);
    }

    async ageStep (step) {
        if (step.result) {
            // User said "yes" so we will be prompting for the age.
            // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is a Prompt Dialog.
            const promptOptions = { prompt: "Please enter your age.", retryPrompt: "The value entered must be greater than 0 and less than 150." };

            return step.prompt(NUMBER_PROMPT, promptOptions);
        } else {
            // User said "no" so we will skip the next step. Give -1 as the age.
            return step.next(-1);
        }
    }

    async confirmStep (step) {
        step.values.age = step.result;

        const msg = step.values.age === -1 ? "No age given." : `I have your age as ${step.values.age}.`;

        // We can send messages to the user at any point in the WaterfallStep.
        await step.context.sendActivity(msg);

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is a Prompt Dialog.
        return step.prompt(CONFIRM_PROMPT, { prompt: "Is this okay?" });
    }

    async summaryStep (step) {
        if (step.result) {
            // Get the current profile object from user state.
            // const userProfile = await this.userProfile.get(step.context, new UserProfile());

            const transport = step.values.transport;
            const name = step.values.name;
            const age = step.values.age;

            let msg = `I have your mode of transport as ${transport} and your name as ${name}.`;
            if (age !== -1) {
                msg += ` And age as ${age}.`;
            }

            await step.context.sendActivity(msg);
        } else {
            await step.context.sendActivity("Thanks. Your profile will not be kept.");
        }

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog, here it is the end.
        return step.endDialog();
    }

    async agePromptValidator (promptContext) {
        // This condition is our validation rule. You can also change the value at this point.
        return promptContext.recognized.succeeded && promptContext.recognized.value > 0 && promptContext.recognized.value < 150;
    }
}

module.exports.HelpDialog = HelpDialog;
