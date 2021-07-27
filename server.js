
var express = require('express');
var puppeteer = require('puppeteer');


var ssr = require( './ssr.js');

const app = express();

const port =  1337;
app.listen(port, () => console.log(`Hey Jabroni!  I listen on http://localhost:${port}`))

app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	next();
});


let browserWSEndpoint = null;
app.get('*', async (req, res, next) => {
	
	const url = `https://www.automizely.com/store-list/top-100-USA-shopify-stores${req.url}`;

	// Spin new instance if we dont have an active one
	if (!browserWSEndpoint) {
		const browser = await puppeteer.launch({headless:true, args:['--no-sandbox']});
		browserWSEndpoint = await browser.wsEndpoint();
	}

	const { html, status } = await ssr(url, browserWSEndpoint);
	// console.timeEnd(`URL_START:${url}`)
	return res.status(status).send(html);
})