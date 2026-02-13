/**
 * Unit tests for heating.js fallback functionality
 *
 * Tests the critical scenario where internet connectivity fails during backup hours (2-5 AM)
 * and verifies that RelayDown is activated correctly.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import assert from 'assert';
import vm from 'vm';
import { ShellyMock } from './shelly-mock.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load heating.js script
const heatingScriptPath = join(__dirname, '../scripts/heating.js');
const heatingScript = readFileSync(heatingScriptPath, 'utf-8');

/**
 * Run heating.js in a mocked environment
 */
function runHeatingScript(mock) {
  const context = {
    ...mock.createGlobalMocks(),
    console: console, // For debugging if needed
  };

  vm.createContext(context);
  vm.runInContext(heatingScript, context);

  return context;
}

/**
 * Helper to wait for async operations
 */
function waitForAsync() {
  return new Promise(resolve => setImmediate(resolve));
}

/**
 * Test runner
 */
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 Running Heating Script Tests\n');
    console.log('='.repeat(60));

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`✅ PASS: ${name}`);
      } catch (error) {
        this.failed++;
        console.log(`❌ FAIL: ${name}`);
        console.log(`   Error: ${error.message}`);
        if (error.stack) {
          console.log(`   ${error.stack.split('\n').slice(1, 3).join('\n   ')}`);
        }
      }
    }

    console.log('='.repeat(60));
    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed, ${this.tests.length} total\n`);

    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

const runner = new TestRunner();

// ============================================================================
// TEST SUITE: Backup Hour Fallback
// ============================================================================

runner.test('HTTP fails at hour 2 (backup hour) - activates RelayDown', async () => {
  const mock = new ShellyMock();
  mock.setHour(2);
  mock.setHttpResponse('calculate-settings', { error: -1 }); // Connection error

  runHeatingScript(mock);

  // Trigger the main timer (30000ms)
  mock.triggerTimer(30000);
  await waitForAsync();

  // Verify RelayDown was turned ON
  assert.strictEqual(mock.getLastSwitchState(1), true, 'RelayDown should be ON');

  // Verify RelayUp was turned OFF
  assert.strictEqual(mock.getLastSwitchState(0), false, 'RelayUp should be OFF');
});

runner.test('HTTP fails at hour 2, then timer runs again at hour 2 - should skip', async () => {
  const mock = new ShellyMock();
  mock.setHour(2);
  mock.setHttpResponse('calculate-settings', { error: -1 });

  runHeatingScript(mock);

  // First run at hour 2
  mock.triggerTimer(30000);
  await waitForAsync();

  const switchCallsAfterFirst = mock.switchCalls.length;
  assert.ok(switchCallsAfterFirst > 0, 'Should have switch calls after first run');

  // Second run at hour 2 (should skip)
  mock.triggerTimer(30000);
  await waitForAsync();

  const switchCallsAfterSecond = mock.switchCalls.length;
  assert.strictEqual(
    switchCallsAfterSecond,
    switchCallsAfterFirst,
    'Should not make additional switch calls on second run in same hour'
  );
});

runner.test('HTTP fails at hour 1 (non-backup) - does NOT activate relay', async () => {
  const mock = new ShellyMock();
  mock.setHour(1);
  mock.setHttpResponse('calculate-settings', { error: -1 });

  runHeatingScript(mock);

  mock.triggerTimer(30000);
  await waitForAsync();

  // Should still make switch calls, but both should be OFF (on=0)
  assert.strictEqual(mock.getLastSwitchState(1), false, 'RelayDown should be OFF');
  assert.strictEqual(mock.getLastSwitchState(0), false, 'RelayUp should be OFF');
});

runner.test('HTTP fails at hour 1, then succeeds at hour 2 - normal operation', async () => {
  const mock = new ShellyMock();
  mock.setHour(1);
  mock.setHttpResponse('calculate-settings', { error: -1 });

  runHeatingScript(mock);

  // First run at hour 1 - fails
  mock.triggerTimer(30000);
  await waitForAsync();

  assert.strictEqual(mock.getLastSwitchState(1), false, 'RelayDown should be OFF');
  assert.strictEqual(mock.getLastSwitchState(0), false, 'RelayUp should be OFF');

  // Change to hour 2 and set successful response
  mock.setHour(2);
  mock.setHttpResponse('calculate-settings', {
    code: 200,
    body: JSON.stringify({ currentPower: 6 })
  });

  // Second run at hour 2 - succeeds
  mock.triggerTimer(30000);
  await waitForAsync();

  assert.strictEqual(mock.getLastSwitchState(1), false, 'RelayDown should be OFF');
  assert.strictEqual(mock.getLastSwitchState(0), true, 'RelayUp should be ON');
});

runner.test('HTTP fails at hour 1, then fails at hour 2 - activates fallback', async () => {
  const mock = new ShellyMock();
  mock.setHour(1);
  mock.setHttpResponse('calculate-settings', { error: -1 });

  runHeatingScript(mock);

  // First run at hour 1 - fails, no relay activation
  mock.triggerTimer(30000);
  await waitForAsync();

  const callsAfterHour1 = mock.switchCalls.length;

  // Change to hour 2, still failing
  mock.setHour(2);

  // Second run at hour 2 - should activate fallback
  mock.triggerTimer(30000);
  await waitForAsync();

  assert.ok(mock.switchCalls.length > callsAfterHour1, 'Should make new switch calls at hour 2');
  assert.strictEqual(mock.getLastSwitchState(1), true, 'RelayDown should be ON during backup hour');
});

runner.test('All backup hours (2,3,4,5) activate fallback on error', async () => {
  const backupHours = [2, 3, 4, 5];

  for (const hour of backupHours) {
    const mock = new ShellyMock();
    mock.setHour(hour);
    mock.setHttpResponse('calculate-settings', { error: -1 });

    runHeatingScript(mock);

    mock.triggerTimer(30000);
    await waitForAsync();

    assert.strictEqual(
      mock.getLastSwitchState(1),
      true,
      `RelayDown should be ON at hour ${hour}`
    );
  }
});

runner.test('Non-backup hours (0,1,6-23) do NOT activate fallback on error', async () => {
  const nonBackupHours = [0, 1, 6, 12, 18, 23];

  for (const hour of nonBackupHours) {
    const mock = new ShellyMock();
    mock.setHour(hour);
    mock.setHttpResponse('calculate-settings', { error: -1 });

    runHeatingScript(mock);

    mock.triggerTimer(30000);
    await waitForAsync();

    assert.strictEqual(
      mock.getLastSwitchState(1),
      false,
      `RelayDown should be OFF at hour ${hour}`
    );
  }
});

// ============================================================================
// TEST SUITE: Normal Operation
// ============================================================================

runner.test('Successful response with currentPower=0 - both relays OFF', async () => {
  const mock = new ShellyMock();
  mock.setHour(10);
  mock.setHttpResponse('calculate-settings', {
    code: 200,
    body: JSON.stringify({ currentPower: 0 })
  });

  runHeatingScript(mock);

  mock.triggerTimer(30000);
  await waitForAsync();

  assert.strictEqual(mock.getLastSwitchState(1), false, 'RelayDown should be OFF');
  assert.strictEqual(mock.getLastSwitchState(0), false, 'RelayUp should be OFF');
});

runner.test('Successful response with currentPower=6 - RelayUp ON', async () => {
  const mock = new ShellyMock();
  mock.setHour(10);
  mock.setHttpResponse('calculate-settings', {
    code: 200,
    body: JSON.stringify({ currentPower: 6 })
  });

  runHeatingScript(mock);

  mock.triggerTimer(30000);
  await waitForAsync();

  assert.strictEqual(mock.getLastSwitchState(1), false, 'RelayDown should be OFF');
  assert.strictEqual(mock.getLastSwitchState(0), true, 'RelayUp should be ON');
});

runner.test('Successful response with currentPower=12 - RelayDown ON', async () => {
  const mock = new ShellyMock();
  mock.setHour(10);
  mock.setHttpResponse('calculate-settings', {
    code: 200,
    body: JSON.stringify({ currentPower: 12 })
  });

  runHeatingScript(mock);

  mock.triggerTimer(30000);
  await waitForAsync();

  assert.strictEqual(mock.getLastSwitchState(1), true, 'RelayDown should be ON');
  assert.strictEqual(mock.getLastSwitchState(0), false, 'RelayUp should be OFF');
});

runner.test('HTTP 500 error treated as failure - activates fallback in backup hour', async () => {
  const mock = new ShellyMock();
  mock.setHour(3);
  mock.setHttpResponse('calculate-settings', {
    code: 500,
    body: 'Internal Server Error'
  });

  runHeatingScript(mock);

  mock.triggerTimer(30000);
  await waitForAsync();

  assert.strictEqual(mock.getLastSwitchState(1), true, 'RelayDown should be ON on HTTP 500 during backup hour');
});

runner.test('Malformed JSON response treated as error - activates fallback in backup hour', async () => {
  const mock = new ShellyMock();
  mock.setHour(4);
  mock.setHttpResponse('calculate-settings', {
    code: 200,
    body: 'not valid json'
  });

  runHeatingScript(mock);

  mock.triggerTimer(30000);
  await waitForAsync();

  assert.strictEqual(mock.getLastSwitchState(1), true, 'RelayDown should be ON on malformed JSON during backup hour');
});

runner.test('Response with null body treated as error', async () => {
  const mock = new ShellyMock();
  mock.setHour(5);
  mock.setHttpResponse('calculate-settings', {
    code: 200,
    body: JSON.stringify(null)
  });

  runHeatingScript(mock);

  mock.triggerTimer(30000);
  await waitForAsync();

  assert.strictEqual(mock.getLastSwitchState(1), true, 'RelayDown should be ON on null body during backup hour');
});

// ============================================================================
// TEST SUITE: Hour Transition
// ============================================================================

runner.test('Successful operation at hour 2, then hour 3 - should execute again', async () => {
  const mock = new ShellyMock();
  mock.setHour(2);
  mock.setHttpResponse('calculate-settings', {
    code: 200,
    body: JSON.stringify({ currentPower: 6 })
  });

  runHeatingScript(mock);

  // First run at hour 2
  mock.triggerTimer(30000);
  await waitForAsync();

  const callsAfterHour2 = mock.switchCalls.length;

  // Change to hour 3
  mock.setHour(3);
  mock.setHttpResponse('calculate-settings', {
    code: 200,
    body: JSON.stringify({ currentPower: 12 })
  });

  // Second run at hour 3
  mock.triggerTimer(30000);
  await waitForAsync();

  assert.ok(
    mock.switchCalls.length > callsAfterHour2,
    'Should make new switch calls when hour changes'
  );
  assert.strictEqual(mock.getLastSwitchState(1), true, 'RelayDown should be ON at hour 3');
});

// ============================================================================
// RUN ALL TESTS
// ============================================================================

runner.run();

