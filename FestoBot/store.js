var ReviewsOptions = [
    '“Very stylish, great stay, great staff”',
    '“good hotel awful meals”',
    '“Need more attention to little things”',
    '“Lovely small hotel ideally situated to explore the area.”',
    '“Positive surprise”',
    '“Beautiful suite and resort”'];

module.exports = {
    searchHotels: function (destination) {
        // Filling the hotels results manually just for demo purposes
        var hotels = [];
        for (var i = 1; i <= 5; i++) {
            hotels.push({
                name: destination + ' Hotel ' + i,
                location: destination,
                rating: Math.ceil(Math.random() * 5),
                numberOfReviews: Math.floor(Math.random() * 5000) + 1,
                priceStarting: Math.floor(Math.random() * 450) + 80,
                image: 'https://via.placeholder.com/500x260?text=Hotel+' + i
            });
        }

        hotels.sort(function (a, b) { return a.priceStarting - b.priceStarting; });

        return hotels;
    },

    searchHotelReviews: function (hotelName) {
        // Filling the review results manually just for demo purposes
        var reviews = [];
        for (var i = 0; i < 5; i++) {
            reviews.push({
                title: "Person " + i + " review",
                text:  ReviewsOptions[Math.floor(Math.random() * ReviewsOptions.length)],
                image: 'https://upload.wikimedia.org/wikipedia/en/e/ee/Unknown-person.gif'
            });
        }

        return reviews;
    }
};