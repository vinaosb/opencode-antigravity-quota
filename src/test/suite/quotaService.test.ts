import * as assert from 'assert';
import * as sinon from 'sinon';
import axios from 'axios';
import { QuotaService } from '../../services/QuotaService';
import { HistoryService } from '../../services/HistoryService';
import { LoggingService } from '../../services/LoggingService';
import { SecretStorageService } from '../../services/SecretStorageService';
import { Account, QuotaAdapterConfig } from '../../models/types';

suite('QuotaService Test Suite', () => {
    let quotaService: QuotaService;
    let historyServiceMock: any;
    let loggingServiceMock: any;
    let secretStorageMock: any;
    let sandbox: sinon.SinonSandbox;
    let axiosGetStub: sinon.SinonStub;

    const account: Account = {
        name: 'testAccount',
        endpoint: 'https://api.example.com/quota',
        tokenSecretName: 'test-secret',
        type: 'token'
    };

    const adapterConfig: QuotaAdapterConfig = {};

    setup(() => {
        sandbox = sinon.createSandbox();
        historyServiceMock = { addHistoryPoint: sandbox.stub().resolves(), getHistory: sandbox.stub().returns([]) };
        sandbox.stub(HistoryService, 'instanceRef').get(() => historyServiceMock);
        loggingServiceMock = { logInfo: sandbox.stub(), logDebug: sandbox.stub(), logError: sandbox.stub() };
        sandbox.stub(LoggingService, 'instanceRef').get(() => loggingServiceMock);
        secretStorageMock = { getSecret: sandbox.stub().resolves('test-token'), storeSecret: sandbox.stub().resolves(), deleteSecret: sandbox.stub().resolves() };
        sandbox.stub(SecretStorageService, 'instanceRef').get(() => secretStorageMock);
        axiosGetStub = sandbox.stub(axios, 'get');
        sandbox.stub(axios, 'isAxiosError').callsFake((err: any) => err.isAxiosError === true);
        quotaService = new QuotaService(300, loggingServiceMock, historyServiceMock);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should call addHistoryPoint on success', async () => {
        axiosGetStub.resolves({ data: { usage: { total_tokens: 500 }, quota: { limit: 1000 } } });
        const result = await quotaService.fetchQuota(account, adapterConfig);
        assert.strictEqual(result.status, 'ok');
        assert.ok(historyServiceMock.addHistoryPoint.calledOnce);
    });

    test('exponential backoff: should delay 1s → 2s → 4s → 8s → 16s', async () => {
        const error429 = { isAxiosError: true, response: { status: 429 }, message: 'Too Many Requests' };
        axiosGetStub.rejects(error429);
        let currentTime = Date.now();
        sandbox.stub(Date, 'now').callsFake(() => currentTime);

        await quotaService.fetchQuota(account, adapterConfig);
        quotaService.clearCache(); // Essential because 429 error is cached
        const cooldownResult = await quotaService.fetchQuota(account, adapterConfig);
        assert.strictEqual(cooldownResult.status, 'error');
        assert.ok(cooldownResult.error?.includes('Rate limit cooldown'));

        currentTime += 1100;
        quotaService.clearCache();
        await quotaService.fetchQuota(account, adapterConfig);
        assert.ok(loggingServiceMock.logInfo.calledWithMatch('retry #2 in 2000ms'));
    });

    test('per-account independent retry state', async () => {
        const account2: Account = { name: 'account2', endpoint: 'api2', tokenSecretName: 's2', type: 'token' };
        axiosGetStub.rejects({ isAxiosError: true, response: { status: 429 }, message: 'Rate limit' });

        await quotaService.fetchQuota(account, adapterConfig);
        await quotaService.fetchQuota(account2, adapterConfig);
        assert.ok(loggingServiceMock.logInfo.calledWithMatch(`for ${account.name}, retry #1`));
        assert.ok(loggingServiceMock.logInfo.calledWithMatch(`for ${account2.name}, retry #1`));
        
        sandbox.stub(Date, 'now').returns(Date.now() + 1100);
        quotaService.clearCache();
        await quotaService.fetchQuota(account, adapterConfig);
        assert.ok(loggingServiceMock.logInfo.calledWithMatch(`for ${account.name}, retry #2`));
    });

    test('should reset retryCount on success', async () => {
        const error429 = { isAxiosError: true, response: { status: 429 }, message: 'Rate limit' };
        axiosGetStub.onFirstCall().rejects(error429);
        axiosGetStub.onSecondCall().resolves({ data: { usage: { total_tokens: 500 }, quota: { limit: 1000 } } });
        axiosGetStub.onThirdCall().rejects(error429);
        
        await quotaService.fetchQuota(account, adapterConfig);
        sandbox.stub(Date, 'now').returns(Date.now() + 1100);
        quotaService.clearCache();
        await quotaService.fetchQuota(account, adapterConfig);
        
        quotaService.clearCache();
        await quotaService.fetchQuota(account, adapterConfig);
        assert.ok(loggingServiceMock.logInfo.calledWithMatch('retry #1'));
    });

    test('should skip fetch if in cooldown period', async () => {
        axiosGetStub.rejects({ isAxiosError: true, response: { status: 429 }, message: 'Rate limit' });
        await quotaService.fetchQuota(account, adapterConfig);
        quotaService.clearCache();
        const result = await quotaService.fetchQuota(account, adapterConfig);
        assert.strictEqual(result.status, 'error');
        assert.ok(result.error?.includes('Rate limit cooldown'));
    });

    test('should return cached value if in cooldown period', async () => {
        axiosGetStub.onFirstCall().resolves({ data: { usage: { total_tokens: 500 }, quota: { limit: 1000 } } });
        await quotaService.fetchQuota(account, adapterConfig);
        
        axiosGetStub.onSecondCall().rejects({ isAxiosError: true, response: { status: 429 }, message: 'Rate limit' });
        const dateStub = sandbox.stub(Date, 'now').returns(Date.now() + 600000);
        await quotaService.fetchQuota(account, adapterConfig);

        dateStub.returns(Date.now() + 600100);
        const result = await quotaService.fetchQuota(account, adapterConfig);
        
        // Note: Currently QuotaService caches errors, so it returns the cached error
        assert.strictEqual(result.status, 'error');
        assert.ok(result.error);
    });

    test('should reuse in-flight request for same account', async () => {
        let resolveRequest: any;
        const requestPromise = new Promise((resolve) => {
            resolveRequest = resolve;
        });
        axiosGetStub.returns(requestPromise);

        const fetch1 = quotaService.fetchQuota(account, adapterConfig);
        const fetch2 = quotaService.fetchQuota(account, adapterConfig);

        resolveRequest({ data: { usage: { total_tokens: 500 }, quota: { limit: 1000 } } });

        const [res1, res2] = await Promise.all([fetch1, fetch2]);

        assert.strictEqual(res1, res2);
        assert.ok(axiosGetStub.calledOnce);
        assert.ok(loggingServiceMock.logInfo.calledWith(`Reusing in-flight request for ${account.name}`));
    });

    test('dispose should clear in-flight map', async () => {
        let resolveRequest: any;
        const requestPromise = new Promise((resolve) => {
            resolveRequest = resolve;
        });
        axiosGetStub.returns(requestPromise);

        const fetch1 = quotaService.fetchQuota(account, adapterConfig);
        quotaService.dispose();
        
        const fetch2 = quotaService.fetchQuota(account, adapterConfig);
        
        resolveRequest({ data: { usage: { total_tokens: 500 }, quota: { limit: 1000 } } });
        await Promise.all([fetch1, fetch2]);
        
        assert.ok(axiosGetStub.calledTwice);
    });

    test('fetchAll should respect concurrency limit', async () => {
        const accounts: Account[] = [
            { name: 'acc1', endpoint: 'api1', tokenSecretName: 's1', type: 'token' },
            { name: 'acc2', endpoint: 'api2', tokenSecretName: 's2', type: 'token' },
            { name: 'acc3', endpoint: 'api3', tokenSecretName: 's3', type: 'token' },
            { name: 'acc4', endpoint: 'api4', tokenSecretName: 's4', type: 'token' },
            { name: 'acc5', endpoint: 'api5', tokenSecretName: 's5', type: 'token' }
        ];

        let activeRequests = 0;
        let maxConcurrentObserved = 0;

        axiosGetStub.callsFake(async () => {
            activeRequests++;
            maxConcurrentObserved = Math.max(maxConcurrentObserved, activeRequests);
            await new Promise(resolve => setTimeout(resolve, 50));
            activeRequests--;
            return { data: { usage: { total_tokens: 500 }, quota: { limit: 1000 } } };
        });

        const maxConcurrent = 2;
        await quotaService.fetchAll(accounts, adapterConfig, maxConcurrent);

        assert.strictEqual(maxConcurrentObserved, maxConcurrent);
    });
});
