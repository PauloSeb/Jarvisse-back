//Global vars
var uPnPdevices = new Array();
var sensor = new Array();
sensor['PhotoTextViewer'] = new Object();
sensor['PhotoTextViewer'].text = new Array();
sensor['PhotoTextViewer'].picture = new Array();
sensor['RFID'] = new Array();
sensor['AudioPlayer'] = new Array();
sensor['Android_GPS'] =  new Array();
sensor['Android_Voice'] =  new Array();
sensor['Android_Accelero'] =  new Array();

var homePosition = {latitude:0, longitude: 0};
var distanceForLight = 50; //en mètres

var lastKitchenAppearance = 0;
var kitchenFirstHour = 18;
var kitchenLastHour = 22;


//XML
var xml2js = require('xml2js');

//REST
var express = require('express');
var app = express();
//app.use(express.bodyParser());
app.use(express.urlencoded());
app.use(express.json());
app.listen(5000);
console.log("Server listening on port 5000");

app.post('/setText', function(req, res){
	if(!req.body.hasOwnProperty('text')) {
		res.statusCode = 400;
		return res.send('Error 400 : text value missing!');
	} else {
		setText(req.body.text);
		res.statusCode = 200;
		res.send("ok");
	}
});

app.post('/setPicture', function(req, res){
	if(!req.body.hasOwnProperty('picture')) {
		res.statusCode = 400;
		return res.send('Error 400 : picture url missing');
	} else {
		setPicture(req.body.picture);
		res.statusCode = 200;
		res.send("ok");
	}
});

app.post('/setAudioPlayer', function(req, res){
	if(!req.body.hasOwnProperty('command')) {
		res.statusCode = 400;
		return res.send('Error 400 : command missing');
	} else {
		switch(req.body.command) {
			case 'play':
				if(!req.body.hasOwnProperty('argument')) {
					res.statusCode = 400;
					return res.send('Error 400 : mp3 url as argument missing');
				} else {
					setAudioPlayer(req.body.command, req.body.argument);
				}
				break;
			default:
				setAudioPlayer(req.body.command);
				break;
		}
		res.statusCode = 200;
		res.send("ok");
	}
});

app.post('/setLampeBureau', function(req, res){
	if(!req.body.hasOwnProperty('toggle')) {
		res.statusCode = 400;
		return res.send('Error 400 : switch value missing!');
	} else {
		setLampeBureau(req.body.toggle);
		res.statusCode = 200;
		res.send("ok");
	}
});

app.post('/setLampeHalogene', function(req, res){
	if(!req.body.hasOwnProperty('toggle')) {
		res.statusCode = 400;
		return res.send('Error 400 : switch value missing!');
	} else {
		setLampeHalogene(req.body.toggle);
		res.statusCode = 200;
		res.send("ok");
	}
});

//UPnP
var UpnpControlPoint = require("../lib/upnp-controlpoint").UpnpControlPoint;
var cp = new UpnpControlPoint();
cp.search();
cp.on("device", function(device){
	uPnPdevices[device.deviceType] = device;

	switch(device.deviceType) {
		//Not implemented
		/*case 'urn:schemas-upnp-org:device:PhotoTextViewer:1':
			device.services['urn:schemas-upnp-org:serviceId:1'].subscribe(function() {
				device.services['urn:schemas-upnp-org:serviceId:1'].on("stateChange", function(value) {
					console.log("PhotoTextViewer:1");
					console.log(JSON.stringify(value));
				});
			});
			device.services['urn:schemas-upnp-org:serviceId:2'].subscribe(function() {
				device.services['urn:schemas-upnp-org:serviceId:2'].on("stateChange", function(value) {
					console.log("PhotoTextViewer:2");
					console.log(JSON.stringify(value));
				});
			});
		break;*/
		//Not implemented
		/*case 'urn:schemas-upnp-org:device:AudioPlayer:1':
			device.services['urn:schemas-upnp-org:serviceId:1'].subscribe(function() {
				device.services['urn:schemas-upnp-org:serviceId:1'].on("stateChange", function(value) {
					console.log("AudioPlayer:1");
					console.log(JSON.stringify(value));
				});
			});
		break;*/
		//Not implemented
		/*case 'urn:schemas-upnp-org:device:X10CM11:1':
			device.services['urn:schemas-upnp-org:serviceId:2'].subscribe(function() {
				device.services['urn:schemas-upnp-org:serviceId:2'].on("stateChange", function(value) {
					console.log("X10CM11:1");
				});
			});
		break;*/
		case 'urn:schemas-upnp-org:device:Phidget:1':
			device.services['urn:schemas-upnp-org:serviceId:1'].subscribe(function() {
				device.services['urn:schemas-upnp-org:serviceId:1'].on("stateChange", function(value) {
					var xml = value.Notification;
					var parser = new xml2js.Parser();
					try {
						parser.parseString(xml, function(err, result) {
							if (err) {
								console.log("got XML parsing err: " + err);
								return;
							}
							sensor['RFID'].push(result);
							console.log("RFID: user id " + result.tagInfo.$.id + " ("+result.tagInfo.$.value+") " + result.tagInfo.$.action + " on "+ result.tagInfo.$.date);
							/*
								value template (gained/lost):
								{ tagInfo: 
								   { '$': 
								      { action: 'gained',
								        date: 'Mon Feb 24 11:42:12 CET 2014',
								        id: '4d004ae50e',
								        value: 'leNom' },
								     phidget: [ [Object] ] } }

								phidget template:
								[ { '$': 
							     { name: 'Phidget RFID Read-Write',
							       serial: '332733',
							       version: '100' } } ]
							*/
						});
					} catch (exception) {
						console.log("RFID exception: " + exception);
					}
				});
			});
		break;
	}
});

function getDevice(device) {
	return sensor[device];
}

function setDevice(device, service, action, parameters, sensorName) {
	uPnPdevices[device].services[service].callAction(action, parameters, function(err, buf) {
		if (err) {
			console.log("got err when performing action: " + err + " => " + buf);
		} else {
			console.log("got SOAP reponse: " + buf);
			if(sensor[sensorName] == null) sensor[sensorName] = new Array();
			sensor[sensorName].push({date: new Date(), value: buf});
		}
	});
}

function getLastText() {
	return (getText())[getText().length - 1];
}

function setText(text) {
	uPnPdevices['urn:schemas-upnp-org:device:PhotoTextViewer:1'].services['urn:schemas-upnp-org:serviceId:2'].callAction("SetText", { Text: text }, function(err, buf) {
		if (err) {
			console.log("got err when performing action: " + err + " => " + buf);
		} else {
			console.log("got SOAP reponse: " + buf);
			sensor['PhotoTextViewer'].text.push({date: new Date(), value: text});
			console.log(getLastText());
		}
	});
}

function setPicture(url) {
	uPnPdevices['urn:schemas-upnp-org:device:PhotoTextViewer:1'].services['urn:schemas-upnp-org:serviceId:1'].callAction("SetPicture", { Picture: url }, function(err, buf) {
		if (err) {
			console.log("got err when performing action: " + err + " => " + buf);
		} else {
			console.log("got SOAP reponse: " + buf);
			sensor['PhotoTextViewer'].picture.push({date: new Date(), value: url});
		}
	});
}

function getAudioPlayer() {
	return getDevice('AudioPlayer');
}

function getLastAudioPlayer() {
	return (getAudioPlayer())[getAudioPlayer().length - 1];
}

function setAudioPlayer(command, url) {
	console.log(command+" "+url);
	uPnPdevices['urn:schemas-upnp-org:device:AudioPlayer:1'].services['urn:schemas-upnp-org:serviceId:1'].callAction("ExecuteCommand", { ElementName: "Lecteur_Audio", Command: command, Argument: url }, function(err, buf) {
		if (err) {
			console.log("got err when performing action: " + err + " => " + buf);
		} else {
			console.log("got SOAP reponse: " + buf);
			sensor['AudioPlayer'].push({date: new Date(), command: command, argument: url});
			getLastAudioPlayer();
		}
	});
}

function getRFID() {
	return getDevice('RFID');
}

function getLastRFID() {
	return (getRFID())[getRFID().length - 1];
}

function getLampeBureau() {
	return getDevice('LampeBureau');
}

function getLastLampeBureau() {
	return (getDevice('LampeBureau'))[getDevice('LampeBureau').length - 1];
}

function setLampeBureau(toggle) {
	setDevice('urn:schemas-upnp-org:device:X10CM11:1', 'urn:schemas-upnp-org:serviceId:2', "ExecuteCommand", {ElementName: "Lampe_Bureau", Command: toggle }, "LampeBureau");
}

function getLampeHalogene() {
	return getDevice('LampeHalogene');
}

function getLastLampeHalogene() {
	return (getDevice('LampeHalogene'))[getDevice('LampeHalogene').length - 1];
}

function setLampeHalogene(toggle) {
	setDevice('urn:schemas-upnp-org:device:X10CM11:1', 'urn:schemas-upnp-org:serviceId:2', "ExecuteCommand", {ElementName: "Lampe_Halogene", Command: toggle }, "LampeHalogene");
}

//Events
var events = require('events');
var eventEmitter = new events.EventEmitter();




distance = function(x1, y1, x2, y2){
	return Math.sqrt(Math.pow(x1-x2,2) + Math.pow(y1-y2));
}

function distFrom(lat1, lng1, lat2, lng2) {
	var toRadians = function(d){ return 	d * (Math.PI / 180);}

    var earthRadius = 6369;
    var dLat = toRadians(lat2-lat1);
    var dLng = toRadians(lng2-lng1);
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
               Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
               Math.sin(dLng/2) * Math.sin(dLng/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var dist = earthRadius * c;
    return dist;
}

//Events handling
handlePositionChange = function(){
	var d = distFrom(sensor['Android'].positionX, sensor['Android'].positionY, homePositionX, homePositionY);
	var val = 'off';
	if(d < distanceForLight)
		val = 'on';
	setSensor('Lamp', 'power', val);
}

handleUserInKitchen = function(){
	if(sensor['userInKitchen'].isPresent){
		if(Date.now() - lastKitchenAppearance)

		lastKitchenAppearance = Date.now();
	}
}

//events availables
eventEmitter.on('positionChange', handlePositionChange);
eventEmitter.on('userInKitchen', handleUserInKitchen);

/*--------------------------------------------------    Service REST    --------------------------------------------------------*/

//Position GPS Android
app.post('/geoloc', function(sReq, sRes){
	console.log("Requete recu: "+ JSON.stringify(sReq.body));

	//Verifie qu'on a les parametres requis
	if(!sReq.body.hasOwnProperty('latitude') || !sReq.body.hasOwnProperty('longitude')) {
		sRes.statusCode = 400;
		return sRes.send('Error 400: Post syntax incorrect.');
	}
	else {
		var latitude = decodeDataFromAndroid(sReq.body.latitude);
		var longitude = decodeDataFromAndroid(sReq.body.latitude);
		var date = new Date();
		sensor['Android_GPS'].push({position : {latitude: latitude, longitude: longitude}, date: date});
		events.emit('positionChange');
		console.log("sensor['Android_GPS']: "+ JSON.stringify(sensor['Android_GPS']));
		sRes.statusCode = 200;
		sRes.send("Requete geoloc : OK");
	}

});

//Voice Android
app.post('/voix', function(sReq, sRes){
	console.log("Requete recu: "+ JSON.stringify(sReq.body));

	//Verifie qu'on a les parametres requis
	if(!sReq.body.hasOwnProperty('voix')) {
		sRes.statusCode = 400;
		return sRes.send('Error 400: Post syntax incorrect.');
	}
	else {
		var voix = decodeDataFromAndroid(sReq.body.voix);
		console.log("voix : " + voix);
		var date = new Date();
		sensor['Android_Voice'].push({voix: voix, date: date});
		console.log("sensor['Android_Voice']: "+ JSON.stringify(sensor['Android_Voice']));
		sRes.statusCode = 200;
		sRes.send("Requete voix : OK");
	}

});

//Accelero Android
app.post('/accelero', function(sReq, sRes){
	console.log("Requete recu: "+ JSON.stringify(sReq.body));

	//Verifie qu'on a les parametres requis
	if(!sReq.body.hasOwnProperty('x') || !sReq.body.hasOwnProperty('y') || !sReq.body.hasOwnProperty('z')) {
		sRes.statusCode = 400;
		return sRes.send('Error 400: Post syntax incorrect.');
	}
	else {
		var x = decodeDataFromAndroid(sReq.body.x);
		var y = decodeDataFromAndroid(sReq.body.y);
		var z = decodeDataFromAndroid(sReq.body.z);
		var date = new Date();
		sensor['Android_Accelero'].push({position : {x: x, y: y, z: z}, date: date});
		console.log("sensor['Android_Accelero']: "+ JSON.stringify(sensor['Android_Accelero']));
		sRes.statusCode = 200;
		sRes.send("Requete accelero : OK");
	}

});

function decodeDataFromAndroid(data){
	return decodeURI(data.split('+').join('%20'));
}
