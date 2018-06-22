
// alice.js

var EC = require('elliptic').ec
var ec = new EC('secp256k1')

var public_key = {
	x : 'a5c2616388b35f10668a7df15bffbecc68f5879de159cb392da99adbb86a9647',
	y : 'd03644e86dc91c4a9c8f88b75e560672fa85e851e461c0a8369c20a743b3b351'
}

function sha256(x) {
	return require('crypto').createHash('sha256').update(x).digest('hex')
}

function challenge_hash(challenge) {
	return sha256(challenge.url + ',' + challenge.salt)
}

var master = require('statebus').serve({
	port : 30303,
	client : function (client) {
		var client_public_key_verified = false
		var challenge = {
			url : 'statei://localhost:30303/email',
			salt : 'salt:' + Math.random()
		}

		client('email_auth').to_save = function (o, t) {
			var client_public_key = master.fetch(o.public_key_url).public_key
			var k = ec.keyFromPublic(client_public_key, 'hex')
			if (k.verify(challenge_hash(challenge), o.challenge_response)) {
				client_public_key_verified = true

				console.log('verified!!!!!!!!')
			}
			client.dirty('emails')
			t.abort()
		}

		client('emails').to_fetch = function () {
			if (!client_public_key_verified) {
				return {
					challenge : challenge
				}
			}

			console.log('GOT HERE!!!!!!!!')
			return { hi : 'hoho' }
		}

		client.shadows(master)
	}
})

master.save({
	key : 'email_public_key',
	public_key : public_key
})

master.save({
	key : 'statei://localhost:40404/poke',
	url : 'statei://localhost:30303/emails',
	auth : 'statei://localhost:30303/email_auth',
	rand : Math.random()
})

// bob.js


var EC = require('elliptic').ec
var ec = new EC('secp256k1')

var public_key = {
	x : '8c21d8baf9df44e2ccd5b75bc976380afe445e8fd6477ea4bb86ad5f640fe3a5',
	y : '2cf22a412a60b9200fe48ea1990fb150383cb60cbadaa4ee18d2327aba65be21'
}
var private_key = '5dc74a873e28a9b1ead37114871540ce4692992502ffe41e18f37aae4382db1e'

function sha256(x) {
	return require('crypto').createHash('sha256').update(x).digest('hex')
}

function ec_sign(private_key, hash) {
	var s = ec.keyFromPrivate(private_key, 'hex').sign(hash)
	return { r : s.r.toString('hex'), s : s.s.toString('hex') }
}

function challenge_hash(challenge) {
	return sha256(challenge.url + ',' + challenge.salt)
}

var master = require('statebus').serve({
	port : 40404
})

master.save({
	key : 'email_public_key',
	public_key : public_key
})

master('poke').to_save = function (o, t) {
	var email_peers = master.fetch('email_peers')
	if (!email_peers.peers)
		email_peers.peers = {}
	email_peers.peers[o.url] = o
	master.save(email_peers)
	t.abort()
}

master(function () {
	var email_peers = master.fetch('email_peers')
	for (var k in email_peers.peers) {
		if (email_peers.peers.hasOwnProperty(k)) {
			var peer = email_peers.peers[k]
			console.log('FETCH: ', peer.url)
			var x = master.fetch(peer.url)
			if (x.challenge) {
				if (x.challenge.url != peer.url) {
					console.log('this server does not seem to be who we thought..')
					continue
				}
				console.log('challenge: ', x.challenge)
				master.save({
					key : peer.auth,
					public_key_url : 'statei://localhost:40404/email_public_key',
					challenge_response : ec_sign(private_key, challenge_hash(x.challenge))
				})
			} else {
				console.log('got actual emails: ', x)
			}
		}
	}
})
