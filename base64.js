module.exports = {
    encode: function(string) {
        return new Buffer(string).toString('base64')
    },
    decode: function(string) {
        return new Buffer(string, 'base64').toString('ascii')
    }
}