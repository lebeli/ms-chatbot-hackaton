const {
    ActivityHandler,
    MessageFactory,
    CardFactory
} = require('botbuilder');
const {
    LuisRecognizer
} = require('botbuilder-ai');
var Store = require('./store');

class FestoBot extends ActivityHandler {
    constructor() {
        super();
        const endpointQnA = {
            knowledgeBaseId: "8b28463a-ad6f-45fc-9cba-789a2d935b1f",
            endpointKey: "4ccf2f7f-ecb6-4923-994c-8121615eca4e",
            host: "https://festokb.azurewebsites.net/qnamaker"
        };
        this.qnaService = new QnAMaker(endpointQnA, {});
        this.onMessage(async (context, next) => {
            var endpointLuis = {
                applicationId: "e3ed9236-2b5e-45ee-8eac-0f167760ee7c",
                endpointKey: "016c1648db0c462f8fb3f682e660184d",
                endpoint: "https://westeurope.api.cognitive.microsoft.com/luis/v2.0/apps/e3ed9236-2b5e-45ee-8eac-0f167760ee7c?verbose=true&timezoneOffset=0&subscription-key=016c1648db0c462f8fb3f682e660184d&q="
            };

            var recognizer = null;
            const luisIsConfigured = endpointLuis && endpointLuis.applicationId && endpointLuis.endpointKey && endpointLuis.endpoint;
            if (luisIsConfigured) {
                recognizer = new LuisRecognizer(endpointLuis, {}, true);
            }
            var recognizerResult = await recognizer.recognize(context);
            var topIntent = LuisRecognizer.topIntent(recognizerResult);
            if (!topIntent || topIntent == "") {
                topIntent = "None";
            }
            switch (topIntent) {
                case 'help':
                    await context.sendActivity(`Happy to help you '${topIntent}'`);
                case 'None':
                default:
                    await context.sendActivity(`Top intent is '${topIntent}'`);
                    break;
            }

            await next();
        });
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity('Hello and welcome!');
                }
            } /* By calling next() you ensure that the next BotHandler is run. */
            await next();
        });
        this.searchForHotelsAction = function(entities) {
            var hotels = this.getHotels(entities);
            if (hotels == null || !hotels.length) {
                return null;
            }
            var attachments = [];
            for (let i = 0; i < hotels.length; i++) {
                const hotel = hotels[i];
                var attachment = CardFactory.heroCard(hotel.name, CardFactory.images([hotel.image]), CardFactory.actions([{
                    type: 'openUrl',
                    title: 'More details',
                    value: 'https://www.bing.com/search?q=hotels+in+' + encodeURIComponent(hotel.location)
                }]));
                attachments.push(attachment);
            }
            return MessageFactory.carousel(attachments);
        }
        this.showHotelReviewsAction = function(entities) {
            var reviews = this.getHotelReviews(entities);
            if (reviews == null || !reviews.length) {
                return null;
            }
            var attachments = [];
            for (let i = 0; i < reviews.length; i++) {
                const review = reviews[i];
                var attachment = CardFactory.thumbnailCard(review.title, review.text, CardFactory.images([review.image]));
                attachments.push(attachment);
            }
            return MessageFactory.carousel(attachments);
        }
        this.getHotels = function(entities) {
            var destination = null;
            if (entities.Places_AbsoluteLocation && entities.Places_AbsoluteLocation.length) {
                destination = entities.AirportCode[0];
            } else if (entities.AirportCode && entities.AirportCode.length) {
                destination = entities.AirportCode[0];
            }
            if (!destination || !destination.length) return null;
            return Store.searchHotels(destination);
        }
        this.getHotelReviews = function(entities) {
            var hotelName = null;
            if (entities.Hotel && entities.Hotel.length) {
                hotelName = entities.Hotel[0];
            }
            if (!hotelName || !hotelName.length) return null;
            return Store.searchHotelReviews(hotelName);
        }
    }
}
module.exports.FestoBot = FestoBot;