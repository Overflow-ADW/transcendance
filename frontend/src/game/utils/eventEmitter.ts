/**
 * Simple EventEmitter implementation for browser environment
 */
export class EventEmitter {
    private events: { [key: string]: Function[] } = {};

    /**
     * Subscribe to an event
     * @param event Event name
     * @param listener Callback function
     */
    on(event: string, listener: Function): void {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    /**
     * Unsubscribe from an event
     * @param event Event name
     * @param listener Callback function to remove
     */
    off(event: string, listener: Function): void {
        if (!this.events[event]) return;
        
        const index = this.events[event].indexOf(listener);
        if (index > -1) {
            this.events[event].splice(index, 1);
        }
    }

    /**
     * Emit an event
     * @param event Event name
     * @param args Arguments to pass to listeners
     */
    emit(event: string, ...args: any[]): void {
        if (!this.events[event]) return;
        
        this.events[event].forEach(listener => {
            try {
                listener(...args);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    /**
     * Remove all listeners for an event or all events
     * @param event Optional event name. If not provided, all events are cleared
     */
    removeAllListeners(event?: string): void {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }
}