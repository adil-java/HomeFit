/**
 * Android release-build fixes (applied on every prebuild / EAS build).
 *
 * 1) Stripe's library lists "stripe-android-issuing-push-provisioning" as a
 *    compile-only dependency (adding cards to Google Wallet — HomeFit doesn't
 *    use it). That library needs Google's "play-services-tapandpay", which is
 *    NOT in any public Maven repository, so the release build failed with:
 *      Could not find com.google.android.gms:play-services-tapandpay:18.8.0
 *    → Exclude that one artifact everywhere.
 *
 * 2) Expo SDK 58 turns on R8 (code shrinking/renaming) for release builds by
 *    default. R8 fails on classes that Viro and Stripe reference but don't ship,
 *    and — worse — Viro's native 3D/AR engine calls Java classes by name
 *    (com.viro.core, com.google.vr, com.reactvision.cca) without shipping keep
 *    rules, so R8 would break AR at runtime even if the build passed.
 *    → Keep R8 off, exactly like development builds (the code you test is the
 *      code you ship). Only effect: a somewhat larger APK.
 */
const { withProjectBuildGradle, withGradleProperties } = require('expo/config-plugins');

const MARKER = '// [withoutTapAndPay]';
const SNIPPET = `
${MARKER} play-services-tapandpay is not publicly available (see plugins/withoutTapAndPay.js)
allprojects {
    configurations.all {
        exclude group: 'com.google.android.gms', module: 'play-services-tapandpay'
    }
}
`;

const setGradleProperty = (props, key, value) => {
  const existing = props.find((p) => p.type === 'property' && p.key === key);
  if (existing) existing.value = value;
  else props.push({ type: 'property', key, value });
};

module.exports = function withoutTapAndPay(config) {
  config = withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language === 'groovy' && !cfg.modResults.contents.includes(MARKER)) {
      cfg.modResults.contents += SNIPPET;
    }
    return cfg;
  });
  return withGradleProperties(config, (cfg) => {
    setGradleProperty(cfg.modResults, 'android.enableMinifyInReleaseBuilds', 'false');
    return cfg;
  });
};
