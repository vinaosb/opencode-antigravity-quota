import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import axios from 'axios';
import { LoggingService } from '../../services/LoggingService';
import { QuotaService } from '../../services/QuotaService';
import { Account, QuotaAdapterConfig } from '../../models/types';
import { SecretStorageService } from '../../services/SecretStorageService';
import { HistoryService } from '../../services/HistoryService';

suite('Header Masking Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let outputChannelMock: any;

    setup(() => {
        sandbox = sinon.createSandbox();
        outputChannelMock = {
            appendLine: sandbox.stub(),
            show: sandbox.stub(),
            dispose: sandbox.stub(),
            append: sandbox.stub(),
            replace: sandbox.stub(),
            clear: sandbox.stub(),
            hide: sandbox.stub(),
            name: 'Test Channel'
        };
        sandbox.stub(vscode.window, 'createOutputChannel').returns(outputChannelMock);
        (LoggingService as any).instance = undefined;
        LoggingService.init({ subscriptions: [] } as any);
    });

    teardown(() => {
        sandbox.restore();
        (LoggingService as any).instance = undefined;
    });

    test('LoggingService should mask sensitive headers', () => {
        const data = {
            headers: {
                'authorization': 'Bearer my-secret-token',
                'cookie': 'session=12345',
                'set-cookie': 'user=abc',
                'x-api-key': 'key-123',
                'x-auth-token': 'token-456',
                'content-type': 'application/json'
            },
            other: 'data'
        };

        LoggingService.instanceRef.logInfo('test headers', data);

        const logMessage = outputChannelMock.appendLine.firstCall.args[0];
        assert.ok(logMessage.includes('"authorization": "***"'));
        assert.ok(logMessage.includes('"cookie": "***"'));
        assert.ok(logMessage.includes('"set-cookie": "***"'));
        assert.ok(logMessage.includes('"x-api-key": "***"'));
        assert.ok(logMessage.includes('"x-auth-token": "***"'));
        assert.ok(logMessage.includes('"content-type": "application/json"'));
        assert.ok(!logMessage.includes('my-secret-token'));
        assert.ok(!logMessage.includes('session=12345'));
    });

    test('LoggingService should mask Authorization header in complex axios-like error objects', () => {
        const complexError = {
            message: 'Network Error',
            config: {
                headers: {
                    'Authorization': 'Bearer super-secret-token',
                    'Accept': 'application/json'
                }
            },
            response: {
                headers: {
                    'set-cookie': 'session=secret'
                }
            }
        };

        LoggingService.instanceRef.logError('Testing complex error', complexError);

        const logMessage = outputChannelMock.appendLine.firstCall.args[0];
        assert.ok(logMessage.includes('"Authorization": "***"'), 'Authorization should be masked');
        assert.ok(logMessage.includes('"set-cookie": "***"'), 'set-cookie should be masked');
        assert.ok(!logMessage.includes('super-secret-token'), 'Token should not be in logs');
        assert.ok(!logMessage.includes('session=secret'), 'Cookie should not be in logs');
    });

    test('QuotaService should strip headers from axios errors before logging', async () => {
        const historyServiceMock = { addHistoryPoint: sandbox.stub().resolves(), getHistory: sandbox.stub().returns([]) };
        const secretStorageMock = { getSecret: sandbox.stub().resolves('test-token') };
        sandbox.stub(SecretStorageService, 'instanceRef').get(() => secretStorageMock);
        sandbox.stub(HistoryService, 'instanceRef').get(() => historyServiceMock);

        const quotaService = new QuotaService(300, LoggingService.instanceRef, historyServiceMock as any);
        
        const axiosError = {
            isAxiosError: true,
            message: 'Request failed',
            config: {
                headers: {
                    'Authorization': 'Bearer test-token',
                    'Other': 'Value'
                },
                url: 'https://api.example.com'
            },
            response: {
                status: 401,
                headers: {
                    'Set-Cookie': 'secret-cookie'
                },
                data: { error: 'unauthorized' }
            },
            request: { some: 'internal-request-object' }
        };

        sandbox.stub(axios, 'get').rejects(axiosError);
        sandbox.stub(axios, 'isAxiosError').returns(true);

        const account: Account = {
            name: 'testAccount',
            endpoint: 'https://api.example.com/quota',
            tokenSecretName: 'test-secret',
            type: 'token'
        };
        const adapterConfig: QuotaAdapterConfig = {};

        await quotaService.fetchQuota(account, adapterConfig);

        // Check log output
        const logCalls = outputChannelMock.appendLine.getCalls();
        const errorLog = logCalls.find((call: any) => call.args[0].includes('API Error: 401 - Request failed'));
        
        assert.ok(errorLog, 'Error log not found');
        const logMessage = errorLog.args[0];
        
        // Should not contain sensitive data
        assert.ok(!logMessage.includes('test-token'), 'Log should not contain test-token');
        assert.ok(!logMessage.includes('secret-cookie'), 'Log should not contain secret-cookie');
        
        // Should have stripped 'request' object
        assert.ok(!logMessage.includes('internal-request-object'), 'Log should not contain internal-request-object');
        
        // Masked headers should be ***
        assert.ok(logMessage.includes('"Authorization": "***"'), 'Authorization should be masked');
        assert.ok(logMessage.includes('"Set-Cookie": "***"'), 'Set-Cookie should be masked');
    });
});
