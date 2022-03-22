const REDIRECT_URI = window.location.origin + '/';
const CLIENT_ID = '229d83fe4d794c548af6b891c2926386';

let access_token = null;
let refresh_token = null;
let trackURI = null;
let spotify_username = null;

let retry_allowed = true;

function onPageLoad() {
	if (window.location.search.length > 0) {
		handleRedirect();
	} else {
		access_token = getCookie('access_token');
		refresh_token = getCookie('refresh_token');

		if (refresh_token === '') {
			logOut();
		} else {
			getUserProfile();
		}
	}
}

function handleRedirect() {
	let code = getCode();
	if (code != null) {
		window.history.pushState('', '', REDIRECT_URI);
		fetchAccessToken(code);
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
	if (refresh_token === '' || refresh_token === null) {
		return false;
	} else {
		const response = await fetch('/refresh-access-token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ refresh_token: refresh_token }),
		});

		const data = await response.json();

		if (data.access_token != undefined) {
			access_token = data.access_token;
			setCookie('access_token', access_token);
			return true;
		} else {
			logOut();
			return false;
		}
	}
}

function animateCSS(element, animation, prefix = 'animate__') {
	return new Promise((resolve, reject) => {
		const animationName = `${prefix}${animation}`;
		const node = document.querySelector(element);

		node.classList.add(`${prefix}animated`, animationName);

		function handleAnimationEnd(event) {
			event.stopPropagation();
			node.classList.remove(`${prefix}animated`, animationName);
			resolve('Animation ended');
		}

		node.addEventListener('animationend', handleAnimationEnd, { once: true });
	});
}

async function getUserProfile() {
	let result = await refreshAccessToken();

	if (result) {
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

				document.getElementById('splash-container').style.display = 'none';
				document.getElementById('mood-select-container').style.display = 'block';
				document.getElementById('title').style.marginTop = '0.5vh';
				document.getElementById('title').style.fontSize = '35px';
				document.getElementById('title').style.display = 'block';
				animateCSS('#title', 'fadeIn');
				animateCSS('#emoji-btns-container', 'zoomIn');
				animateCSS('#mood-description', 'fadeIn');

				document.getElementById('spotify-user-profile').src = data.images[0].url;
				document.getElementById('spotify-user-name').innerText = data.display_name;
				document.getElementById('user-info-container').style.display = 'flex';
				document.getElementById('logout-btn').style.display = 'flex';

				animateCSS('#user-info-container', 'fadeIn');
				animateCSS('#logout-btn', 'fadeIn');
			});
		});
	}
}

async function getUserTopTracks(mood) {
	let result = await refreshAccessToken();

	if (result) {
		document.getElementById('mood-select-container').style.display = 'none';
		document.getElementById('loading-container').style.display = 'block';
		animateCSS('#loading-container', 'fadeIn');

		let top_tracks = [];

		let time_range_choices = ['short_term', 'medium_term', 'long_term'];

		const time_range = time_range_choices[Math.floor(Math.random() * time_range_choices.length)];

		fetch(`https://api.spotify.com/v1/me/top/tracks?time_range=${time_range}&limit=50`, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				Authorization: 'Bearer ' + access_token,
			},
		}).then((response) => {
			response.json().then(async (data) => {
				for (let track of data.items) {
					top_tracks.push(track.id);
				}

				// shuffles the array
				for (let i = top_tracks.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					[top_tracks[i], top_tracks[j]] = [top_tracks[j], top_tracks[i]];
				}

				let top_5 = top_tracks.slice(0, 5);

				getRecommendations(top_5, mood);
			});
		});
	}
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
	mood += (Math.random() * 2 - 1) / 13.33;
	mood = Math.min(Math.max(mood, 0), 1);

	let url = `https://api.spotify.com/v1/recommendations?target_valence=${mood}&target_energy=${mood}&target_danceability=${mood}&limit=20&seed_tracks=`;
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
			let recommended_track = null;
			let used_tracks = getCookie('used_tracks');

			if (used_tracks === '') {
				used_tracks = [];
			} else {
				used_tracks = JSON.parse(used_tracks);
			}

			for (let track of data.tracks) {
				if (!used_tracks.includes(track.id)) {
					recommended_track = track;
					used_tracks.push(recommended_track.id);
					setCookie('used_tracks', JSON.stringify(used_tracks));
					break;
				}
			}

			if (recommended_track === null) {
				recommended_track = data.tracks[Math.floor(Math.random() * data.tracks.length)];
			}

			document.getElementById('recommended-track-image').src = recommended_track.album.images[1].url;

			let track_artists = [];

			for (let artist of recommended_track.artists) {
				track_artists.push(artist.name);
			}

			document.getElementById('recommended-track-name').innerText = recommended_track.name;
			document.getElementById('recommended-track-artists').innerText = track_artists.join(', ');

			trackURI = recommended_track.id;

			document.getElementById('loading-container').style.display = 'none';
			document.getElementById('recommendation-container').style.display = 'block';
			document.getElementById('recommendation-btn-container').style.display = 'block';
			animateCSS('#recommendation-container', 'zoomIn');
			animateCSS('#recommendation-btn-container', 'fadeIn');

			window.history.pushState('', '', `${REDIRECT_URI}?track=${trackURI}`);

			retry_allowed = false;

			setTimeout(() => {
				retry_allowed = true;
			}, 1000 * 30);
		});
	});
}

function reset() {
	if (retry_allowed) {
		document.getElementById('recommendation-container').style.display = 'none';
		document.getElementById('mood-select-container').style.display = 'block';
		document.getElementById('recommendation-btn-container').style.display = 'none';

		animateCSS('#emoji-btns-container', 'zoomIn');
		animateCSS('#mood-description', 'fadeIn');

		window.history.pushState('', '', REDIRECT_URI);
	} else {
		let retry_modal = new bootstrap.Modal(document.getElementById('retry-modal'));
		retry_modal.show();

		document.getElementById('close-modal-btn').onclick = function () {
			retry_modal.hide();
		};
	}
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
	document.getElementById('title').style.display = 'block';

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
	window.location.href = `https://open.spotify.com/track/${trackURI}`;
}
