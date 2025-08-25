type EventCallback = (...args: any[]) => void;

export class EventEmitter {
    private events: { [key: string]: EventCallback[] } = {};

    public on(event: string, callback: EventCallback): this {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        return this;
    }

    public off(event: string, callback: EventCallback): this {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
        return this;
    }

    public emit(event: string, ...args: any[]): boolean {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(...args));
            return true;
        }
        return false;
    }

    public once(event: string, callback: EventCallback): this {
        const onceCallback = (...args: any[]) => {
            this.off(event, onceCallback);
            callback(...args);
        };
        return this.on(event, onceCallback);
    }

    public removeAllListeners(event?: string): this {
        if (event) {
            this.events[event] = [];
        } else {
            this.events = {};
        }
        return this;
    }
}