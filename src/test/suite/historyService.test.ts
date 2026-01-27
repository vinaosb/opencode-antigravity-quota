import * as assert from 'assert';
import * as vscode from 'vscode';
import { HistoryService } from '../../services/HistoryService';
import { LoggingService } from '../../services/LoggingService';
import * as sinon from 'sinon';

suite('HistoryService Test Suite', () => {
    let globalStateMock: sinon.SinonStubbedInstance<vscode.Memento>;
    let contextMock: vscode.ExtensionContext;
    let sandbox: sinon.SinonSandbox;
    let outputChannelMock: any;

    setup(() => {
        sandbox = sinon.createSandbox();

        // Mock GlobalState
        globalStateMock = {
            get: sandbox.stub(),
            update: sandbox.stub(),
            keys: sandbox.stub()
        } as any;

        contextMock = {
            globalState: globalStateMock,
            subscriptions: []
        } as any;

        // Mock LoggingService to avoid vscode.window.createOutputChannel
        outputChannelMock = {
            appendLine: sandbox.stub(),
            dispose: sandbox.stub()
        };
        
        // Use reflection/any to set the private instance
        (LoggingService as any).instance = new (LoggingService as any)(outputChannelMock);

        // Reset HistoryService instance before each test
        (HistoryService as any).instance = undefined;
        HistoryService.init(contextMock);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('addHistoryPoint should add point and maintain max 24', async () => {
        const historyService = HistoryService.instanceRef;
        const accountName = 'testAccount';
        
        // Mock existing empty history
        globalStateMock.get.withArgs(`opencodeQuota.history.${accountName}`, sinon.match.any).returns([]);
        
        const usage1 = { used: 100, limit: 1000, remaining: 900, reset: null };
        await historyService.addHistoryPoint(accountName, usage1);
        
        assert.ok(globalStateMock.update.calledOnce);
        const updatedHistory = globalStateMock.update.firstCall.args[1];
        assert.strictEqual(updatedHistory.length, 1);
        assert.strictEqual(updatedHistory[0].used, 100);

        // Test FIFO eviction: add 25 points total
        // Reset stub for next calls
        globalStateMock.update.resetHistory();
        
        let currentHistory: any[] = [];
        for (let i = 0; i < 25; i++) {
            // Mock getHistory returning the "current" state
            globalStateMock.get.withArgs(`opencodeQuota.history.${accountName}`, sinon.match.any).returns(currentHistory);
            
            await historyService.addHistoryPoint(accountName, { used: i, limit: 1000, remaining: 1000 - i, reset: null });
            
            // Capture the update to simulate persistence
            currentHistory = globalStateMock.update.lastCall.args[1];
        }
        
        assert.strictEqual(currentHistory.length, 24, 'Should maintain max 24 points');
        assert.strictEqual(currentHistory[0].used, 1, 'Should have evicted the first point (used: 0)');
        assert.strictEqual(currentHistory[23].used, 24, 'Should have the latest point');
    });

    test('getHistory should return array with Date objects', () => {
        const historyService = HistoryService.instanceRef;
        const accountName = 'testAccount';
        
        const storedHistory = [
            { timestamp: '2026-01-26T10:00:00Z', used: 100, limit: 1000 }
        ];
        globalStateMock.get.withArgs(`opencodeQuota.history.${accountName}`, sinon.match.any).returns(storedHistory);
        
        const history = historyService.getHistory(accountName);
        assert.strictEqual(history.length, 1);
        assert.ok(history[0].timestamp instanceof Date, 'Should convert string timestamp to Date object');
        assert.strictEqual(history[0].timestamp.toISOString(), '2026-01-26T10:00:00.000Z');
    });

    test('clearHistory should remove history from GlobalState', async () => {
        const historyService = HistoryService.instanceRef;
        const accountName = 'testAccount';
        
        await historyService.clearHistory(accountName);
        
        assert.ok(globalStateMock.update.calledWith(`opencodeQuota.history.${accountName}`, undefined));
    });

    test('addHistoryPoint should not store secrets in GlobalState', async () => {
        const historyService = HistoryService.instanceRef;
        const accountName = 'testAccount';
        
        globalStateMock.get.returns([]);
        
        // usage object might have sensitive data (though QuotaUsage usually doesn't, let's be safe)
        const usage = { used: 100, limit: 1000, remaining: 900, reset: 'secret-date-or-token' } as any;
        await historyService.addHistoryPoint(accountName, usage);
        
        const updatedHistory = globalStateMock.update.firstCall.args[1];
        const storedPoint = updatedHistory[0];
        
        assert.strictEqual(storedPoint.used, 100);
        assert.strictEqual(storedPoint.limit, 1000);
        assert.strictEqual(storedPoint.reset, undefined, 'Extra fields like "reset" should not be stored in history');
        assert.ok(storedPoint.timestamp instanceof Date);
    });

    test('HistoryService should throw if not initialized', () => {
        (HistoryService as any).instance = undefined;
        assert.throws(() => HistoryService.instanceRef, /HistoryService not initialized/);
    });
});
