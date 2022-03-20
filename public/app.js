// const REDIRECT_URI = 'https://moodify2.herokuapp.com/';
const REDIRECT_URI = 'http://localhost:5500/';
const CLIENT_ID = '229d83fe4d794c548af6b891c2926386';

let access_token = null;
let refresh_token = null;
let trackURI = null;
let spotify_username = null;

function onPageLoad() {
	if (window.location.search.length > 0) {
		handleRedirect();
	} else {
		access_token = getCookie('access_token');
		if (access_token == '') {
			document.getElementById('splash-container').style.display = 'block';
			document.getElementById('title').style.display = 'block';
			animateCSS('#title', 'fadeIn');
			animateCSS('#splash-container', 'fadeIn');
		} else {
			refreshAccessToken();

			document.getElementById('splash-container').style.display = 'none';
			document.getElementById('mood-select-container').style.display = 'block';
			document.getElementById('title').style.marginTop = '0.5vh';
			document.getElementById('title').style.fontSize = '35px';
			document.getElementById('title').style.display = 'block';
			animateCSS('#title', 'fadeIn');
			animateCSS('#emoji-btns-container', 'zoomIn');
			animateCSS('#mood-description', 'fadeIn');

			getUserProfile();
		}
	}
}

function handleRedirect() {
	let code = getCode();
	if (code != null) {
		fetchAccessToken(code);
		window.history.pushState('', '', REDIRECT_URI);
	} else {
		trackURI = getQueryTrackURI();

		if (trackURI != null) {
			fetchTemporaryAccessToken();
		}
	}
}

function getQueryTrackURI() {
	let trackURI = null;
	const queryString = window.location.search;
	if (queryString.length > 0) {
		const urlParams = new URLSearchParams(queryString);
		trackURI = urlParams.get('track');
	}
	return trackURI;
}

function getCode() {
	let code = null;
	const queryString = window.location.search;
	if (queryString.length > 0) {
		const urlParams = new URLSearchParams(queryString);
		code = urlParams.get('code');
	}
	return code;
}

function requestAuth() {
	let url = 'https://accounts.spotify.com/authorize';
	url += '?client_id=' + CLIENT_ID;
	url += '&response_type=code';
	url += '&redirect_uri=' + encodeURI(REDIRECT_URI);
	url += '&show_dialog=true';
	url += '&scope=user-read-email user-top-read';
	window.location.href = url;
}

function fetchTemporaryAccessToken() {
	fetch('/get-temp-access-token', {
		method: 'GET',
	}).then((response) => {
		response.json().then((data) => {
			access_token = data.access_token;

			getTrackData();
		});
	});
}

function fetchAccessToken(code) {
	fetch('/get-access-token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ code: code }),
	}).then((response) => {
		response.json().then((data) => {
			if (data.access_token != undefined) {
				access_token = data.access_token;
				setCookie('access_token', access_token);
			}
			if (data.refresh_token != undefined) {
				refresh_token = data.refresh_token;
				setCookie('refresh_token', refresh_token);
			}
			onPageLoad();
		});
	});
}

async function refreshAccessToken() {
	refresh_token = getCookie('refresh_token');

	const response = await fetch('/refresh-access-token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ refresh_token: refresh_token }),
	});
	response.json().then((data) => {
		if (data.access_token != undefined) {
			access_token = data.access_token;
			setCookie('access_token', access_token);
		}
	});
}

const animateCSS = (element, animation, prefix = 'animate__') =>
	// We create a Promise and return it
	new Promise((resolve, reject) => {
		const animationName = `${prefix}${animation}`;
		const node = document.querySelector(element);

		node.classList.add(`${prefix}animated`, animationName);

		// When the animation ends, we clean the classes and resolve the Promise
		function handleAnimationEnd(event) {
			event.stopPropagation();
			node.classList.remove(`${prefix}animated`, animationName);
			resolve('Animation ended');
		}

		node.addEventListener('animationend', handleAnimationEnd, { once: true });
	});

function getUserProfile() {
	fetch('https://api.spotify.com/v1/me', {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: 'Bearer ' + access_token,
		},
	}).then((response) => {
		response.json().then((data) => {
			spotify_username = data.display_name;

			document.getElementById('spotify-user-profile').src = data.images[0].url;
			document.getElementById('spotify-user-name').innerText = data.display_name;
			document.getElementById('user-info-container').style.display = 'flex';
			document.getElementById('logout-btn').style.display = 'flex';

			animateCSS('#user-info-container', 'fadeIn');
			animateCSS('#logout-btn', 'fadeIn');
		});
	});
}

async function getUserTopTracks(mood) {
	document.getElementById('mood-select-container').style.display = 'none';

	let top_tracks = [];

	let time_range = Math.random() < 0.5 ? 'short_term' : 'medium_term';

	await refreshAccessToken();

	fetch(`https://api.spotify.com/v1/me/top/tracks?time_range=${time_range}&limit=50`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: 'Bearer ' + access_token,
		},
	}).then((response) => {
		response.json().then((data) => {
			for (let track of data.items) {
				top_tracks.push(track.id);
			}

			let top_5 = pickRandomNfromArray(top_tracks, 5);
			getRecommendations(top_5, mood);
		});
	});
}

function pickRandomNfromArray(array, n) {
	return array.sort(() => 0.5 - Math.random()).slice(0, n);
}

function getTrackData() {
	fetch(`https://api.spotify.com/v1/tracks/${trackURI}`, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: 'Bearer ' + access_token,
		},
	}).then((response) => {
		response.json().then((track) => {
			document.getElementById('recommended-track-image').src = track.album.images[1].url;

			let track_artists = [];

			for (let artist of track.artists) {
				track_artists.push(artist.name);
			}

			document.getElementById('recommended-track-name').innerText = track.name;
			document.getElementById('recommended-track-artists').innerText = track_artists.join(', ');

			document.getElementById('splash-container').style.display = 'none';
			document.getElementById('title').style.marginTop = '0.5vh';
			document.getElementById('title').style.fontSize = '35px';
			document.getElementById('recommendation-container').style.display = 'block';
			document.getElementById('recommendation-btn-container').style.display = 'block';
			document.getElementById('try-yourself-container').style.display = 'block';
			document.getElementById('second-row-btns').style.display = 'none';
			document.getElementById('title').style.marginTop = '0.5vh';
			document.getElementById('title').style.fontSize = '35px';
			document.getElementById('title').style.display = 'block';
			animateCSS('#title', 'fadeIn');

			animateCSS('#recommendation-container', 'zoomIn');
			animateCSS('#recommendation-btn-container', 'fadeIn');
		});
	});
}

function getRecommendations(top_5_tracks, mood) {
	let url = `https://api.spotify.com/v1/recommendations?target_valence=${mood}&target_energy=${mood}&limit=1&seed_tracks=`;
	url += top_5_tracks.join(',');

	fetch(url, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: 'Bearer ' + access_token,
		},
	}).then((response) => {
		response.json().then((data) => {
			for (let track of data.tracks) {
				document.getElementById('recommended-track-image').src = track.album.images[1].url;

				let track_artists = [];

				for (let artist of track.artists) {
					track_artists.push(artist.name);
				}

				document.getElementById('recommended-track-name').innerText = track.name;
				document.getElementById('recommended-track-artists').innerText = track_artists.join(', ');

				trackURI = track.id;
			}

			document.getElementById('recommendation-container').style.display = 'block';
			document.getElementById('recommendation-btn-container').style.display = 'block';
			animateCSS('#recommendation-container', 'zoomIn');
			animateCSS('#recommendation-btn-container', 'fadeIn');

			window.history.pushState('', '', `${REDIRECT_URI}?track=${trackURI}`);
		});
	});
}

function reset() {
	document.getElementById('recommendation-container').style.display = 'none';
	document.getElementById('mood-select-container').style.display = 'block';
	document.getElementById('recommendation-btn-container').style.display = 'none';

	animateCSS('#emoji-btns-container', 'zoomIn');
	animateCSS('#mood-description', 'fadeIn');

	window.history.pushState('', '', REDIRECT_URI);
}

function setCookie(cname, cvalue) {
	const d = new Date();
	d.setTime(d.getTime() + 2592000000);
	let expires = 'expires=' + d.toUTCString();
	document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
}

function getCookie(cname) {
	let name = cname + '=';
	let decodedCookie = decodeURIComponent(document.cookie);
	let ca = decodedCookie.split(';');
	for (let i = 0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return '';
}

function deleteCookie(cname) {
	document.cookie = cname + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

function logOut() {
	deleteCookie('access_token');
	deleteCookie('refresh_token');

	document.getElementById('title').style.marginTop = '30vh';
	document.getElementById('title').style.fontSize = '75px';

	document.getElementById('user-info-container').style.display = 'none';
	document.getElementById('logout-btn').style.display = 'none';
	document.getElementById('mood-select-container').style.display = 'none';
	document.getElementById('recommendation-container').style.display = 'none';
	document.getElementById('recommendation-btn-container').style.display = 'none';
	document.getElementById('splash-container').style.display = 'block';
	window.history.pushState('', '', REDIRECT_URI);

	animateCSS('#title', 'fadeIn');
	animateCSS('#splash-container', 'fadeIn');
}

function goHome() {
	window.location.href = REDIRECT_URI;
}

function share() {
	let data = {
		title: `Moodify results for @${spotify_username}`,
		url: `${REDIRECT_URI}?track=${trackURI}`,
	};

	if (navigator.canShare(data)) {
		navigator
			.share(data)
			.then(() => {
				console.log('Thanks for sharing!');
			})
			.catch(console.error);
	} else {
	}
}

function openSpotify() {
	window.location.href = `spotify:track:${trackURI}`;
}
