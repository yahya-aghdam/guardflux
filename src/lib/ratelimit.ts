import { EntityManager } from '@mikro-orm/core';
import { RateLimit } from '../ORM/entities';
import { RateLimitOptions } from '../ORM/types';



export default async function rateLimit(
    em: EntityManager,
    userId: string,
    options: RateLimitOptions
): Promise<boolean> {
    const { windowSize, maxRequests } = options;


    const currentTime = new Date();
    const windowStart = new Date(currentTime.getTime() - windowSize * 1000);


    let rateLimit = await em.findOne(RateLimit, { userId });
    if (!rateLimit) {
        rateLimit = new RateLimit();
        rateLimit.userId = userId;
        rateLimit.requestCount = 0;
        rateLimit.lastRequest = currentTime;
        em.persist(rateLimit);
    }

    if (rateLimit.lastRequest < windowStart) {
        rateLimit.requestCount = 1; 
        rateLimit.lastRequest = currentTime;
        await em.flush();
        return true; 
    }

    if (rateLimit.requestCount < maxRequests) {
        rateLimit.requestCount++;
        rateLimit.lastRequest = currentTime;
        await em.flush();
        return true;
    }

    return false;
}
