var express = require('express');

var errors = require('./errors.js');
var scheduler = require('./schedule.js')();
var base64 = require('./base64.js');

var app = express()

app.get("/get/a/token", function(request, response) {
    if (request.query.username == null) {
        response.status(400)
        response.send({
            error: errors.ErrNoUsernameParamPresent,
        })
        return
    }

    response.send({
        token: base64.encode(request.query.username)
    })

})

app.post("/schedule-ride", function(request, response) {
    if (request.query.when == null) {
        response.status(400)
        response.send({
            error: errors.ErrNoWhenParamPresent,
            options: errors.ParamWhenOptions
        })
        return
    }

    if (request.headers.authorization == null) {
        response.status(401)
        response.send({
            error: errors.ErrNoTokenHeaderPresent,
        })
        return
    }

    var user = base64.decode(request.headers.authorization.split(" ")[1])

    switch (request.query.when) {
        case "now":
            scheduler.scheduleNow(response, user)
            break;
        case "asap":
            scheduler.scheduleASAP(response, user)
            break;
        default:
            if (request.query.when < Math.round(Date.now() / 1000)) {
                response.status(400)
                response.send({
                    error: errors.ErrWhenParamSmallerThanCurrent,
                    options: errors.ParamWhenOptions
                })
                return
            }

            scheduler.scheduleAt(response, request.query.when, user)
    }
});

app.get('/my-rides', function(request, response) {
    if (request.headers.authorization == null) {
        response.status(401)
        response.send({
            error: errors.ErrNoTokenHeaderPresent,
        })
        return
    }

    var user = base64.decode(request.headers.authorization.split(" ")[1])

    scheduler.getRidesByUser(response, user)
})

app.post('/my-rides/:ride', function(request, response) {
    if (request.headers.authorization == null) {
        response.status(401)
        response.send({
            error: errors.ErrNoTokenHeaderPresent,
        })
        return
    }

    var user = base64.decode(request.headers.authorization.split(" ")[1])

    scheduler.changeRide(response, request.params.ride, request.query.when, user)
})

app.delete('/my-rides/:ride', function(request, response) {
    if (request.headers.authorization == null) {
        response.status(401)
        response.send({
            error: errors.ErrNoTokenHeaderPresent,
        })
        return
    }

    var user = base64.decode(request.headers.authorization.split(" ")[1])

    scheduler.deleteRide(response, request.params.ride, user)
})

var listener = app.listen(process.env.PORT, function() {
    console.log('Your app is listening on port ' + listener.address().port);
});