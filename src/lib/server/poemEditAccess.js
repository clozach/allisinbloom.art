import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { editAccess } from './poemEdits/access.js';

/** @param {{url:URL,getClientAddress:()=>string}} event */
export function poemEditAccess(event) {
	return editAccess(event, { dev, environment: env.VERCEL_ENV, siteEnvironment: env.SITE_ENV });
}

/** @param {{url:URL,getClientAddress:()=>string}} event */
export function canEditPoems(event) {
	return poemEditAccess(event).allowed;
}
