export class PoemEditError extends Error {
	/** @param {number} status @param {string} message */
	constructor(status, message) {
		super(message);
		this.name = 'PoemEditError';
		this.status = status;
	}
}

export const unavailable = () =>
	new PoemEditError(503, 'Your changes have not been saved. Please try again.');
export const conflict = () =>
	new PoemEditError(
		409,
		'This poem changed elsewhere. Your words are still here; load the saved version before trying again.'
	);
