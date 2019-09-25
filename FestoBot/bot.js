const {
    ActivityHandler,
    MessageFactory,
    CardFactory
} = require('botbuilder');
const {
    LuisRecognizer
} = require('botbuilder-ai');
var Store = require('./store');

class LuisLabBot extends ActivityHandler {
    constructor() {
        super();
        this.onMessage(async (context, next) => {
            var config = {
                applicationId: "30be4bd8-d62d-45cf-b253-6fd1658d475d",
                endpointKey: "95866d1b04244934899cc84729cc7c4c",
                endpoint: "https://westeurope.api.cognitive.microsoft.com/luis/v2.0/apps/30be4bd8-d62d-45cf-b253-6fd1658d475d?verbose=true&timezoneOffset=0&subscription-key=95866d1b04244934899cc84729cc7c4c&q="
            };

            var recognizer = null;
            const luisIsConfigured = config && config.applicationId && config.endpointKey && config.endpoint;
            if (luisIsConfigured) {
                recognizer = new LuisRecognizer(config, {}, true);
            }
            var recognizerResult = await recognizer.recognize(context);
            var topIntent = LuisRecognizer.topIntent(recognizerResult);
            if (!topIntent || topIntent == "") {
                topIntent = "None";
            }
            switch (topIntent) {
                case 'SearchHotels':
                    var response = this.searchForHotelsAction(recognizerResult.entities);
                    if (response != null) {
                        await context.sendActivity(response);
                    } else {
                        await context.sendActivity("Missing data about the hotel");
                    }
                    break;
                case 'ShowHotelsReviews':
                    var response = this.showHotelReviewsAction(recognizerResult.entities);
                    if (response != null) {
                        await context.sendActivity(response);
                    } else {
                        await context.sendActivity("Missing data about the hotel");
                    }
                    break;
                case 'Help':
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
module.exports.LuisLabBot = LuisLabBot;