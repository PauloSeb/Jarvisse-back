var requestify = require('requestify');

/*requestify.post('http://localhost:5000/setText', {text: "De retour dans 30min apres la pause!"}).then(function(response) {
	console.log(response);
    // Get the response body (JSON parsed or jQuery object for XMLs)
    console.log(response.getBody());
});*/

/*requestify.post('http://localhost:5000/setPicture', {picture: 'http://i-cms.linternaute.com/image_cms/original/1312345-50-magnifiques-couchers-de-soleil.jpg'}).then(function(response) {
	console.log(response);
    // Get the response body (JSON parsed or jQuery object for XMLs)
    console.log(response.getBody());
});*/

/*requestify.post('http://localhost:5000/setAudioPlayer', {command: "play", argument: "http://www.stephaniequinn.com/Music/Canon.mp3"}).then(function(response) {
	console.log(response);
    // Get the response body (JSON parsed or jQuery object for XMLs)
    console.log(response.getBody());
});*/

/*requestify.post('http://localhost:5000/setAudioPlayer', {command: "stop"}).then(function(response) {
	console.log(response);
    // Get the response body (JSON parsed or jQuery object for XMLs)
    console.log(response.getBody());
});*/

requestify.post('http://localhost:5000/setSensor', {sensor: "AudioPlayer", action: "ExecuteCommand", parameters: {ElementName: "Lecteur_Audio", Command: "stop"}}).then(function(response) {
    // Get the response body (JSON parsed or jQuery object for XMLs)
    console.log(response.getBody());
});