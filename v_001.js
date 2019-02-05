
function v_isNaN(v) {
    return v.some(x => isNaN(x))
}

function v_lenSq(v) {
    return v.reduce((a, b) => a + b*b, 0)
}

function v_len(v) {
    return Math.sqrt(v_lenSq(v))
}

function v_normalize(v) {
    var len = v_len(v)
    v.forEach((vv, i) => v[i] = vv / len)
}
