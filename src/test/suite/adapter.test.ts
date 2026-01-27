import * as assert from 'assert';
import { QuotaAdapter } from '../../adapter/QuotaAdapter';
import * as antigravityMock from '../mocks/antigravity.json';
import * as alternateMock from '../mocks/alternate.json';

suite('QuotaAdapter Test Suite', () => {

	test('Adapts Antigravity format correctly', () => {
        const config = {}; // Default config matches Antigravity
		const adapter = new QuotaAdapter(config);
        const result = adapter.adapt(antigravityMock);

        assert.strictEqual(result.used, 1500);
        assert.strictEqual(result.limit, 5000);
        assert.strictEqual(result.remaining, 3500);
        assert.ok(result.reset?.includes('2023-10-27'));
	});

    test('Adapts Alternate format with config correctly', () => {
        const config = {
            usedPath: 'data.current_usage',
            limitPath: 'data.max_limit',
            resetPath: 'data.next_reset'
        };
		const adapter = new QuotaAdapter(config);
        const result = adapter.adapt(alternateMock);

        assert.strictEqual(result.used, 120);
        assert.strictEqual(result.limit, 1000);
        assert.strictEqual(result.remaining, 880);
        assert.ok(result.reset?.includes('2023-11-01'));
	});

    test('Handles missing data gracefully', () => {
        const adapter = new QuotaAdapter({});
        const result = adapter.adapt({});
        assert.strictEqual(result.used, 0);
        assert.strictEqual(result.limit, 0);
    });
});
