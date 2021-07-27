var puppeteer = require('puppeteer');

// https://hackernoon.com/tips-and-tricks-for-web-scraping-with-puppeteer-ed391a63d952
// Dont download all resources, we just need the HTML
// Also, this is huge performance/response time boost
const blockedResourceTypes = [
	'image',
	'media',
	'font',
	'texttrack',
	'object',
	'beacon',
	'csp_report',
	'imageset',
];

const skippedResources = [
	'quantserve',
	'adzerk',
	'doubleclick',
	'adition',
	'exelator',
	'sharethrough',
	'cdn.api.twitter',
	'google-analytics',
	'googletagmanager',
	'google',
	'fontawesome',
	'facebook',
	'analytics',
	'optimizely',
	'clicktale',
	'mixpanel',
	'zedo',
	'clicksor',
	'tiqcdn',
];

/**
 * https://developers.google.com/web/tools/puppeteer/articles/ssr#reuseinstance
 * @param {string} url URL to prerender.
 * @param {string} browserWSEndpoint Optional remote debugging URL. If
 *     provided, Puppeteer's reconnects to the browser instance. Otherwise,
 *     a new browser instance is launched.
 */
var ssr = async function (url, browserWSEndpoint) {

	const browser = await puppeteer.connect({ browserWSEndpoint});

	try {
		const page = await browser.newPage();
		await page.setRequestInterception(true);

		page.on('request', request => {
			const requestUrl = request._url.split('?')[0].split('#')[0];
			if (
				blockedResourceTypes.indexOf(request.resourceType()) !== -1 ||
				skippedResources.some(resource => requestUrl.indexOf(resource) !== -1)
			) {
				request.abort();
			} else {
				request.continue();
			}
		})

		const response = await page.goto(url, {
			timeout: 25000,
			waitUntil: 'networkidle0'
		});

		// Inject <base> on page to relative resources load properly.
		await page.evaluate(url => {
			const base = document.createElement('base');
			base.href = url;
			
			// Add to top of head, before all other resources.
			document.head.prepend(base);
		}, url);

		// Remove scripts and html imports. They've already executed.
		await page.evaluate(() => {
			
			const elements = document.querySelectorAll('link[rel="import"]');
			// CHERRY PICKS SCRIPTS THAT ARE NOT LD+JSON
			Array.prototype.slice.call(
				document.getElementsByTagName("script")).filter(function(script) {
        	return script.type != "application/ld+json";
				}).forEach(function(script) {
					script.parentNode.removeChild(script);
				});
			// const fb = document.getElementById('facebook-jssdk')
			// fb.remove();
			// const elements = document.querySelectorAll('script, link[rel="import"]');
			elements.forEach(e => e.remove());
		});

		const html = await page.content();

		// Close the page we opened here (not the browser).
		await page.close();

		return { html, status:200 }
	}
	catch (e) {
		console.log(e)
		const html = e.toString();
		console.warn({ message: `URL: ${url} Failed with message: ${html}` })
		return { html, status: 500 }
	}

};
module.exports = ssr