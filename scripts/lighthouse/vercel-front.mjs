// vercel-front.mjs — a Vercel-like edge in front of `vite preview`: TLS and HTTP/2, brotli,
// Vercel's cache-control on static files, and a fixed delay on HTML standing in for the
// server function (production answers in about 75 ms when warm; 300 ms reproduces its slow mode).
//   node vercel-front.mjs <upstream-port> <listen-port> <html-delay-ms> <cert-dir>
// <cert-dir> holds key.pem and cert.pem (lh-recipe.sh setup makes a throwaway pair);
// Chrome needs --ignore-certificate-errors.
import http2 from 'node:http2';
import http from 'node:http';
import zlib from 'node:zlib';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const [up = '5212', listen = '5214', delay = '70', certDir] = process.argv.slice(2);
if (!certDir)
	throw new Error(
		'usage: vercel-front.mjs <upstream-port> <listen-port> <html-delay-ms> <cert-dir>'
	);
const compressible = /^(text\/|application\/(javascript|json|xml)|image\/svg)/;
const hop = new Set([
	'connection',
	'keep-alive',
	'transfer-encoding',
	'upgrade',
	'proxy-connection',
	'host',
	'accept-encoding'
]);

const server = http2.createSecureServer(
	{
		key: readFileSync(join(certDir, 'key.pem')),
		cert: readFileSync(join(certDir, 'cert.pem')),
		allowHTTP1: true
	},
	(req, res) => {
		const headers = Object.fromEntries(
			Object.entries(req.headers).filter(([k]) => !hop.has(k) && !k.startsWith(':'))
		);
		headers['accept-encoding'] = 'identity';
		const isHtml = !req.url.startsWith('/_app/') && !/\.[a-z0-9]{2,5}($|\?)/i.test(req.url);
		const go = () => {
			const p = http.request(
				{ host: '127.0.0.1', port: up, path: req.url, method: req.method, headers },
				(r) => {
					const out = Object.fromEntries(
						Object.entries(r.headers).filter(
							([k]) => !hop.has(k) && !['content-length', 'content-encoding', 'etag'].includes(k)
						)
					);
					out['cache-control'] = req.url.startsWith('/_app/immutable/')
						? 'public, immutable, max-age=31536000'
						: 'public, max-age=0, must-revalidate';
					out.server = 'Vercel';
					const wantsBr = /\bbr\b/.test(req.headers['accept-encoding'] || '');
					const chunks = [];
					r.on('data', (c) => chunks.push(c));
					r.on('end', () => {
						let body = Buffer.concat(chunks);
						if (
							wantsBr &&
							compressible.test(r.headers['content-type'] || '') &&
							body.length > 1024
						) {
							body = zlib.brotliCompressSync(body, {
								params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 }
							});
							out['content-encoding'] = 'br';
						}
						out['content-length'] = String(body.length);
						res.writeHead(r.statusCode, out);
						res.end(body);
					});
				}
			);
			p.on('error', (e) => {
				res.writeHead(502);
				res.end(String(e));
			});
			req.pipe(p);
		};
		if (isHtml) setTimeout(go, Number(delay));
		else go();
	}
);
server.listen(Number(listen), '127.0.0.1', () =>
	console.log(
		`front: https://127.0.0.1:${listen} -> http://127.0.0.1:${up} (html delay ${delay} ms)`
	)
);
