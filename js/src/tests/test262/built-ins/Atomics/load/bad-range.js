// |reftest| skip-if(!this.hasOwnProperty('Atomics')||!this.hasOwnProperty('SharedArrayBuffer')||(this.hasOwnProperty('getBuildConfiguration')&&getBuildConfiguration('arm64-simulator'))) -- Atomics,SharedArrayBuffer is not enabled unconditionally, ARM64 Simulator cannot emulate atomics
// Copyright (C) 2017 Mozilla Corporation.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-atomics.load
description: >
  Test range checking of Atomics.load on arrays that allow atomic operations
includes: [testAtomics.js, testTypedArray.js]
features: [ArrayBuffer, Atomics, DataView, SharedArrayBuffer, Symbol, TypedArray]
---*/

var buffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 2);
var views = nonClampedIntArrayConstructors.slice();

testWithTypedArrayConstructors(function(TA) {
  let view = new TA(buffer);
  testWithAtomicsOutOfBoundsIndices(function(IdxGen) {
    assert.throws(RangeError, function() {
      Atomics.load(view, IdxGen(view));
    });
  });
}, views);

reportCompare(0, 0);
