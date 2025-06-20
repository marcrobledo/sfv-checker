/*
	Cache Service Worker template by mrc 2019
	mostly based in:
	https://github.com/GoogleChrome/samples/blob/gh-pages/service-worker/basic/service-worker.js
	https://github.com/chriscoyier/Simple-Offline-Site/blob/master/js/service-worker.js
	https://gist.github.com/kosamari/7c5d1e8449b2fbc97d372675f16b566e	
	
	Note for GitHub Pages:
	there can be an unexpected behaviour (cache not updating) when site is accessed from
	https://user.github.io/repo/ (without index.html) in some browsers (Firefox)
	use absolute paths if hosted in GitHub Pages in order to avoid it
	also invoke sw with an absolute path:
	navigator.serviceWorker.register('/repo/_cache_service_worker.js', {scope: '/repo/'})
*/


var PRECACHE_ID='sfv-checker';
var PRECACHE_VERSION='v13';
var PRECACHE_URLS=[
'/sfv-checker/index.html','/sfv-checker/',
'/sfv-checker/manifest.json',
'/sfv-checker/app/style.css',
'/sfv-checker/app/sfv-checker.js',
'/sfv-checker/app/crc32.js',
'/sfv-checker/app/md5.js',
'/sfv-checker/app/sha1.js',
'/sfv-checker/app/locale.js',
'/sfv-checker/app/web_worker.js',
'/sfv-checker/app/resources/icon_pwa192.png',
'/sfv-checker/app/resources/favicon_crc32.png',
'/sfv-checker/app/resources/favicon_md5.png',
'/sfv-checker/app/resources/favicon_sha1.png',
'/sfv-checker/app/resources/logo192_crc32.png',
'/sfv-checker/app/resources/logo192_md5.png',
'/sfv-checker/app/resources/logo192_sha1.png'
];



// install event (fired when sw is first installed): opens a new cache
self.addEventListener('install', evt => {
	evt.waitUntil(
		caches.open('precache-'+PRECACHE_ID+'-'+PRECACHE_VERSION)
			.then(cache => cache.addAll(PRECACHE_URLS))
			.then(self.skipWaiting())
	);
});


// activate event (fired when sw is has been successfully installed): cleans up old outdated caches
self.addEventListener('activate', evt => {
	evt.waitUntil(
		caches.keys().then(cacheNames => {
			return cacheNames.filter(cacheName => (cacheName.startsWith('precache-'+PRECACHE_ID+'-') && !cacheName.endsWith('-'+PRECACHE_VERSION)));
		}).then(cachesToDelete => {
			return Promise.all(cachesToDelete.map(cacheToDelete => {
				console.log('delete '+cacheToDelete);
				return caches.delete(cacheToDelete);
			}));
		}).then(() => self.clients.claim())
	);
});


// fetch event (fired when requesting a resource): returns cached resource when possible
self.addEventListener('fetch', evt => {
	if(evt.request.url.startsWith(self.location.origin)){ //skip cross-origin requests
		evt.respondWith(
			caches.match(evt.request).then(cachedResource => {
				if (cachedResource) {
					return cachedResource;
				}else{
					return fetch(evt.request);
				}
			})
		);
	}
});