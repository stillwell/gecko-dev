// |reftest| shell-option(--enable-temporal) skip-if(!this.hasOwnProperty('Temporal')||!xulRuntime.shell) -- Temporal is not enabled unconditionally, requires shell-options
// Copyright (C) 2022 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.zoneddatetime.prototype.equals
description: Negative zero, as an extended year, is rejected
features: [Temporal, arrow-function]
---*/

const invalidStrings = [
  "-0000000-01-01T00:02Z[UTC]",
  "-0000000-01-01T00:02+00:00[UTC]",
  "-0000000-01-01T00:02:00.000000000+00:00[UTC]",
];
const instance = new Temporal.ZonedDateTime(0n, "UTC");
invalidStrings.forEach((arg) => {
  assert.throws(
    RangeError,
    () => instance.equals(arg),
    "reject minus zero as extended year"
  );
});

reportCompare(0, 0);
