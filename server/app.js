/*--------------------------------------------------    Global Vars    --------------------------------------------------------*/
var UpnpControlPoint = require("../lib/upnp-controlpoint").UpnpControlPoint;
var cp = new UpnpControlPoint();
var uPnPdevices = new Array();
var sensor = new Array();

var http = require('http');
var fs = require('fs');
var path = require('path');

var xml2js = require('xml2js');

var homePosition = {latitude:0, longitude: 0};
var distanceForLight = 50; //en mètres

var lastKitchenAppearance = 0;
var kitchenFirstHour = 18;
var kitchenLastHour = 22;

/*--------------------------------------------------    IP Adress   --------------------------------------------------------*/
var os = require( 'os' );
var networkInterfaces = os.networkInterfaces();
var ipAddress = (networkInterfaces.en1)[1].address;
console.log("IP address : " + (networkInterfaces.en1)[1].address );

/*--------------------------------------------------    UPnP    --------------------------------------------------------*/
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

/*--------------------------------------------------    Events    --------------------------------------------------------*/
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
	var last_pos = sensor['Android_GPS'][sensor['Android_GPS'].length-1];
	var d = distFrom(
		last_pos.latitude, 
		last_pos.longitude, 
		homePosition.latitude, 
		homePosition.longitude
	);
	var val = 'off';
	if(d < distanceForLight)
		val = 'on';
	setSensor('Lamp', 'power', val);
}

handleUserInKitchen = function(){
	if(sensor['userInKitchen'].isPresent){
		if((Date.now() - lastKitchenAppearance) >  (kitchenFirstHour - kitchenLastHour) * 3600)

		lastKitchenAppearance = Date.now();
	}
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

//MP3 à lire
app.get('/voice.mp3', function(req, res){
	var filepath = path.join(__dirname, 'voice.mp3');
	var stat = fs.statSync(filepath);

	res.writeHead(200, {
		'Content-Type': 'audio/mpeg',
		'Content-Length': stat.size
	});

	var readStream = fs.createReadStream(filepath);
	readStream.pipe(res);
});

//Liste tous les capteurs ayant des données
app.get('/textToSpeech', function(req, res) {
	if(!req.query.hasOwnProperty('text')) {
		res.statusCode = 400;
		return res.send('Error 400 : text missing');
	}
	textToSpeech(req.query.text);
	res.send('OK');
});

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
		res.send(JSON.stringify((getSensor(req.query.sensor))[req.query.index]));
	} else {
		res.send(JSON.stringify(getSensor(req.query.sensor)));
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
	console.log(req.body);
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

/*--------------------------------------------------    TTS    --------------------------------------------------------*/

function textToSpeech(text) {
	var query = "http://translate.google.fr/translate_tts?ie=UTF-8&tl=fr&q="+text;
	var file = fs.createWriteStream("voice.mp3");
	var request = http.get(query, function(response) {
	  	var resp = response.pipe(file);
	  	resp.on('close', function () { 
	  		var url = 'http://'+ipAddress+':5000/voice.mp3';
			setSensor("AudioPlayer", "ExecuteCommand", {ElementName: "Lecteur_Audio", Command: "play", Argument: url});
	  	});
	});
}
