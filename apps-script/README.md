# Booking form ("Start a project") setup

The website form posts to a Google Apps Script web app. The script is not part of the
website, so it has to be updated in your Google account. The new form fields (phone,
preferred date, preferred time) only reach you as separate columns once this is done.
Until then they still arrive, but inside the message text.

## Update your existing script (keeps the same URL)

1. Open the Google Sheet that receives the requests, then **Extensions > Apps Script**.
2. Replace the code with the contents of `consult-form.gs` and click **Save**.
3. Click **Deploy > Manage deployments**, pick your existing Web app deployment, click the
   pencil (edit), set **Version** to **New version**, then **Deploy**.
   (Do not use "New deployment": that creates a different URL.)
4. The first time, Google asks you to authorise the script (it needs the Sheet and Gmail).
   Click **Authorize**, choose your account, then **Advanced > Go to project > Allow**.
5. Open the web app URL in a browser. You should see `{"ok":true,"service":...}`.
6. Submit a test request on the website. Check the sheet has a new row and info@micronode.in
   received the email.

## If you want a brand-new script instead

1. Create a Google Sheet, then **Extensions > Apps Script**, paste `consult-form.gs`, save.
2. **Deploy > New deployment > Web app**, Execute as **Me**, Who has access **Anyone**.
3. Copy the Web app URL into `APPS_SCRIPT_URL` near the top of the form code in
   `Micronode_Website.js`.

## Newsletter sign-ups (footer email box)

The same script saves them into your Google Sheet
(`12KpHfKjhR6C_umoIJ4SlWoQYry1gD3OSgfmT3QG0390`, first tab). After pasting the new `consult-form.gs`:

1. Redeploy as a **New version** (Deploy > Manage deployments > pencil > New version). The URL stays the same.
2. When Google asks for permissions, allow it. The new permission is "See, edit, create and delete your spreadsheets".
3. Sign up with a test email on the website. A row appears: time, email, page.

Who can see the list: only people you share that Sheet with. Visitors cannot read it. The script only adds rows,
skips duplicates and ignores bot submissions. Keep the Sheet's sharing on "Restricted".

## Good to know

- The form sends with `mode: "no-cors"`, so the website cannot read the script's reply. It
  shows "Thank you" as soon as the request is sent. If a request is missing, check the
  script's **Executions** page for errors.
- Gmail limits Apps Script to about 100 emails a day on a free account, which is plenty for
  enquiries.
- Anyone who finds the web app URL can post to it. If you get spam, add a hidden field the
  form fills in and have the script reject posts without it.
