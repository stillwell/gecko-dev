// |reftest| error:SyntaxError
// Copyright (C) 2013 the V8 project authors. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
description: >
    `yield` expressions bind weakly
features: [generators]
es6id: 14.4
negative:
  phase: parse
  type: SyntaxError
---*/

$DONOTEVALUATE();

class A {
  *g() { yield 3 + yield 4; }
}
