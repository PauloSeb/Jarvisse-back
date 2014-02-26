//Global vars
var uPnPdevices = new Array();
var sensor = new Array();

//REST
var express = require('express');
var app = express();
app.use(express.bodyParser());
app.listen(5000);
console.log("Server listening on port 5000");

//UPnP
var UpnpControlPoint = require("../lib/upnp-controlpoint").UpnpControlPoint;
var cp = new UpnpControlPoint();
cp.search();
cp.on("device", function(device){
	uPnPdevices[device.deviceType] = device;
});

/*--------------------------------------------------    Service REST    --------------------------------------------------------*/
sensor['Android_GPS'] =  new Array();

//Position GPS
app.post('/geoloc', function(sReq, sRes){
	console.log("Requete recu: "+ JSON.stringify(sReq.body));

	//Verifie qu'on a les parametres requis
	if(!sReq.body.hasOwnProperty('latitude') || !sReq.body.hasOwnProperty('longitude')) {
		sRes.statusCode = 400;
		return sRes.send('Error 400: Post syntax incorrect.');
	}
	else {
		var latitude = sReq.body.latitude;
		var longitude = sReq.body.latitude;
		var date = new Date();
		sensor['Android_GPS'].push({position : {latitude: latitude, longitude: longitude}, date: date});
		console.log("sensor['Android_GPS']: "+ JSON.stringify(sensor['Android_GPS']));
		sRes.statusCode = 200;
		sRes.send("OK");
	}

});