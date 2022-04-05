const { Plugin } = require('powercord/entities');
const { getModule, channels: { getChannelId } } = require('powercord/webpack');
const { inject, uninject } = require('powercord/injector');
const { createBotMessage } = getModule(['createBotMessage'],false)
const { post } = require('powercord/http');

const Settings = require('./Settings.jsx');

let CSRF_TOKEN = '';
const filterText = async (text, rbxcookie) => new Promise(resolve => {
  post('https://develop.roblox.com/v1/gameUpdateNotifications/filter')
  .set('content-type', 'application/json')
  .set('x-csrf-token', CSRF_TOKEN)
  .set('cookie', `.ROBLOSECURITY=${rbxcookie}`)
  .send(`\"${text.replace(/"/g, '\\"')}\"`)
  .then(resp => {
    resolve({
      success: true,
      text: resp.body.filteredGameUpdateText || text
    });
  })
  .catch(async error => {
    console.log(error.headers, error.body, error.status);
    const {body, headers} = error;

    if (!body || !body.errors || body.errors.length < 1) return resolve({
      error: true,
      message: 'some kind of request error idk'
    })

    const robloxError = body.errors[0];
    if (robloxError.message !== 'Token Validation Failed') return resolve({
      error: true,
      message: robloxError.message
    })

    console.log(robloxError.message)

    CSRF_TOKEN = headers['x-csrf-token'];
    return resolve(await filterText(text, rbxcookie));
  })
})

module.exports = class RbxFilter extends Plugin {
  async startPlugin () {
    powercord.api.settings.registerSettings('rbx-filter', {
      category: this.entityID,
      label: 'Roblox Filtering',
      render: Settings
    });

    const messages = await getModule([ 'sendMessage', 'editMessage' ]);
    const sendClydeMessage = embed => {
      const receivedMessage = createBotMessage(getChannelId(), '');
    
      receivedMessage.embeds = [ embed ];
    
      messages.receiveMessage(receivedMessage.channel_id, receivedMessage);
    }

    const getCookie = () => this.settings.get('cookie');

    let parentThis = this;
    const messageEvents = await getModule(['sendMessage']);
    inject('rbxFilterSend', messageEvents, 'sendMessage', function(args) {
        const forceEnabled = parentThis.settings.get('force', false);
        const powercordPrefix = powercord.api.commands.prefix;
        const startsWithPrefix = args[1].content.startsWith(powercordPrefix);

        console.log(args);

        if (forceEnabled && !startsWithPrefix && !args[1].__FILTERED__) {
          let text = args[1].content;
          args[1].__FILTERED__ = true;

          filterText(text, getCookie())
          .then(filterAttempt => {
            if (filterAttempt.success) {
              args[1].content = filterAttempt.text;
            } else {
              sendClydeMessage({
                title: 'your message could not be filtered by roblox',
                description: `${filterAttempt.message}`,
                color: 16734296
              })
            }

            const messageArgs = { ...args[1] };
            messageEvents.sendMessage(args[0], messageArgs);
          })
          return false;
        } else return args;
    }, true);

    powercord.api.commands.registerCommand({
      command: 'filter',
      description: 'filters text through roblox\'s filter',
      usage: '{c} [text]',
      executor: async (args) => {
        const filterAttempt = await filterText(args.join(' '), getCookie());

        if (filterAttempt.error)
          sendClydeMessage({
            title: 'your message could not be filtered by roblox',
            description: `${filterAttempt.message}`,
            color: 16734296
          })

        return {
          send: true,
          result: filterAttempt.text
        }
      }
    });

    powercord.api.commands.registerCommand({
      command: 'togglefilter',
      description: 'toggles filtering all messages through roblox\'s filter',
      usage: '{c}',
      executor: async () => {
        const newOption = !parentThis.settings.get('force');
        parentThis.settings.set('force', newOption);

        sendClydeMessage({
          description: `${newOption ? '✅' : '❌'} all of your messages ${newOption ? 'will' : 'won\'t'} be filtered by roblox`,
          color: 5820671
        })
      }
    });
  }

  pluginWillUnload () {
    powercord.api.settings.unregisterSettings('rbx-filter');
    powercord.api.commands.unregisterCommand('filter');
    powercord.api.commands.unregisterCommand('togglefilter');
    uninject('rbxFilterSend');
  }
};
