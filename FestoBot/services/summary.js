const request = require('request');
var querystring = require('querystring');

class Summary {
    constructor(){
        
        const result = process.env.SUMMARY_API_KEY;

        if (result.error) {
          throw result.error
        }
        
        var apiKey = process.env.SUMMARY_API_KEY;

        var sentBody = {
            sm_api_input: "This week the equinox found the Sun near the middle, but not at the crossing point, of an analemma in its annual trek through planet Earth's skies. In this scenic view, that graceful, figure-8-shaped curve was intentionally posed above the iconic Danube River and the capital city of Hungary. Looking south from Budapest's Margaret Bridge it combines digital frames taken at exactly the same time of day (11:44 CET) on dates between 2018 September 24 and 2019 September 15. That puts the metropolitan Pest on the left, regal Buda on the right, and the positions of the Sun on the solstice dates at the top and bottom of the analemma curve. December's near solstice Sun is just hidden behind a dramatic cloud bank.This week the equinox found the Sun near the middle, but not at the crossing point, of an analemma in its annual trek through planet Earth's skies. In this scenic view, that graceful, figure-8-shaped curve was intentionally posed above the iconic Danube River and the capital city of Hungary. Looking south from Budapest's Margaret Bridge it combines digital frames taken at exactly the same time of day (11:44 CET) on dates between 2018 September 24 and 2019 September 15. That puts the metropolitan Pest on the left, regal Buda on the right, and the positions of the Sun on the solstice dates at the top and bottom of the analemma curve. December's near solstice Sun is just hidden behind a dramatic cloud bank.",
            sm_api_key: apiKey            
        };
        
        var sentBody2 = {
            SM_API_INPUT: "This week the equinox found the Sun near the middle, but not at the crossing point, of an analemma in its annual trek through planet Earth's skies. In this scenic view, that graceful, figure-8-shaped curve was intentionally posed above the iconic Danube River and the capital city of Hungary. Looking south from Budapest's Margaret Bridge it combines digital frames taken at exactly the same time of day (11:44 CET) on dates between 2018 September 24 and 2019 September 15. That puts the metropolitan Pest on the left, regal Buda on the right, and the positions of the Sun on the solstice dates at the top and bottom of the analemma curve. December's near solstice Sun is just hidden behind a dramatic cloud bank.This week the equinox found the Sun near the middle, but not at the crossing point, of an analemma in its annual trek through planet Earth's skies. In this scenic view, that graceful, figure-8-shaped curve was intentionally posed above the iconic Danube River and the capital city of Hungary. Looking south from Budapest's Margaret Bridge it combines digital frames taken at exactly the same time of day (11:44 CET) on dates between 2018 September 24 and 2019 September 15. That puts the metropolitan Pest on the left, regal Buda on the right, and the positions of the Sun on the solstice dates at the top and bottom of the analemma curve. December's near solstice Sun is just hidden behind a dramatic cloud bank.",
            SM_API_KEY: apiKey            
        };

        request.post({url:'https://api.smmry.com', formData: sentBody2}, function(err,httpResponse,body)
        { 
            console.log(httpResponse);
        });


          /*
        request({
            headers: {
              'Content-Length': contentLength,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            uri: 'https://api.nasa.gov/planetary/apod',
            body: formData,
            method: 'GET'
          }, function (err, res, body) {
              console.log(body);
            //it works!
          });

        request('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY', { json: true }, (err, res, body) => {
            if (err) { return console.log(err); }
            console.log(body.url);
            console.log(body.explanation);
          });*/

  // A chunk of data has b

    }
}


module.exports.Summary = Summary;
