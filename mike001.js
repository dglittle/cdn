
var firebase = require('firebase')

var config = {
    apiKey: "AIzaSyCiJU36qJxNoVYmmfw7gUCeWRC0py-RSPw",
    authDomain: "open-44d30.firebaseapp.com",
    databaseURL: "https://open-44d30.firebaseio.com",
    projectId: "open-44d30",
    storageBucket: "open-44d30.appspot.com",
    messagingSenderId: "799649165678"
}

var db = firebase.initializeApp(config).database().ref().child('/statebus_objs')

function encode_firebase_key(k) {
    return encodeURIComponent(k).replace(/\./g, '%2E')
}

function decode_firebase_key(k) {
    return decodeURIComponent(k.replace('%2E', '.'))
}

var bus = require('statebus').serve({
    file_store : false
})

bus('/*').to_fetch = function (key, t) {
    db.child(encode_firebase_key(key)).once('value', function (x) {
        t.done(x.val() || {})
    }, function (x) { console.log('firebase error:', x) })
}

bus('/*').on_save = function (o) {
    db.child(encode_firebase_key(o.key)).set(o)
}

db.on('child_added', function (x) {
    var obj = x.val() || {}
    obj.key = decode_firebase_key(x.key)
    bus.save(obj)
})

db.on('child_changed', function (x) {
    var obj = x.val() || {}
    obj.key = decode_firebase_key(x.key)
    bus.save(obj)
})

db.on('child_removed', function (x) {
    bus.del(decode_firebase_key(x.key))
})





bus(function () {
    console.log('testing A')
    var x = bus.fetch('/helllo')
    console.log('x = ', x)
    console.log('testing B')
})

bus.save({ key : '/blar', bloop : 'hoop' })

setTimeout(function () {
    bus.save({ key : '/helllo', hihi : 80 })
}, 5000)
