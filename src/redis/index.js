const redis = require('redis');
const { RedisConfig } = require('../config');

class RedisClient {
  constructor() {
    this.client = redis.createClient({
      host: RedisConfig.host,
      port: RedisConfig.port,
      password: RedisConfig.password,
    });

    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
    });
  }

  async get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, value) => {
        if (err) {
          reject(err);
        } else {
          resolve(value);
        }
      });
    });
  }

  async set(key, value) {
    return new Promise((resolve, reject) => {
      this.client.set(key, value, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async expire(key, seconds) {
    return new Promise((resolve, reject) => {
      this.client.expire(key, seconds, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async del(key) {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async sadd(key, value) {
    return new Promise((resolve, reject) => {
      this.client.sadd(key, value, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async smembers(key) {
    return new Promise((resolve, reject) => {
      this.client.smembers(key, (err, values) => {
        if (err) {
          reject(err);
        } else {
          resolve(values);
        }
      });
    });
  }

  async srem(key, value) {
    return new Promise((resolve, reject) => {
      this.client.srem(key, value, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async publish(channel, message) {
    return new Promise((resolve, reject) => {
      this.client.publish(channel, message, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async subscribe(channel) {
    return new Promise((resolve, reject) => {
      this.client.subscribe(channel, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async unsubscribe(channel) {
    return new Promise((resolve, reject) => {
      this.client.unsubscribe(channel, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;