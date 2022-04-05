const { React } = require('powercord/webpack');
const { TextInput, SwitchItem } = require('powercord/components/settings');

module.exports = ({ getSetting, updateSetting, toggleSetting }) => (
  <div>
    <TextInput
      note='Your Roblox account cookie (.ROBLOSECURITY), required for the plugin to function.'
      defaultValue={getSetting('cookie', 'paste the cookie here!')}
      required={true}
      onChange={val => updateSetting('cookie', val.trim())}
    >
      Roblox cookie
    </TextInput>
    <SwitchItem
      note='Whether all of your sent messages should be passed through the filter.'
      value={getSetting('force', false)}
      onChange={() => toggleSetting('force')}
    >
      Filter all messages
    </SwitchItem>
  </div>
);
