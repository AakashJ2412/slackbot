const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = './sheets/token.json';
var user_list = [];
var inp_params = [];
/**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   * @param {Object} credentials The authorization client credentials.
   * @param {function} callback The callback to call with the authorized client.
   */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
* Get and store new token after prompting for user authorization, and then
* execute the given callback with the authorized OAuth2 client.
* @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
* @param {getEventsCallback} callback The callback for the authorized client.
*/
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function getusers() {
  // Load client secrets from a local file.
  fs.readFile('./sheets/credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), getuserlist);
  });
}
function getuserlist(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  sheets.spreadsheets.values.get({
    spreadsheetId: '1VzQesOzwkONYPdKOXnZUmWoWDTzCu_W1hvmq9m41MoQ',
    range: 'user_list!A2:B',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const rows = res.data.values;
    if (rows.length) {
      rows.map((row) => {
        user_list.push(row);
      });
    } else {
      console.log('No data found.');
    }
  });
}


function adduser() {
  // Load client secrets from a local file.
  fs.readFile('./sheets/credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), adduserlist);
  });
}
function adduserlist(auth) {
  flag = 0
  user_list.forEach((elem) => {
    if (elem[0] == inp_params[0])
      flag = 1;
  });
  if (flag === 1 || inp_params == []) {
    console.log('Error, user not added');
    return -1;
  }
  const sheets = google.sheets({ version: 'v4', auth });
  sheets.spreadsheets.values.append({
    spreadsheetId: '1VzQesOzwkONYPdKOXnZUmWoWDTzCu_W1hvmq9m41MoQ',
    range: 'user_list!A2:B',
    insertDataOption: 'INSERT_ROWS',
    valueInputOption: 'RAW',
    resource: {
      'values': [inp_params]
    }
  }, (err, res) => {
    if (err)
      return console.log('The API returned an error: ' + err);
    if (res) {
      console.log('Entry added successfully');
    } else {
      console.log('No data found.');
    }
  });
  return 0;
}

function addstandup() {
  // Load client secrets from a local file.
  fs.readFile('./sheets/credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), addstanduplist);
  });
}
function addstanduplist(auth) {
  if (inp_params === []) {
    console.log('Error, standup not added');
    return -1;
  }
  const sheets = google.sheets({ version: 'v4', auth });
  console.log('this is', inp_params);
  sheets.spreadsheets.values.append({
    spreadsheetId: '1VzQesOzwkONYPdKOXnZUmWoWDTzCu_W1hvmq9m41MoQ',
    range: 'standups!A2:G',
    insertDataOption: 'INSERT_ROWS',
    valueInputOption: 'RAW',
    resource: {
      'values': [inp_params]
    }
  }, (err, res) => {
    if (err)
      return console.log('The API returned an error: ' + err);
    if (res) {
      console.log('Entry added successfully');
    } else {
      console.log('No data found.');
    }
  });
  return 0;
}

function deluser() {
  // Load client secrets from a local file.
  fs.readFile('./sheets/credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), deluserlist);
  });
}
function deluserlist(auth) {
  if (inp_params === []) {
    console.log('Error, user not deleted');
    return -1;
  }
  const sheets = google.sheets({ version: 'v4', auth });
  console.log('in function', inp_params);
  sheets.spreadsheets.batchUpdate({
    spreadsheetId: '1VzQesOzwkONYPdKOXnZUmWoWDTzCu_W1hvmq9m41MoQ',
    resource: {
      "requests":
        [
          {
            "deleteRange":
            {
              "range":
              {
                "sheetId": 0, // gid
                "startRowIndex": inp_params[0]+1,
                "endRowIndex": inp_params[0]+2
              },
              "shiftDimension": "ROWS"
            }
          }
        ]
    }
  }, (err, res) => {
    if (err)
      return console.log('The API returned an error: ' + err);
    if (res) {
      console.log('Entry deleted successfully');
    } else {
      console.log('No data found.');
    }
  });
  return 0;
}

function updateinp(elem) {
  inp_params = elem;
}

module.exports = {
  authorize,
  getNewToken,
  getusers,
  getuserlist,
  user_list,
  inp_params,
  adduser,
  adduserlist,
  deluser,
  deluserlist,
  addstandup,
  addstanduplist,
  updateinp
}
