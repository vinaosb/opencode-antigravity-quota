import * as vscode from 'vscode';

export class LoggingService {
    private static instance: LoggingService;
    private outputChannel: vscode.OutputChannel;
    private readonly SENSITIVE_HEADER_NAMES = [
        'authorization',
        'cookie',
        'set-cookie',
        'x-api-key',
        'x-auth-token'
    ];

    private constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    static init(context: vscode.ExtensionContext): void {
        const outputChannel = vscode.window.createOutputChannel("OpenCode Quota Monitor");
        LoggingService.instance = new LoggingService(outputChannel);
        context.subscriptions.push(outputChannel);
    }

    static get instanceRef(): LoggingService {
        if (!LoggingService.instance) {
            throw new Error('LoggingService not initialized');
        }
        return LoggingService.instance;
    }

    private getTimestamp(): string {
        return new Date().toISOString();
    }

    private maskSecrets(data: any): any {
        if (!data) return data;
        
        if (typeof data !== 'object') return data;

        if (Array.isArray(data)) {
            return data.map(item => this.maskSecrets(item));
        }

        const maskedData = { ...data };
        const secretKeys = ['token', 'password', 'secret', 'key'];

        for (const key in maskedData) {
            const lowerKey = key.toLowerCase();
            if (secretKeys.some(sk => lowerKey.includes(sk))) {
                maskedData[key] = '***';
            } else if (this.SENSITIVE_HEADER_NAMES.includes(lowerKey)) {
                maskedData[key] = '***';
            } else if (typeof maskedData[key] === 'object' && maskedData[key] !== null) {
                maskedData[key] = this.maskSecrets(maskedData[key]);
            }
        }

        return maskedData;
    }

    private formatMessage(level: string, message: string, data?: any): string {
        const timestamp = this.getTimestamp();
        let logMessage = `[${timestamp}] [${level}] ${message}`;
        
        if (data) {
            const maskedData = this.maskSecrets(data);
            try {
                const dataString = JSON.stringify(maskedData, null, 2);
                logMessage += `\nData: ${dataString}`;
            } catch (e) {
                logMessage += `\nData: [Circular or Unserializable]`;
            }
        }
        
        return logMessage;
    }

    logDebug(message: string, data?: any): void {
        this.outputChannel.appendLine(this.formatMessage('DEBUG', message, data));
    }

    logInfo(message: string, data?: any): void {
        this.outputChannel.appendLine(this.formatMessage('INFO', message, data));
    }

    logError(message: string, error?: any): void {
        let logMessage = this.formatMessage('ERROR', message);
        
        if (error) {
            const maskedError = this.maskSecrets(error);
            if (error instanceof Error) {
                logMessage += `\nError: ${error.message}`;
                if (error.stack) {
                    logMessage += `\nStack: ${error.stack}`;
                }
            } else {
                try {
                    logMessage += `\nError Object: ${JSON.stringify(maskedError, null, 2)}`;
                } catch (e) {
                    logMessage += `\nError Object: [Unserializable]`;
                }
            }
        }
        
        this.outputChannel.appendLine(logMessage);
    }
}
