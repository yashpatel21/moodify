const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5500;

const CLIENT_ID = '229d83fe4d794c548af6b891c2926386';
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

app.use(express.static('public'));
app.use(express.json());

app.get('/', function (req, res, next) {
	if (req.protocol == 'http') {
		res.redirect('https://' + req.get('host') + req.originalUrl);
	}
});

app.get('/get-temp-access-token', (req, res) => {
	fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			Authorization: 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: 'grant_type=client_credentials',
		json: true,
	}).then((response) => {
		response.json().then((data) => {
			res.json({ access_token: data.access_token });
		});
	});
});

app.post('/get-access-token', (req, res) => {
	fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			Authorization: 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: `grant_type=authorization_code&code=${req.body.code}&redirect_uri=${encodeURI(
			REDIRECT_URI
		)}&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`,
		json: true,
	}).then((response) => {
		response.json().then((data) => {
			res.json(data);
		});
	});
});

app.post('/refresh-access-token', (req, res) => {
	fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			Authorization: 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: `grant_type=refresh_token&refresh_token=${req.body.refresh_token}&client_id=${CLIENT_ID}`,
		json: true,
	}).then((response) => {
		response.json().then((data) => {
			res.json(data);
		});
	});
});

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});
