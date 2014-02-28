/*--------------------------------------------------    Global Vars    --------------------------------------------------------*/
var xml2js = require('xml2js');
var uPnPdevices = new Array();
var sensor = new Array();

var http = require('http');
var fs = require('fs');
var path = require('path');

var xml2js = require('xml2js');

var homePosition = {latitude: 48.35872394, longitude: -4.57087085};
var distanceForLight = 100; //en mètres

var lastKitchenAppearance = 0;
var kitchenFirstHour = 18;
var kitchenLastHour = 22;

/*--------------------------------------------------    UPnP    --------------------------------------------------------*/

var UpnpControlPoint = require("../lib/upnp-controlpoint").UpnpControlPoint;
var cp = new UpnpControlPoint();
cp.search();
cp.on("device", function(device){
	uPnPdevices[device.deviceType] = device;
	switch(device.deviceType) {
		case 'urn:schemas-upnp-org:device:PhotoTextViewer:1':
			sensor['PhotoTextViewer'] = new Array();
			sensor['PhotoTextViewer'].text = new Array();
			sensor['PhotoTextViewer'].picture = new Array();
		break;
		case 'urn:schemas-upnp-org:device:AudioPlayer:1':
			sensor['AudioPlayer'] = new Array();
		break;
		case 'urn:schemas-upnp-org:device:X10CM11:1':
			sensor['Lampe_Bureau'] = new Array();
			sensor['Lampe_Halogene'] = new Array();
		break;
		case 'urn:schemas-upnp-org:device:Accelero:1':
			sensor['Accelero'] = new Array();
			setInterval(updateAccelero, 2000);
			break;
		case 'urn:schemas-upnp-org:device:Phidget:1':
			sensor['RFID'] = new Array();
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

function listSensor() {
	return Object.keys(sensor);
}

function getSensor(device) {
	return sensor[device];
}

function setSensor(sensorName, action, parameters) {
	switch(sensorName) {
		case 'AudioPlayer':
			setDevice('urn:schemas-upnp-org:device:AudioPlayer:1', 'urn:schemas-upnp-org:serviceId:1', action, parameters, 'AudioPlayer');
			break;
		case 'PhotoTextViewer':
			if(action=="SetText")
				setDevice('urn:schemas-upnp-org:device:PhotoTextViewer:1', 'urn:schemas-upnp-org:serviceId:1', "SetText", parameters, 'PhotoTextViewer');
			if(action=="SetPicture")
				setDevice('urn:schemas-upnp-org:device:PhotoTextViewer:1', 'urn:schemas-upnp-org:serviceId:2', "SetPicture", parameters, 'PhotoTextViewer');
			break;
		case 'Lampe_Bureau':
			setDevice('urn:schemas-upnp-org:device:X10CM11:1', 'urn:schemas-upnp-org:serviceId:2', action, parameters, 'Lampe_Bureau');
			break;
		case 'Lampe_Halogene':
			setDevice('urn:schemas-upnp-org:device:X10CM11:1', 'urn:schemas-upnp-org:serviceId:2', action, parameters, 'Lampe_Halogene');
			break;
		default:
	}
}

function setDevice(device, service, action, parameters, sensorName) {
	uPnPdevices[device].services[service].callAction(action, parameters, function(err, buf) {
		if (err) {
			console.log("got err when performing action: " + err + " => " + buf);
		} else {
			console.log("got SOAP reponse: " + buf);
			setDeviceResponseHandler(sensorName, action, parameters, buf);
			eventEmitter.emit('sensorChange', {sensorName: sensorName, action: action, parameters: parameters, buf: buf});
		}
	});
}

function setDeviceResponseHandler(sensorName, action, parameters, reponse) {
	switch(sensorName) {
		case 'PhotoTextViewer':
			if(action =="SetText") {
				sensor['PhotoTextViewer'].text.push({date: new Date(), value: parameters.Text});
			}
			if(action =="SetPicture") {
				sensor['PhotoTextViewer'].picture.push({date: new Date(), value: parameters.Picture});
			}
			break;
		case 'AudioPlayer':
			sensor['AudioPlayer'].push({date: new Date(), command: action, argument: parameters.url});
			break;
		default:
			sensor[sensorName].push({date: new Date(), value: reponse});
	}
}

function updateAccelero() {
	updateAcceleroOnAxis('X');
	updateAcceleroOnAxis('Y');
	updateAcceleroOnAxis('Z');
}

function updateAcceleroOnAxis(coord) {
	uPnPdevices['urn:schemas-upnp-org:device:Accelero:1'].services['urn:upnp-org:serviceId:506'].callAction('get'+coord+'Value', {}, function(err, buf) {
		if (err) {
			console.log("got err when performing action: " + err + " => " + buf);
		} else {
			var xml = buf;
			var parser = new xml2js.Parser();
			try {
				parser.parseString(xml, function(err, result) {
					if (err) {
						console.log("got XML parsing err: " + err);
						return;
					}
					switch(coord) {
						case 'X':
							var value = result['s:Envelope']['s:Body'][0]['u:getXValueResponse'][0].x[0];
							sensor['Accelero'].push({date: new Date(), axis: 'x', value: value});
							break;
						case 'Y':
							var value = result['s:Envelope']['s:Body'][0]['u:getYValueResponse'][0].y[0];
							sensor['Accelero'].push({date: new Date(), axis: 'y', value: value});
							break
						default:
							var value = result['s:Envelope']['s:Body'][0]['u:getZValueResponse'][0].z[0];
							sensor['Accelero'].push({date: new Date(), axis: 'z', value: value});
					}
				});
			} catch (exception) {
				console.log("Accelero exception: " + exception);
			}
		}
	});
}

/*--------------------------------------------------    Events    --------------------------------------------------------*/
var events = require('events');
var eventEmitter = new events.EventEmitter();

var Sender = require('node-sender');


distance = function(x1, y1, x2, y2){
	return Math.sqrt(Math.pow(x1-x2,2) + Math.pow(y1-y2));
}

function distFrom(lat1, lng1, lat2, lng2) {
	var toRadians = function(d){ return 	d * (Math.PI / 180);}
    var earthRadius = 6369000;
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
	var last_pos = sensor['Android_GPS'][sensor['Android_GPS'].length-1].position;
	var d = distFrom(
		last_pos.latitude, 
		last_pos.longitude, 
		homePosition.latitude, 
		homePosition.longitude
	);
	var val = 'Off';
	if(d < distanceForLight)
		val = 'On';
	setSensor('Lampe_Halogene', 'ExecuteCommand', {ElementName: 'Lampe_Halogene', Command: val});
}

handleUserInKitchen = function(){
	if(sensor['userInKitchen'].isPresent){
		if((Date.now() - lastKitchenAppearance) >  (kitchenLastHour - kitchenFirstHour) * 3600){
			lastKitchenAppearance = Date.now();
			openPizzaApp();
		}

	}
}

openPizzaApp = function(){

	Sender.send({
	    type : Sender.constants.TYPE_ANDROID,           // OS type
	    message : {                                     // message to send
	        msge : "MANGER PIZZAAAAA!"
	    },
	    tokens : "Registration ID here or array IDs",   // phone(s) registration id(s)
	    config : {                                      // settings
	        apiKey : "AIzaSyAw6zbXKboUMwfto1aUSiB9-Jaj-wW8UaA"
	    }
	}, function(err, response){                         // callback
	    console.log(err);
	    console.log(response);
	});
}

//events availables
eventEmitter.on('positionChange', handlePositionChange);
eventEmitter.on('userInKitchen', handleUserInKitchen);

/*--------------------------------------------------    Service REST    --------------------------------------------------------*/

//Setup
var express = require('express');
var app = express();
app.use(express.urlencoded());
app.use(express.json());
app.listen(5000);
console.log("REST Server listening on port 5000");

//Liste tous les capteurs ayant des données
app.get('/listSensor', function(req, res) {
	res.send(JSON.stringify(listSensor()));
});

//Récupérer toutes les données d'un capteur
app.get('/getSensor', function(req, res) {
	if(!req.query.hasOwnProperty('sensor')) {
		res.statusCode = 400;
		return res.send('Error 400 : sensor missing');
	}
	if(!req.query.hasOwnProperty('index')) {
		res.send(JSON.stringify(getSensor(req.query.sensor)));
	} else {
		res.send(JSON.stringify((getSensor(req.query.sensor))[req.query.index]));
	}
});

//Récupérer la dernière donnée d'un capteur
app.get('/getSensorLast', function(req, res) {
	if(!req.query.hasOwnProperty('sensor')) {
		res.statusCode = 400;
		return res.send('Error 400 : sensor missing');
	}
	res.send(JSON.stringify((getSensor(req.query.sensor))[(getSensor(req.query.sensor)).length-1]));
});

//Actionner un device
app.post('/setSensor', function(req, res){
	if(!req.body.hasOwnProperty('sensor')) {
		res.statusCode = 400;
		return res.send('Set sensor : ' + listSensor());
	}
	if(!req.body.hasOwnProperty('action')) {
		res.statusCode = 400;
		return res.send('Action missing (usually ElementName)');
	}
	if(!req.body.hasOwnProperty('parameters')) {
		res.statusCode = 400;
		return res.send('Parameters missing');
	}
	setSensor(req.body.sensor, req.body.action, req.body.parameters);
	res.send(JSON.stringify({sensor: req.sensor, action: req.body.action, parameters: req.body.parameters}));
});

//Position GPS Android
app.post('/geoloc', function(sReq, sRes){
	console.log("Requete recu: "+ JSON.stringify(sReq.body));

	//Verifie qu'on a les parametres requis
	if(!sReq.body.hasOwnProperty('latitude') || !sReq.body.hasOwnProperty('longitude')) {
		sRes.statusCode = 400;
		return sRes.send('Error 400: Post syntax incorrect.');
	}
	else {
		if(sensor['Android_GPS'] == null) sensor['Android_GPS'] =  new Array();
			
		var latitude = decodeDataFromAndroid(sReq.body.latitude);
		var longitude = decodeDataFromAndroid(sReq.body.longitude);
		var date = new Date();
		sensor['Android_GPS'].push({position : {latitude: latitude, longitude: longitude}, date: date});
		eventEmitter.emit('positionChange');
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
		if(sensor['Android_Voice'] == null) sensor['Android_Voice'] =  new Array();

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
		if(sensor['Android_Accelero'] == null) sensor['Android_Accelero'] =  new Array();

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
