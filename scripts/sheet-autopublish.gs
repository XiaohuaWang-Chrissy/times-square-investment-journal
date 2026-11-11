/**
 * Google Apps Script for the story submissions Sheet: republish tsijournal.com when a story is
 * submitted through the form, or when the Sheet is edited (a story fixed or a row deleted).
 *
 * It starts the site's "Deploy" workflow on GitHub, which reads the Sheet and publishes the site;
 * new stories are live about 2–3 minutes later.
 *
 * Set up once, from the Sheet (Extensions → Apps Script) or as a standalone project, then
 *   1. Paste this file in place of the sample code and save.
 *   2. Project Settings (gear icon) → Script Properties → Add script property:
 *      GITHUB_TOKEN = the fine-grained GitHub token (this repository only, Actions: Read and write).
 *   3. Back in the editor, choose "install" in the toolbar and click Run; approve the permissions.
 *      The execution log should end with "GitHub accepted the publish request".
 *
 * The token stays in this script's properties, visible only to the Sheet's owner. When it expires,
 * publishing stops working until a new token is pasted into GITHUB_TOKEN; `npm run deploy` and
 * GitHub's "Run workflow" button keep working regardless.
 */

const REPO = 'XiaohuaWang-Chrissy/times-square-investment-journal';
const WORKFLOW = 'deploy.yml';
// The submissions Sheet, so the script also works as a standalone project (not opened from the Sheet).
const SHEET_ID = '10QD76Rw5eUfsogyy1Q7jbIK99RTxuoiXeHGTfit3omA';

/** Run once: add the triggers and send a first publish request to check the token. */
function install() {
	ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
	const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SHEET_ID);
	ScriptApp.newTrigger('publishSite').forSpreadsheet(ss).onFormSubmit().create();
	ScriptApp.newTrigger('onSheetChange').forSpreadsheet(ss).onChange().create();
	publishSite();
}

/** Edits and deleted rows: wait a minute for more changes, then publish once. */
function onSheetChange() {
	const pending = ScriptApp.getProjectTriggers().some((t) => t.getHandlerFunction() === 'publishSoon');
	if (!pending) ScriptApp.newTrigger('publishSoon').timeBased().after(60 * 1000).create();
}

function publishSoon() {
	ScriptApp.getProjectTriggers()
		.filter((t) => t.getHandlerFunction() === 'publishSoon')
		.forEach((t) => ScriptApp.deleteTrigger(t));
	publishSite();
}

/** Ask GitHub to run the Deploy workflow. */
function publishSite() {
	const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
	if (!token) throw new Error('Add the GITHUB_TOKEN script property first (Project Settings → Script Properties).');
	const res = UrlFetchApp.fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
		method: 'post',
		contentType: 'application/json',
		headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
		payload: JSON.stringify({ ref: 'main' }),
		muteHttpExceptions: true
	});
	if (res.getResponseCode() === 204) Logger.log('GitHub accepted the publish request.');
	else throw new Error(`GitHub refused the publish request (HTTP ${res.getResponseCode()}): ${res.getContentText()}`);
}
