/**
 * Cache Service
 * 
 * Provides in-memory caching with TTL support
 * Falls back gracefully if caching fails
 * 
 * For production, this can be replaced with Redis
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    this.enabled = process.env.CACHE_ENABLED !== 'false'; // Enabled by default
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }
  
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    if (!this.enabled) return null;
    
    try {
      const item = this.cache.get(key);
      
      if (!item) {
        this.stats.misses++;
        return null;
      }
      
      // Check if expired
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.cache.delete(key);
        this.clearTimer(key);
        this.stats.misses++;
        return null;
      }
      
      this.stats.hits++;
      return item.value;
    } catch (error) {
      console.warn('Cache get error:', error.message);
      return null;
    }
  }
  
  /**
   * Set value in cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = 300) {
    if (!this.enabled) return false;
    
    try {
      const expiresAt = ttl > 0 ? Date.now() + (ttl * 1000) : null;
      
      this.cache.set(key, {
        value,
        expiresAt,
        createdAt: Date.now()
      });
      
      // Set timer to auto-delete after TTL
      if (ttl > 0) {
        this.clearTimer(key);
        const timer = setTimeout(() => {
          this.cache.delete(key);
          this.timers.delete(key);
        }, ttl * 1000);
        this.timers.set(key, timer);
      }
      
      this.stats.sets++;
      return true;
    } catch (error) {
      console.warn('Cache set error:', error.message);
      return false;
    }
  }
  
  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    if (!this.enabled) return false;
    
    try {
      const deleted = this.cache.delete(key);
      this.clearTimer(key);
      
      if (deleted) {
        this.stats.deletes++;
      }
      
      return deleted;
    } catch (error) {
      console.warn('Cache delete error:', error.message);
      return false;
    }
  }
  
  /**
   * Delete all keys matching a pattern
   * @param {string} pattern - Pattern to match (supports * wildcard)
   * @returns {Promise<number>} Number of keys deleted
   */
  async delPattern(pattern) {
    if (!this.enabled) return 0;
    
    try {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      let count = 0;
      
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          await this.del(key);
          count++;
        }
      }
      
      return count;
    } catch (error) {
      console.warn('Cache delPattern error:', error.message);
      return 0;
    }
  }
  
  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Exists status
   */
  async exists(key) {
    if (!this.enabled) return false;
    
    try {
      const item = this.cache.get(key);
      
      if (!item) return false;
      
      // Check if expired
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.cache.delete(key);
        this.clearTimer(key);
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('Cache exists error:', error.message);
      return false;
    }
  }
  
  /**
   * Clear all cache entries
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      // Clear all timers
      for (const timer of this.timers.values()) {
        clearTimeout(timer);
      }
      
      this.cache.clear();
      this.timers.clear();
      
      console.log('✅ Cache cleared');
    } catch (error) {
      console.warn('Cache clear error:', error.message);
    }
  }
  
  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      enabled: this.enabled
    };
  }
  
  /**
   * Reset cache statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }
  
  /**
   * Clear timer for a key
   * @param {string} key - Cache key
   * @private
   */
  clearTimer(key) {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }
  
  /**
   * Enable caching
   */
  enable() {
    this.enabled = true;
    console.log('✅ Cache enabled');
  }
  
  /**
   * Disable caching
   */
  disable() {
    this.enabled = false;
    console.log('⚠️ Cache disabled');
  }
}

// Export singleton instance
module.exports = new CacheService();
