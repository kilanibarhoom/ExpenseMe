/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  icon: '../../assets/images/icon.png',
  deploymentTarget: '17.0', // containerBackground()/#Preview(as:) require iOS 17+
});
