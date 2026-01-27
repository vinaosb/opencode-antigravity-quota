import * as assert from 'assert';
import * as sinon from 'sinon';
import { QuotaService } from '../../services/QuotaService';
import { BackoffConfig } from '../../models/types';

suite('Jitter and Backoff Test Suite', () => {
    let loggingServiceMock: any;
    let historyServiceMock: any;
    let sandbox: sinon.SinonSandbox;

    const config: BackoffConfig = {
        baseDelayMs: 1000,
        multiplier: 2,
        maxDelayMs: 5000,
        maxRetries: 5,
        errorCacheSeconds: 30
    };

    setup(() => {
        sandbox = sinon.createSandbox();
        loggingServiceMock = { logInfo: sandbox.stub(), logDebug: sandbox.stub(), logError: sandbox.stub() };
        historyServiceMock = { addHistoryPoint: sandbox.stub().resolves() };
    });

    teardown(() => {
        sandbox.restore();
    });

    test('calculateBackoff should include jitter', () => {
        const quotaService = new QuotaService(300, loggingServiceMock, historyServiceMock, config);
        
        // Mock Math.random to return different values
        const randomStub = sandbox.stub(Math, 'random');
        
        // First call: Math.random() returns 0 (min jitter)
        randomStub.onFirstCall().returns(0); // for jitter calculation: (0 - 0.5) * 1000 * 0.4 = -200
        randomStub.onSecondCall().returns(0); // for finalJitter: 0
        const delay1 = (quotaService as any).calculateBackoff(1);
        assert.strictEqual(delay1, 800); // 1000 - 200 + 0

        // Second call: Math.random() returns 1 (max jitter)
        randomStub.onCall(2).returns(1); // (1 - 0.5) * 1000 * 0.4 = +200
        randomStub.onCall(3).returns(1); // finalJitter = 1000
        const delay2 = (quotaService as any).calculateBackoff(1);
        assert.strictEqual(delay2, 2200); // 1000 + 200 + 1000
    });

    test('calculateBackoff should cap at maxDelayMs before final jitter', () => {
        const quotaService = new QuotaService(300, loggingServiceMock, historyServiceMock, config);
        const randomStub = sandbox.stub(Math, 'random');
        
        // Large retry count that would exceed 5000ms
        // base=1000, mult=2, retry=4 -> 1000 * 2^3 = 8000
        
        randomStub.returns(0.5); // jitter = 0, finalJitter = 500
        const delay = (quotaService as any).calculateBackoff(4);
        
        // exponentialDelay = 8000
        // jitter = 0
        // delayBeforeFinal = min(8000 + 0, 5000) = 5000
        // total = 5000 + 500 = 5500
        assert.strictEqual(delay, 5500);
    });

    test('jitter range should be ±20% of base + 0-1000ms', () => {
        const quotaService = new QuotaService(300, loggingServiceMock, historyServiceMock, config);
        
        for (let i = 0; i < 100; i++) {
            const delay = (quotaService as any).calculateBackoff(1);
            // Expected range: [1000 - 200 + 0, 1000 + 200 + 1000] = [800, 2200]
            assert.ok(delay >= 800, `Delay ${delay} should be >= 800`);
            assert.ok(delay <= 2200, `Delay ${delay} should be <= 2200`);
        }
    });
});
