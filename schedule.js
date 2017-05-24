var Sequelize = require('sequelize');
var errors = require('./errors.js');

var cars = [
    "1234ABC",
    "5678DEF",
    "9000GHI"
]

var Schedule;

var sequelize = new Sequelize('database', process.env.DB_USER, process.env.DB_PASS, {
    host: '0.0.0.0',
    dialect: 'sqlite',
    pool: {
        max: 5,
        min: 0,
        idle: 10000
    },
    storage: '.data/database.sqlite'
});

function setup() {
    sequelize.authenticate()
        .then(function() {

            Schedule = sequelize.define('schedules', {
                id: {
                    type: Sequelize.INTEGER,
                    autoIncrement: true,
                    primaryKey: true
                },
                taxiID: {
                    type: Sequelize.STRING
                },
                scheduleStart: {
                    type: Sequelize.INTEGER
                },
                clientID: {
                    type: Sequelize.STRING
                }
            });

            Schedule.sync({
                    force: true
                })
                .then(function() {
                    for (var i = 0; i < cars.length; i++) {
                        Schedule.create({
                            taxiID: cars[i],
                            scheduleStart: 0,
                            clientID: ""
                        });
                    }
                });
        })
        .catch(function(err) {
            console.log('Unable to connect to the database: ', err);
        });
}

function getLastRides() {
    return Schedule.findAll({
        attributes: ['taxiID', 'scheduleStart'],
        order: [
            sequelize.fn('max', sequelize.col('scheduleStart'))
        ],
        group: ['taxiID']
    })
}

function scheduleNow(response, user) {
    getLastRides().then(function(schedules) {
        for (var i = 0; i < schedules.length; i++) {
            console.log(schedules[i].get())
            if (schedules[i].scheduleStart < Math.round(Date.now() / 1000) - 1800) {
                Schedule
                    .create({
                        taxiID: schedules[i].taxiID,
                        scheduleStart: Math.round(Date.now() / 1000),
                        clientID: user
                    })
                    .then((schedule) => {
                        response.send(schedule.get())
                    })
                return;
            }
        }
        response.status(500)
        response.send({
            error: errors.ErrNoCarsAvailableNow
        })
    })
}

function scheduleASAP(response, user) {
    getLastRides().then((schedules) => {
        var now = Math.round(Date.now() / 1000)
        var soonest = {
            schedule: 0,
            taxiID: ''
        }
        for (var i = 0; i < schedules.length; i++) {
            if (soonest.schedule === 0 || schedules[i].scheduleStart + 1800 < soonest.schedule) {
                soonest.schedule = schedules[i].scheduleStart + 1800
                soonest.taxiID = schedules[i].taxiID
            }

        }

        if (soonest.schedule < now) {
            soonest.schedule = now
        }

        Schedule
            .create({
                taxiID: soonest.taxiID,
                scheduleStart: soonest.schedule,
                clientID: user
            })
            .then((schedule) => {
                response.send(schedule.get())
            })
    })
}

function scheduleAt(response, timestamp, user) {
    var now = Math.round(Date.now() / 1000)
    Schedule.findAll({
        group: ['taxiID']
    }).then((rows) => {
        var taxiIDs = {}
        for (var i in rows) {
            taxiIDs[rows[i].taxiID] = false
        }

        Schedule.findAll({
            where: {
                scheduleStart: {
                    $between: [timestamp - 1800, timestamp + 1800]
                }
            }
        }).then((schedules) => {
            console.log(taxiIDs)
            for (var i in schedules) {
                taxiIDs[schedules[i].taxiID] = true
            }

            for (var taxi in taxiIDs) {
                if (!taxiIDs[taxi]) {
                    Schedule
                        .create({
                            taxiID: taxi,
                            scheduleStart: timestamp,
                            clientID: user
                        })
                        .then((schedule) => {
                            response.send(schedule.get())
                        })
                    return
                }
            }

            response.status(500)
            response.send({
                error: errors.ErrNoCarsAvailableAtSelectedTime
            })
        })
    })
}

function getRidesByUser(response, user) {
    Schedule.findAll({
        where: {
            clientID: user
        }
    }).then((rides) => {
        var result = []
        for (var i in rides) {
            result.push(rides[i].get({
                plain: true
            }))
        }
        response.send(result)
    })
}

function changeRide(response, rideID, newTimestamp, user) {
    var now = Math.round(Date.now() / 1000)
    Schedule.findById(rideID).then(ride => {
        if (ride == null) {
            response.status(404)
            response.send({
                error: errors.ErrRideNotFound
            })
        }

        if (ride.clientID != user) {
            response.status(403)
            response.send({
                error: errors.ErrRideModificationNotAllowed
            })
        }

        Schedule.findAll({
            group: ['taxiID']
        }).then((rows) => {
            var taxiIDs = {}
            for (var i in rows) {
                taxiIDs[rows[i].taxiID] = false
            }

            Schedule.findAll({
                where: {
                    scheduleStart: {
                        $between: [newTimestamp - 1800, newTimestamp + 1800]
                    }
                }
            }).then((schedules) => {
                console.log(taxiIDs)
                for (var i in schedules) {
                    taxiIDs[schedules[i].taxiID] = true
                }

                for (var taxi in taxiIDs) {
                    if (!taxiIDs[taxi]) {
                        ride.taxiID = taxi
                        ride.scheduleStart = newTimestamp
                        ride.save().then((schedule) => {
                            response.send(schedule.get())
                        })
                        return
                    }
                }

                response.status(500)
                response.send({
                    error: errors.ErrNoCarsAvailableAtSelectedTime
                })
            })
        })

    })
}

function deleteRide(response, rideID, user) {
    Schedule.findById(rideID).then(ride => {
        if (ride == null) {
            response.status(404)
            response.send({
                error: errors.ErrRideNotFound
            })
        }

        if (ride.clientID != user) {
            response.status(403)
            response.send({
                error: errors.ErrRideModificationNotAllowed
            })
        }

        ride.destroy()
        response.send({
            status: "ok"
        })
    })
}

module.exports = function() {
    setup()

    return {
        scheduleNow: scheduleNow,
        cheduleASAP: scheduleASAP,
        scheduleAt: scheduleAt,
        getRidesByUser: getRidesByUser,
        changeRide: changeRide,
        deleteRide: deleteRide,
    }
}