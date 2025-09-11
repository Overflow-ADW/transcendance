// src/lib_front/rateLimitManager.ts

export interface RateLimitState {
  isBlocked: boolean;
  endTime: number | null;
  remainingTime: number;
}

class RateLimitManager {
  private static instance: RateLimitManager;
  private listeners: ((state: RateLimitState) => void)[] = [];
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): RateLimitManager {
    if (!RateLimitManager.instance) {
      RateLimitManager.instance = new RateLimitManager();
    }
    return RateLimitManager.instance;
  }

  isCurrentlyBlocked(): boolean {
    const endTime = this.getBlockEndTime();
    if (!endTime) return false;
    
    return Date.now() < endTime;
  }

  private getBlockEndTime(): number | null {
    if (typeof window === 'undefined') return null;
    
    const saved = localStorage.getItem('rateLimitEndTime');
    return saved ? parseInt(saved) : null;
  }

  triggerRateLimit(): void {
    if (typeof window === 'undefined') return;

    const endTime = Date.now() + (15 * 60 * 1000); // 15 minutes
    localStorage.setItem('rateLimitEndTime', endTime.toString());
    
    this.startMonitoring();
    this.notifyListeners();
  }

  getState(): RateLimitState {
    const endTime = this.getBlockEndTime();
    const now = Date.now();
    
    if (!endTime || now >= endTime) {
      if (endTime && now >= endTime) {
        this.clearRateLimit();
      }
      
      return {
        isBlocked: false,
        endTime: null,
        remainingTime: 0
      };
    }

    return {
      isBlocked: true,
      endTime,
      remainingTime: Math.ceil((endTime - now) / 1000)
    };
  }

  private clearRateLimit(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('rateLimitEndTime');
    this.stopMonitoring();
    this.notifyListeners();
  }

  private startMonitoring(): void {
    this.stopMonitoring();
    
    this.checkInterval = setInterval(() => {
      const state = this.getState();
      this.notifyListeners();
      
      if (!state.isBlocked) {
        this.stopMonitoring();
      }
    }, 1000);
  }

  private stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  subscribe(listener: (state: RateLimitState) => void): () => void {
    this.listeners.push(listener);

    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  checkAndNotify(): void {
    const state = this.getState();
    if (state.isBlocked) {
      this.startMonitoring();
    }
    this.notifyListeners();
  }
}

export const rateLimitManager = RateLimitManager.getInstance();
