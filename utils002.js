
each = function (o, cb) {
    if (o instanceof Array) {
        for (var i = 0; i < o.length; i++) {
            if (cb(o[i], i, o) == false)
                return false
        }
    } else {
        for (var k in o) {
            if (o.hasOwnProperty(k)) {
                if (cb(o[k], k, o) == false)
                    return false
            }
        }
    }
    return true
}

lerp = function (t0, v0, t1, v1, t) {
    return (t - t0) * (v1 - v0) / (t1 - t0) + v0
}

map = function (o, func) {
    if (o instanceof Array) {
        var accum = []
        for (var i = 0; i < o.length; i++)
            accum[i] = func(o[i], i, o)
        return accum
    } else {
        var accum = {}
        for (var k in o)
            if (o.hasOwnProperty(k))
                accum[k] = func(o[k], k, o)
        return accum
    }
}
