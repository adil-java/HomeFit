/**
 * Android build fix for @stripe/stripe-react-native.
 *
 * Stripe's library lists "stripe-android-issuing-push-provisioning" as a
 * compile-only dependency (adding cards to Google Wallet — HomeFit doesn't use
 * it). That library needs Google's "play-services-tapandpay", which Google only
 * gives to approved partners and is NOT in any public Maven repository, so the
 * release build's lint step fails with:
 *   Could not find com.google.android.gms:play-services-tapandpay:18.8.0
 *
 * Excluding that one artifact everywhere fixes it. Nothing in the app uses it,
 * so the app itself is unchanged.
 */
const { withProjectBuildGradle } = require('expo/config-plugins');

const MARKER = '// [withoutTapAndPay]';
const SNIPPET = `
${MARKER} play-services-tapandpay is not publicly available (see plugins/withoutTapAndPay.js)
allprojects {
    configurations.all {
        exclude group: 'com.google.android.gms', module: 'play-services-tapandpay'
    }
}
`;

module.exports = function withoutTapAndPay(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language === 'groovy' && !cfg.modResults.contents.includes(MARKER)) {
      cfg.modResults.contents += SNIPPET;
    }
    return cfg;
  });
};
