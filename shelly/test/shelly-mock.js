/**
 * Mock implementation of Shelly API for testing heating.js
 *
 * This mock provides:
 * - Timer.set() that stores callbacks by timeout value
 * - triggerTimer(timeout) to execute callbacks for specific timers
 * - Shelly.call() that can be configured to return specific responses
 * - Shelly.getComponentStatus() for component value mocking
 * - Controllable Date mock for testing different hours
 */

export class ShellyMock {
  constructor() {
    this.reset();
  }

  reset() {
    // Timer callbacks stored by timeout value
    // Key: timeout in ms, Value: array of {callback, repeat}
    this.timers = new Map();

    // Track all Shelly.call invocations
    this.shellyCalls = [];

    // Track all Switch.Set calls specifically
    this.switchCalls = [];

    // Component status values
    this.componentStatus = {
      number: {
        204: { value: 45 }, // ComponentDownTemp default
        205: { value: 55 }, // ComponentUpTemp default
      },
      enum: {
        200: { value: 12 }, // ComponentMaxPower default
      },
      'switch:0': { output: false }, // RelayUp
      'switch:1': { output: false }, // RelayDown
    };

    // HTTP request mock responses
    // Key: URL pattern, Value: {code, body, error}
    this.httpResponses = new Map();

    // Current mock time
    this.currentHour = 0;

    // Status handler
    this.statusHandler = null;

    // Print output
    this.printOutput = [];
  }

  /**
   * Set the current hour for Date mock
   */
  setHour(hour) {
    this.currentHour = hour;
  }

  /**
   * Configure HTTP response for a specific URL pattern
   */
  setHttpResponse(urlPattern, response) {
    this.httpResponses.set(urlPattern, response);
  }

  /**
   * Set component status value
   */
  setComponentStatus(type, id, value) {
    const key = type === 'switch' ? `switch:${id}` : type;
    if (type === 'switch') {
      this.componentStatus[key] = value;
    } else {
      if (!this.componentStatus[type]) {
        this.componentStatus[type] = {};
      }
      this.componentStatus[type][id] = value;
    }
  }

  /**
   * Trigger all timers registered with the specified timeout
   */
  triggerTimer(timeout) {
    const timerCallbacks = this.timers.get(timeout);
    if (!timerCallbacks || timerCallbacks.length === 0) {
      throw new Error(`No timer registered with timeout ${timeout}ms`);
    }

    // Execute all callbacks for this timeout
    timerCallbacks.forEach(({ callback, repeat }) => {
      callback();
    });
  }

  /**
   * Get all Switch.Set calls for a specific relay
   */
  getSwitchCalls(relayId) {
    return this.switchCalls.filter(call => call.id === relayId);
  }

  /**
   * Get the last state set for a relay
   */
  getLastSwitchState(relayId) {
    const calls = this.getSwitchCalls(relayId);
    if (calls.length === 0) return null;
    return calls[calls.length - 1].on;
  }

  /**
   * Create global mocks for the Shelly environment
   */
  createGlobalMocks() {
    const self = this;

    return {
      // Timer mock
      Timer: {
        set(timeout, repeat, callback) {
          if (!self.timers.has(timeout)) {
            self.timers.set(timeout, []);
          }
          self.timers.get(timeout).push({ callback, repeat });
        }
      },

      // Shelly API mock
      Shelly: {
        call(method, params, callback, errorCallback) {
          self.shellyCalls.push({ method, params, callback, errorCallback });

          if (method === 'HTTP.Request') {
            // Find matching HTTP response
            let matchedResponse = null;
            for (const [pattern, response] of self.httpResponses) {
              if (params.url.includes(pattern)) {
                matchedResponse = response;
                break;
              }
            }

            // Execute callback asynchronously (simulate real behavior)
            setImmediate(() => {
              if (matchedResponse) {
                if (matchedResponse.error) {
                  callback(null, matchedResponse.error);
                } else {
                  callback({
                    code: matchedResponse.code || 200,
                    body: matchedResponse.body
                  }, 0);
                }
              } else {
                // Default: connection error
                callback(null, -1);
              }
            });
          } else if (method === 'Switch.Set') {
            // Track switch calls
            self.switchCalls.push({
              id: params.id,
              on: params.on,
              timestamp: new Date().toISOString()
            });

            // Update component status
            self.componentStatus[`switch:${params.id}`] = { output: params.on };

            if (callback) {
              setImmediate(() => callback({ success: true }, 0));
            }
          }
        },

        getComponentStatus(type, id) {
          if (type === 'number' || type === 'enum') {
            return self.componentStatus[type][id];
          } else {
            // For switch status
            return self.componentStatus[`${type}:${id}`];
          }
        },

        addStatusHandler(handler) {
          self.statusHandler = handler;
        }
      },

      // Date mock
      Date: class MockDate extends Date {
        getHours() {
          return self.currentHour;
        }

        toISOString() {
          return new Date().toISOString();
        }
      },

      // print function
      print(message) {
        self.printOutput.push(message);
      }
    };
  }
}

