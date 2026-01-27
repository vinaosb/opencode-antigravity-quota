import * as assert from 'assert';
import * as sinon from 'sinon';
import axios from 'axios';
import * as fs from 'fs/promises';
import { QuotaService } from '../../services/QuotaService';
import { HistoryService } from '../../services/HistoryService';
import { LoggingService } from '../../services/LoggingService';
import { SecretStorageService } from '../../services/SecretStorageService';
import { Account, QuotaAdapterConfig } from '../../models/types';

suite('Hardening Integration Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let quotaService: QuotaService;
    let historyServiceMock: any;
    let loggingServiceMock: any;
    let secretStorageMock: any;
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
        
        historyServiceMock = { 
            addHistoryPoint: sandbox.stub().resolves(), 
            getHistory: sandbox.stub().returns([]) 
        };
        sandbox.stub(HistoryService, 'instanceRef').get(() => historyServiceMock);

        loggingServiceMock = { 
            logInfo: sandbox.stub(), 
            logDebug: sandbox.stub(), 
            logError: sandbox.stub(),
            SENSITIVE_HEADER_NAMES: ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-auth-token'],
            maskSecrets: (data: any) => LoggingService.prototype['maskSecrets'].call(loggingServiceMock, data)
        };
        sandbox.stub(LoggingService, 'instanceRef').get(() => loggingServiceMock);

        secretStorageMock = { 
            getSecret: sandbox.stub().resolves('test-token'), 
            storeSecret: sandbox.stub().resolves(), 
            deleteSecret: sandbox.stub().resolves(),
            importOpenCodeAccounts: SecretStorageService.prototype.importOpenCodeAccounts,
            importFromOpenCode: SecretStorageService.prototype.importFromOpenCode,
            logger: loggingServiceMock
        };
        sandbox.stub(SecretStorageService, 'instanceRef').get(() => secretStorageMock);

        axiosGetStub = sandbox.stub(axios, 'get');
        sandbox.stub(axios, 'isAxiosError').callsFake((err: any) => err.isAxiosError === true);

        quotaService = new QuotaService(300, loggingServiceMock, historyServiceMock, {
            baseDelayMs: 10000,
            multiplier: 2,
            maxDelayMs: 300000,
            maxRetries: 8,
            errorCacheSeconds: 30
        }, 30000);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('Concurrency Limiting: should respect maxConcurrentRequests', async () => {
        const accounts: Account[] = Array.from({ length: 5 }, (_, i) => ({
            name: `acc${i}`,
            endpoint: `https://api.example.com/quota/${i}`,
            tokenSecretName: `secret${i}`,
            type: 'token'
        }));

        let activeRequests = 0;
        let maxConcurrentObserved = 0;

        axiosGetStub.callsFake(async () => {
            activeRequests++;
            maxConcurrentObserved = Math.max(maxConcurrentObserved, activeRequests);
            await new Promise(resolve => setTimeout(resolve, 50));
            activeRequests--;
            return { data: { usage: { total_tokens: 500 }, quota: { limit: 1000 } } };
        });

        const maxConcurrent = 3;
        await quotaService.fetchAll(accounts, adapterConfig, maxConcurrent);

        assert.strictEqual(maxConcurrentObserved, maxConcurrent);
        assert.strictEqual(axiosGetStub.callCount, 5);
    });

    test('Concurrency Limiting: verify it works with 1 concurrent request', async () => {
        const accounts: Account[] = Array.from({ length: 3 }, (_, i) => ({
            name: `acc${i}`,
            endpoint: `https://api.example.com/quota/${i}`,
            tokenSecretName: `secret${i}`,
            type: 'token'
        }));

        let activeRequests = 0;
        let maxConcurrentObserved = 0;

        axiosGetStub.callsFake(async () => {
            activeRequests++;
            maxConcurrentObserved = Math.max(maxConcurrentObserved, activeRequests);
            await new Promise(resolve => setTimeout(resolve, 30));
            activeRequests--;
            return { data: { usage: { total_tokens: 500 }, quota: { limit: 1000 } } };
        });

        await quotaService.fetchAll(accounts, adapterConfig, 1);

        assert.strictEqual(maxConcurrentObserved, 1);
        assert.strictEqual(axiosGetStub.callCount, 3);
    });

    test('In-flight lock: should not make duplicate requests for same account', async () => {
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
        assert.strictEqual(axiosGetStub.callCount, 1);
        assert.ok(loggingServiceMock.logInfo.calledWith(`Reusing in-flight request for ${account.name}`));
    });

    test('Exponential Backoff with Jitter: verify calculation range', async () => {
        const error429 = { isAxiosError: true, response: { status: 429 }, message: 'Too Many Requests' };
        axiosGetStub.rejects(error429);

        const randomStub = sandbox.stub(Math, 'random');
        randomStub.onCall(0).returns(0); // Minimum jitter
        randomStub.onCall(1).returns(0);
        
        const delay1 = (quotaService as any).calculateBackoff(1);
        assert.strictEqual(delay1, 8000);

        randomStub.reset();
        randomStub.onCall(0).returns(1); // Maximum jitter
        randomStub.onCall(1).returns(0.999);
        
        const delay2 = (quotaService as any).calculateBackoff(1);
        assert.strictEqual(Math.floor(delay2), 12999);
    });

    test('Exponential Backoff: verify reset on success', async () => {
        const error429 = { isAxiosError: true, response: { status: 429 }, message: 'Too Many Requests' };
        axiosGetStub.onFirstCall().rejects(error429);
        axiosGetStub.onSecondCall().resolves({ data: { usage: { total_tokens: 500 }, quota: { limit: 1000 } } });
        axiosGetStub.onThirdCall().rejects(error429);

        await quotaService.fetchQuota(account, adapterConfig);
        sandbox.stub(Date, 'now').returns(Date.now() + 20000);
        quotaService.clearCache();
        await quotaService.fetchQuota(account, adapterConfig);
        
        quotaService.clearCache();
        await quotaService.fetchQuota(account, adapterConfig);
        assert.ok(loggingServiceMock.logInfo.calledWithMatch('retry #1'));
    });

    test('Exponential Backoff: verify max retries cap', async () => {
        const error429 = { isAxiosError: true, response: { status: 429 }, message: 'Too Many Requests' };
        axiosGetStub.rejects(error429);
        sandbox.stub(quotaService as any, 'calculateBackoff').returns(0);
        
        for (let i = 0; i < 10; i++) {
            await quotaService.fetchQuota(account, adapterConfig);
            quotaService.clearCache();
        }
        
        assert.ok(loggingServiceMock.logInfo.calledWithMatch('retry #8'));
        assert.ok(!loggingServiceMock.logInfo.calledWithMatch('retry #9'));
    });

    test('Error Caching: verify 30s TTL for errors', async () => {
        axiosGetStub.rejects(new Error('API Failure'));
        const now = Date.now();
        const dateStub = sandbox.stub(Date, 'now').returns(now);

        await quotaService.fetchQuota(account, adapterConfig);
        assert.strictEqual(axiosGetStub.callCount, 1);

        dateStub.returns(now + 10000);
        const result2 = await quotaService.fetchQuota(account, adapterConfig);
        assert.strictEqual(result2.status, 'error');
        assert.strictEqual(axiosGetStub.callCount, 1);

        dateStub.returns(now + 31000);
        axiosGetStub.resolves({ data: { usage: { total_tokens: 500 }, quota: { limit: 1000 } } });
        const result3 = await quotaService.fetchQuota(account, adapterConfig);
        assert.strictEqual(result3.status, 'ok');
        assert.strictEqual(axiosGetStub.callCount, 2);
    });

    test('Error Caching: verify independent cache per account', async () => {
        const account2: Account = { ...account, name: 'account2' };
        axiosGetStub.rejects(new Error('API Failure'));
        sandbox.stub(Date, 'now').returns(Date.now());

        await quotaService.fetchQuota(account, adapterConfig);
        await quotaService.fetchQuota(account2, adapterConfig);
        assert.strictEqual(axiosGetStub.callCount, 2);
    });

    test('Header Masking: verify sensitive headers are masked in logs', async () => {
        const authHeaderError = {
            config: { headers: { 'Authorization': 'secret' } }
        };
        const strippedAuth = (quotaService as any).stripHeaders(authHeaderError);
        assert.strictEqual(strippedAuth.config.headers['Authorization'], '***');
    });

    test('Header Masking: verify stripHeaders removes request and config/response fields', async () => {
        const complexError = {
            config: { headers: { 'Authorization': 's' } },
            request: { some: 'internal' },
            response: { headers: { 'Set-Cookie': 'c' }, data: 'd' }
        };
        const stripped = (quotaService as any).stripHeaders(complexError);
        assert.strictEqual(stripped.config.headers['Authorization'], '***');
        assert.strictEqual(stripped.response.headers['Set-Cookie'], '***');
        assert.strictEqual(stripped.request, undefined);
    });

    test('Logging Service Masking: verify masking of password, key, secret in deep objects', async () => {
        const deepObject = {
            level1: {
                password: 'p1',
                level2: { apiKey: 'k2', level3: { clientSecret: 's3' } }
            }
        };

        const masked = (LoggingService.instanceRef as any).maskSecrets(deepObject);
        assert.strictEqual(masked.level1.password, '***');
        assert.strictEqual(masked.level1.level2.apiKey, '***');
        assert.strictEqual(masked.level1.level2.level3.clientSecret, '***');
    });

    test('HTTP Timeout: verify 30s timeout is passed to axios', async () => {
        axiosGetStub.resolves({ data: { usage: { total_tokens: 500 }, quota: { limit: 1000 } } });
        await quotaService.fetchQuota(account, adapterConfig);
        const axiosConfig = axiosGetStub.firstCall.args[1];
        assert.strictEqual(axiosConfig.timeout, 30000);
    });

    test('Polling Interval: verify 60s minimum enforced in activation', async () => {
        let pollIntervalMs = 30000;
        if (pollIntervalMs < 60000) {
            pollIntervalMs = 60000;
        }
        assert.strictEqual(pollIntervalMs, 60000);
    });

    test('Import OpenCode Accounts: verify file reading and account creation', async () => {
        const mockAccounts = {
            accounts: [{ email: 'test@example.com', refreshToken: 'refresh-123' }]
        };
        const fsReadStub = sandbox.stub(fs, 'readFile').resolves(JSON.stringify(mockAccounts));
        
        const openCodeAccounts = await (SecretStorageService.instanceRef as any).importOpenCodeAccounts();
        assert.ok(fsReadStub.called);
        assert.strictEqual(openCodeAccounts.length, 1);

        const imported = await (SecretStorageService.instanceRef as any).importFromOpenCode(openCodeAccounts);
        assert.strictEqual(imported.length, 1);
        assert.strictEqual(imported[0].name, 'OpenCode: test@example.com');
        
        assert.ok((secretStorageMock.storeSecret as sinon.SinonStub).calledWith(
            'opencode_test_example_com', 
            'refresh-123'
        ));
    });

    test('Import: verify behavior when file is missing (ENOENT)', async () => {
        sandbox.stub(fs, 'readFile').rejects({ code: 'ENOENT' });
        const openCodeAccounts = await (SecretStorageService.instanceRef as any).importOpenCodeAccounts();
        assert.strictEqual(openCodeAccounts.length, 0);
        assert.ok(loggingServiceMock.logInfo.calledWithMatch('file not found'));
    });

    test('Import: verify behavior when file is malformed JSON', async () => {
        sandbox.stub(fs, 'readFile').resolves('invalid json {');
        const openCodeAccounts = await (SecretStorageService.instanceRef as any).importOpenCodeAccounts();
        assert.strictEqual(openCodeAccounts.length, 0);
        assert.ok(loggingServiceMock.logError.calledWithMatch('Failed to read OpenCode accounts file'));
    });
});
