import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { editAccess, editMode } from './poemEdits/access.js';

/** @param {{url:URL,getClientAddress:()=>string}} event */
export function poemEditMode(event) {
	return editMode(event, { dev, environment: env.VERCEL_ENV, siteEnvironment: env.SITE_ENV });
}

/** @param {{url:URL,getClientAddress:()=>string,request:Request}} event */
export function poemEditAccess(event) {
	return editAccess(event, {
		dev,
		environment: env.VERCEL_ENV,
		siteEnvironment: env.SITE_ENV,
		user: env.POEM_EDIT_USER,
		password: env.POEM_EDIT_PASSWORD
	});
}

/**
 * Editing exists on this site when a storage mode and the owner's credentials are
 * configured; the poem page then listens for ⌥⌘E and shows nothing until it is pressed.
 * @param {{url:URL,getClientAddress:()=>string,request:Request}} event
 */
export function poemEditingAvailable(event) {
	return poemEditAccess(event).kind !== 'unavailable';
}
