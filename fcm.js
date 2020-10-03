var bodyparser = require('body-parser');
var admin = require("firebase-admin");

var serviceAccount = require("./translator-290000-firebase-adminsdk-yspq4-5475d8026a.json");

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: "https://translator-290000.firebaseio.com"
});

const notification_options = {
	priority: "high",
	timeToLive: 60 * 60 * 24
};

function sendPushNotification(deviceToken, title, message) {
	const message_notification = {
			notification: {
			title: title,
			body: message
			}
		};

	admin.messaging().sendToDevice(deviceToken, message_notification, notification_options)
	.then( response => {
		console.log("notification sent successfully sent")
	})
	.catch( error => {
		console.log(error);
	});
}

module.exports = {sendPushNotification}