/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// This is a minimal worker needed for PDF.js to function
// It just loads the real worker
(function () {
  "use strict";

  // Register handlers for all appropriate message types
  self.onmessage = function(event) {
    const data = event.data;
    // Signal that worker is ready
    if (data && data.action === 'test') {
      self.postMessage({ action: 'test', result: true });
    }
  };

  console.log("PDF.js worker initialized");
})(); 