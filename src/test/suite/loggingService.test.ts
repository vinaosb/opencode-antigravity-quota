import * as assert from 'assert';
import * as vscode from 'vscode';
import { LoggingService } from '../../services/LoggingService';
import * as sinon from 'sinon';

suite('LoggingService Test Suite', () => {
    let outputChannelMock: any;
    let sandbox: sinon.SinonSandbox;

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
    });

    teardown(() => {
        sandbox.restore();
        // Reset the singleton instance if possible, though it's private.
        // Since we can't easily reset it, we'll just re-init in each test.
        (LoggingService as any).instance = undefined;
    });

    test('logDebug should append line with timestamp and DEBUG level', () => {
        LoggingService.init({ subscriptions: [] } as any);
        LoggingService.instanceRef.logDebug('test message');
        
        assert.strictEqual(outputChannelMock.appendLine.callCount, 1);
        const message = outputChannelMock.appendLine.firstCall.args[0];
        assert.ok(message.includes('[DEBUG] test message'));
        // Check for ISO timestamp format (e.g., 2026-01-26T...)
        assert.ok(/\d{4}-\d{2}-\d{2}T/.test(message));
    });

    test('logInfo should append line with timestamp and INFO level', () => {
        LoggingService.init({ subscriptions: [] } as any);
        LoggingService.instanceRef.logInfo('test message');
        
        assert.strictEqual(outputChannelMock.appendLine.callCount, 1);
        const message = outputChannelMock.appendLine.firstCall.args[0];
        assert.ok(message.includes('[INFO] test message'));
        assert.ok(/\d{4}-\d{2}-\d{2}T/.test(message));
    });

    test('logError should append line with timestamp, ERROR level and error details', () => {
        LoggingService.init({ subscriptions: [] } as any);
        const error = new Error('Test error');
        LoggingService.instanceRef.logError('test error message', error);
        
        assert.strictEqual(outputChannelMock.appendLine.callCount, 1);
        const message = outputChannelMock.appendLine.firstCall.args[0];
        assert.ok(message.includes('[ERROR] test error message'));
        assert.ok(message.includes('Error: Test error'));
        assert.ok(message.includes('Stack:'));
        assert.ok(/\d{4}-\d{2}-\d{2}T/.test(message));
    });

    test('should mask secrets in data objects', () => {
        LoggingService.init({ subscriptions: [] } as any);
        const data = {
            apiToken: 'secret123',
            password: 'mypassword',
            secretValue: 'hidden',
            apiKey: 'key123',
            nested: {
                token: 'nested-token'
            },
            public: 'visible'
        };
        LoggingService.instanceRef.logDebug('test secrets', data);
        
        const message = outputChannelMock.appendLine.firstCall.args[0];
        assert.ok(!message.includes('secret123'));
        assert.ok(!message.includes('mypassword'));
        assert.ok(!message.includes('hidden'));
        assert.ok(!message.includes('key123'));
        assert.ok(!message.includes('nested-token'));
        assert.ok(message.includes('***'));
        assert.ok(message.includes('"public": "visible"'));
    });
});
