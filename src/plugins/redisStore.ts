import fp from 'fastify-plugin';

type LoginAttemptState = { attempts: number; lockedUntil: number | null };

class InMemoryRedisLike {
  private store = new Map<string, { value: string; expiresAt: number | null }>();

  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }
}

class RedisSessionState {
  private readonly loginPrefix = 'auth:login:';
  constructor(private readonly client: InMemoryRedisLike) {}

  private key(email: string) {
    return `${this.loginPrefix}${email.toLowerCase()}`;
  }

  async getLoginAttempt(email: string): Promise<LoginAttemptState> {
    const raw = await this.client.get(this.key(email));
    if (!raw) return { attempts: 0, lockedUntil: null };
    return JSON.parse(raw) as LoginAttemptState;
  }

  async setLoginAttempt(email: string, state: LoginAttemptState, ttlSeconds: number) {
    await this.client.set(this.key(email), JSON.stringify(state), ttlSeconds);
  }

  async clearLoginAttempt(email: string) {
    await this.client.set(this.key(email), JSON.stringify({ attempts: 0, lockedUntil: null }), 1);
  }
}

export default fp(async (fastify) => {
  const client = new InMemoryRedisLike();
  fastify.decorate('redisSessionState', new RedisSessionState(client));
});
