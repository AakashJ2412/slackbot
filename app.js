const { App } = require('@slack/bolt');
const { processStepMiddleware } = require('@slack/bolt/dist/WorkflowStep');
const { Client } = require('pg')
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
var sheets = require('./sheets/sheets.js');
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});

const dbclient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

function GetFormattedDate() {
    var todayTime = new Date();
    var month = format(todayTime .getMonth() + 1);
    var day = format(todayTime .getDate());
    var year = format(todayTime .getFullYear());
    return month + "/" + day + "/" + year;
}

// Listens to incoming messages that contain "hello"
app.message('remind_me', async ({ message, say }) => {
    await say({
        blocks: [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `Hello <@${message.user}>!. Are you ready to fill your daily standup?\n`
                },
                "accessory": {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "Enter Standup"
                    },
                    "action_id": "button_click"
                }
            }
        ]
    });
});

app.event('app_mention', async ({ event, say, client }) => {
    let message = event.text;
    message = message.trim();
    var pos = message.indexOf("add_user");
    if (pos != -1) {
        var uid = "";
        for (var i = pos + 8; i < message.length; i++) {
            if (message[i] === ' ' || message[i] === '<' || message[i] === '>' || message[i] === '@')
                continue;
            uid = uid.concat(message[i]);
        }
        console.log(uid);
        try {
            const ret = await client.users.profile.get({
                user: uid
            });
            let uname = ret.profile.display_name;
            sheets.inp_params = [uid,uname];
            sheets.adduser();
            await say({
                blocks: [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `User <@${uid}> has been successfully added to standup list.`
                        }
                    }
                ]
            });
        }
        catch (error) {
            console.error(error);
        }
    }
    pos = message.indexOf("delete_user");
    if (pos != -1) {
        var uid = "";
        for (var i = pos + 11; i < message.length; i++) {
            if (message[i] === ' ' || message[i] === '<' || message[i] === '>' || message[i] === '@')
                continue;
            uid = uid.concat(message[i]);
        }
        console.log(uid);
        try {
            const dbres = await dbclient.query('DELETE FROM user_list WHERE userid=$1', [uid]);
            if (dbres === "DELETE 0") {
                console.log('User not found');
                await say({
                    blocks: [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": `User <@${uid}> not found in standup list.`
                            }
                        }
                    ]
                });
            }
            else {
                await say({
                    blocks: [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": `User <@${uid}> has been successfully deleted from standup list.`
                            }
                        }
                    ]
                });
            }
        }
        catch (error) {
            console.error(error);
        }
    }
    pos = message.indexOf("get_users");
    if (pos != -1) {
        if (! sheets.user_list){
            console.log('Get Error')
        }
        var users = "";
        sheets.user_list.forEach(function (element) {
            users = users.concat(element[1]);
            users = users.concat('\n');
        });
        try {
            await say({
                blocks: [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `Users in the standup list:\n${users}`
                        }
                    }
                ]
            });
        }
        catch (error) {
            console.error(error);
        }
    }
});

app.message('send_reminder', async ({ message, client }) => {
    if (!sheets.user_list) {
        console.log('Get Error')
    }
    var uid = [];
    var uname = [];
    sheets.user_list.forEach(function (element) {
        uid.push(element[0]);
        uname.push(element[1]);
    });
    try {
        for (var i = 0; i < uid.length; i++) {
            await client.chat.postMessage({
                channel: uid[i],
                blocks: [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `Hello <@${uid[i]}>!. Are you ready to fill your daily standup?\n`
                        },
                        "accessory": {
                            "type": "button",
                            "text": {
                                "type": "plain_text",
                                "text": "Enter Standup"
                            },
                            "action_id": "button_click"
                        }
                    }
                ]
            });
        }
    }
    catch (error) {
        console.error(error);
    }
});

app.message('send_rem_update', async ({ message, client }) => {
    const dbstdres = await dbclient.query("SELECT * FROM standups WHERE date > (now() - '12 hours'::interval)");
    if (!dbstdres) {
        console.log('Get Error')
    }
    if (!sheets.user_list) {
        console.log('Get Error')
    }
    var stduid = [];
    var uid = [];
    sheets.user_list.forEach(function (element) {
        uid.push(element[0]);
    });
    dbstdres.rows.forEach(function (element) {
        stduid.push(element.userid);
    });
    var finuid = uid.filter(function (element) {
        return stduid.indexOf(element) == -1;
    });
    try {
        for (var i = 0; i < finuid.length; i++) {
            await client.chat.postMessage({
                channel: uid[i],
                blocks: [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `Hello <@${uid[i]}>!. Please be sure to fill the daily standup by the end of the day.\n`
                        }
                    }
                ]
            });
        }
    }
    catch (error) {
        console.error(error);
    }
});

// Listen for a slash command invocation
app.action('button_click', async ({ ack, body, client }) => {
    // Acknowledge the command request
    await ack();

    try {
        // Call views.open with the built-in client
        const result = await client.views.open({
            // Pass a valid trigger_id within 3 seconds of receiving it
            trigger_id: body.trigger_id,
            // View payload
            view: {
                type: 'modal',
                // View identifier
                callback_id: 'view_1',
                title: {
                    type: 'plain_text',
                    text: 'Daily Standup'
                },
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: 'Welcome to the Daily Standup! Please fill in the following fields.'
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'input_a',
                        label: {
                            type: 'plain_text',
                            text: "Yesterday's Completed Task"
                        },
                        element: {
                            type: 'plain_text_input',
                            action_id: 'yesterday_task',
                            multiline: true
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'input_b',
                        label: {
                            type: 'plain_text',
                            text: "Yesterday's Adhoc Task"
                        },
                        element: {
                            type: 'plain_text_input',
                            action_id: 'yesterday_adhoc',
                            multiline: true
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'input_c',
                        label: {
                            type: 'plain_text',
                            text: "Today's Planned Task (As per roadmap, please add issue id from youtrack)"
                        },
                        element: {
                            type: 'plain_text_input',
                            action_id: 'today_task',
                            multiline: true
                        }
                    },
                    {
                        type: 'input',
                        block_id: 'input_d',
                        label: {
                            type: 'plain_text',
                            text: "Blocker"
                        },
                        element: {
                            type: 'plain_text_input',
                            action_id: 'blocker',
                            multiline: true
                        }
                    }
                ],
                submit: {
                    type: 'plain_text',
                    text: 'Submit'
                }
            }
        });
    }
    catch (error) {
        console.error(error);
    }
});


// Handle a view_submission event
app.view('view_1', async ({ ack, body, view, client }) => {
    // Acknowledge the view_submission event
    await ack();
    // Do whatever you want with the input data - here we're saving it to a DB then sending the user a verifcation of their submission
    // Assume there's an input block with `block_1` as the block_id and `input_a`
    let yes_task = view['state']['values']['input_a']['yesterday_task']['value'];
    let yes_adhoc = view['state']['values']['input_b']['yesterday_adhoc']['value'];
    let today_task = view['state']['values']['input_c']['today_task']['value'];
    let blocker = view['state']['values']['input_d']['blocker']['value'];
    const user = body['user']['id'];
    const ret = await client.users.profile.get({
        user: user
    });
    let img = ret.profile.image_original
    const username = body['user']['username'];
    var todaydate = new Date();
    sheets.inp_params = [user,username,GetFormattedDate(),yes_task,yes_adhoc,today_task,blocker];
    sheets.addstandup();
    try {
        await client.chat.postMessage({
            channel: 'C01LX5S6AHM',
            username: username,
            icon_url: img,
            blocks: [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "Daily Standup"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": todaydate.toDateString()
                    }
                },
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*Yesterday's Completed Task* \n " + yes_task
                    }
                },
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*Yesterday's Adhoc Task* \n " + yes_adhoc
                    }
                },
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*Today's Planned Task (As per roadmap, please add issue id from youtrack)* \n " + today_task
                    }
                },
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*Blocker* \n " + blocker
                    }
                }
            ]
        });
        await client.chat.postMessage({
            channel: user,
            blocks: [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": "Daily Standup"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": todaydate.toDateString()
                    }
                },
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*Yesterday's Completed Task* \n " + yes_task
                    }
                },
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*Yesterday's Adhoc Task* \n " + yes_adhoc
                    }
                },
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*Today's Planned Task (As per roadmap, please add issue id from youtrack)* \n " + today_task
                    }
                },
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*Blocker* \n " + blocker
                    }
                }
            ]
        });
    }
    catch (error) {
        console.error(error);
    }

});

(async () => {
    // Start your app
    sheets.getusers();
    await new Promise(r => setTimeout(r,2000));
    console.log(sheets.user_list);
    sheets.adduser();
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Bolt app is running!');
})();