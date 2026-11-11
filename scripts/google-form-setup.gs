/**
 * Google Apps Script: creates the story submission form and its Sheet for tsijournal.com.
 *
 * How to use (once):
 *   1. Go to https://script.google.com → New project, delete the sample code, paste this file.
 *   2. Choose the function "setup" in the toolbar and click Run. Approve the permissions.
 *   3. Open View → Logs (or Execution log) for the links to the form and the Sheet.
 *
 * Then, by hand (Apps Script can't create file-upload questions):
 *   - In the form editor, add a "File upload" question titled exactly "Photo" (images only,
 *     1 file, 10 MB). Put it after "Story".
 *   - In the Sheet: File → Share → Publish to web → choose the "Published" sheet and
 *     "Comma-separated values (.csv)" → Publish. That link goes in submissions.config.json.
 *   - After the first photo is uploaded, share the "… (File responses)" Drive folder as
 *     "Anyone with the link: Viewer" so the site can download photos.
 *
 * The "Published" sheet is rebuilt automatically on every submission and every edit to the
 * responses: it holds every story with a headline, without the submitter's email address.
 * To take a story down, delete its row in the responses sheet; to fix one, edit its cells.
 */

const FORM_TITLE = 'Times Square Investment Journal: Story Submission';
const SHEET_TITLE = 'Times Square Investment Journal: Story Submissions';
const SECTIONS = ['Company Insights', 'Stocks', 'Earnings', 'Previews', 'Personal Finance'];

function setup() {
	const form = FormApp.create(FORM_TITLE);
	form
		.setDescription(
			'Submit a story your instructor has already edited and approved for the Times Square Investment Journal (tsijournal.com).'
		)
		.setConfirmationMessage('Thanks! Your story will appear on tsijournal.com after the next site update.')
		.setAllowResponseEdits(false)
		.setLimitOneResponsePerUser(false);
	try {
		form.setCollectEmail(true); // so the editor knows who submitted; never published
	} catch (e) {
		Logger.log('Turn on Settings → Responses → Collect email addresses by hand: ' + e);
	}

	form.addTextItem().setTitle('Headline').setRequired(true);
	form.addTextItem().setTitle('Author name').setHelpText('Exactly as it should appear in the byline.').setRequired(true);
	form
		.addParagraphTextItem()
		.setTitle('Story')
		.setHelpText(
			'Paste the link to the edited Google Doc (Share → General access → Anyone with the link → Viewer). ' +
				'The Doc should contain only the story text, with no headline or byline. Or paste the full text here.'
		)
		.setRequired(true);
	form.addTextItem().setTitle('Photo credit').setHelpText('For example: Jane Doe / Unsplash');
	form.addTextItem().setTitle('Ticker(s)').setHelpText('Stock symbols the story is about, for example: NKE, UAL');
	form
		.addCheckboxItem()
		.setTitle('Section(s)')
		.setHelpText('Where the story should appear in the site menu.')
		.setChoiceValues(SECTIONS);

	const ss = SpreadsheetApp.create(SHEET_TITLE);
	form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
	SpreadsheetApp.flush();

	// The new spreadsheet starts with an empty "Sheet1"; it becomes the published copy.
	const blank = ss.getSheets().find((s) => !s.getFormUrl());
	const published = blank ? blank.setName('Published') : ss.insertSheet('Published');
	ss.setActiveSheet(published);
	ss.moveActiveSheet(ss.getNumSheets());

	PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());
	ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
	ScriptApp.newTrigger('syncPublished').forSpreadsheet(ss).onFormSubmit().create();
	ScriptApp.newTrigger('syncPublished').forSpreadsheet(ss).onChange().create();
	ScriptApp.newTrigger('syncPublished').forSpreadsheet(ss).onEdit().create();
	syncPublished();

	Logger.log('Form (edit, add the Photo question here): ' + form.getEditUrl());
	Logger.log('Form (send this link to reporters): ' + form.getPublishedUrl());
	Logger.log('Sheet: ' + ss.getUrl());
}

/** Rebuild "Published" from the responses: every row with a headline, minus email addresses. */
function syncPublished() {
	const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
	const responses = ss.getSheets().find((s) => s.getFormUrl());
	const published = ss.getSheetByName('Published');
	if (!responses || !published) return;

	const values = responses.getDataRange().getValues();
	const header = values[0].map(String);
	const keep = header.map((h, i) => i).filter((i) => header[i].trim() && !/^email address$/i.test(header[i].trim()));
	const titleCol = header.findIndex((h) => /^headline$/i.test(h.trim()));
	const tz = 'America/New_York';
	const cell = (v) => (v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd HH:mm:ss') : v);
	const rows = values.slice(1).filter((r) => titleCol >= 0 && String(r[titleCol]).trim());
	const out = [keep.map((i) => header[i]), ...rows.map((r) => keep.map((i) => cell(r[i])))];

	published.clearContents();
	published.getRange(1, 1, out.length, out[0].length).setValues(out);
}
