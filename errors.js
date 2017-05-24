module.exports = {
    ErrNoWhenParamPresent: "use query param \"when\" for selecting time",
    ErrWhenParamSmallerThanCurrent: "query param \"when\" must be larger than current timestamp",
    ErrNoCarsAvailableRightNow: "no cars are available right now",
    ErrNoTokenHeaderPresent: "use header \"Authorization\" for token autentication",
    ErrNoCarsAvailableNow: "no cars are available right now",
    ErrNoCarsAvailableAtSelectedTime: "no cars are available at selected time",
    ErrRideNotFound: "ride not found",
    ErrRideModificationNotAllowed: "you are not allowed to modify this ride",

    ParamWhenOptions: {
        "now": "tries to schedule a service right now if available",
        "asap": "tries to schedule a service as soon as possible",
        "{{ unix_timestamp > now() }}": "tries to schedule a service at given unix timestamp if available"
    }
}