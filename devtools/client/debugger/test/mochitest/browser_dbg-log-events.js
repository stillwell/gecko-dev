/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

/*
 * Tests that we can log event listeners calls
 */

"use strict";

add_task(async function () {
  Services.prefs.setBoolPref("devtools.toolbox.splitconsole.open", true);
  const dbg = await initDebugger(
    "doc-event-breakpoints.html",
    "event-breakpoints.js"
  );

  await clickElement(dbg, "logEventsCheckbox");
  await dbg.actions.addEventListenerBreakpoints("breakpoint", [
    "event.mouse.click",
    "animationframe.request",
  ]);
  clickElementInTab("#click-target");

  await hasConsoleMessage(dbg, "click { target: div#click-target");
  await hasConsoleMessage(dbg, "function rafCallback()");
  await waitForRequestsToSettle(dbg);
  ok(true);
});
