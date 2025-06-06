/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let bounceTrackingProtection = Cc[
  "@mozilla.org/bounce-tracking-protection;1"
].getService(Ci.nsIBounceTrackingProtection);

function assertCounterNull() {
  is(
    Glean.bounceTrackingProtection.purgeCount.success.testGetValue(),
    null,
    "Success Counter should be null"
  );
  is(
    Glean.bounceTrackingProtection.purgeCount.failure.testGetValue(),
    null,
    "Failure Counter should be null."
  );
  is(
    Glean.bounceTrackingProtection.purgeCount.dry.testGetValue(),
    null,
    "Dry Counter should be null."
  );
}

async function testPurgeCount(isDryRunMode) {
  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "privacy.bounceTrackingProtection.mode",
        isDryRunMode
          ? Ci.nsIBounceTrackingProtection.MODE_ENABLED_DRY_RUN
          : Ci.nsIBounceTrackingProtection.MODE_ENABLED,
      ],
    ],
  });

  assertCounterNull();

  info("Run server bounce with cookie.");
  await runTestBounce({
    bounceType: "server",
    setState: "cookie-server",
    postBounceCallback: () => {
      info(
        "Counters should still be ampty after bounce, because we haven't purged yet."
      );
      assertCounterNull();
    },
  });

  let success =
    Glean.bounceTrackingProtection.purgeCount.success.testGetValue();
  let failure =
    Glean.bounceTrackingProtection.purgeCount.failure.testGetValue();
  let dry = Glean.bounceTrackingProtection.purgeCount.dry.testGetValue();
  if (isDryRunMode) {
    is(success, null, "No successful purge counted in dry mode");
    is(dry, 1, "Dry purge counted");
  } else {
    is(success, 1, "Successful purge counted");
    is(dry, null, "No dry purge counted in normal mode");
  }
  is(failure, null, "No failed purges counted");

  // Cleanup
  Services.fog.testResetFOG();
  await SpecialPowers.popPrefEnv();
  bounceTrackingProtection.clearAll();
}

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "privacy.bounceTrackingProtection.mode",
        Ci.nsIBounceTrackingProtection.MODE_ENABLED,
      ],
      ["privacy.bounceTrackingProtection.requireStatefulBounces", true],
      ["privacy.bounceTrackingProtection.bounceTrackingGracePeriodSec", 0],
    ],
  });

  // Clear telemetry before test.
  Services.fog.testResetFOG();
});

add_task(async function test_purge_count_dry_mode() {
  await testPurgeCount(true);
});

add_task(async function test_purge_count_enabled() {
  await testPurgeCount(false);
});
