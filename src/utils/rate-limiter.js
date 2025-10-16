class RateLimiter {
  constructor(maxCalls, periodMs) {
    this.maxCalls = maxCalls;
    this.periodMs = periodMs;
    this.calls = [];
  }

  async throttle() {
    const now = Date.now();
    
    // Remove old calls outside the time window
    this.calls = this.calls.filter(timestamp => now - timestamp < this.periodMs);
    
    // If we've hit the limit, wait
    if (this.calls.length >= this.maxCalls) {
      const oldestCall = this.calls[0];
      const waitTime = this.periodMs - (now - oldestCall);
      
      if (waitTime > 0) {
        await this.sleep(waitTime);
        return this.throttle(); // Retry after waiting
      }
    }
    
    // Record this call
    this.calls.push(now);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  reset() {
    this.calls = [];
  }

  getStats() {
    const now = Date.now();
    const recentCalls = this.calls.filter(timestamp => now - timestamp < this.periodMs);
    
    return {
      callsInPeriod: recentCalls.length,
      maxCalls: this.maxCalls,
      periodMs: this.periodMs,
      available: this.maxCalls - recentCalls.length
    };
  }
}

export class ExponentialBackoff {
  constructor(initialDelay = 1000, maxDelay = 60000, factor = 2) {
    this.initialDelay = initialDelay;
    this.maxDelay = maxDelay;
    this.factor = factor;
    this.currentDelay = initialDelay;
    this.attempts = 0;
  }

  async wait() {
    const delay = Math.min(this.currentDelay, this.maxDelay);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    this.currentDelay *= this.factor;
    this.attempts++;
    
    return this.attempts;
  }

  reset() {
    this.currentDelay = this.initialDelay;
    this.attempts = 0;
  }

  getAttempts() {
    return this.attempts;
  }
}

export default RateLimiter;