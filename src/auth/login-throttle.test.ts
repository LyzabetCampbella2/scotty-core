import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLoginThrottle } from './login-throttle.ts';

test('first five incorrect logins are not blocked; sixth triggers 30-second cooldown', () => {
 let now = 1_000;
 const limiter = createLoginThrottle(() => now);
 for (let i = 0; i < 5; i++) {
  assert.equal(limiter.retryAfterSeconds('owner-ip'), 0);
  assert.equal(limiter.failed('owner-ip'), 0);
 }
 assert.equal(limiter.failed('owner-ip'), 30);
 assert.equal(limiter.retryAfterSeconds('owner-ip'), 30);
 now += 29_000;
 assert.equal(limiter.retryAfterSeconds('owner-ip'), 1);
 now += 1_000;
 assert.equal(limiter.retryAfterSeconds('owner-ip'), 0);
});

test('success clears failures immediately and different clients remain independent', () => {
 let now = 200;
 const limiter = createLoginThrottle(() => now);
 for (let i = 0; i < 6; i++) limiter.failed('A');
 assert.equal(limiter.retryAfterSeconds('A'), 30);
 assert.equal(limiter.retryAfterSeconds('B'), 0);
 limiter.cleared('A');
 assert.equal(limiter.retryAfterSeconds('A'), 0);
 assert.equal(limiter.failed('A'), 0);
});

test('old failures expire in 60 seconds rather than carrying over a 15-minute lockout', () => {
 let now = 0;
 const limiter = createLoginThrottle(() => now);
 for (let i = 0; i < 6; i++) limiter.failed('A');
 now += 60_001;
 assert.equal(limiter.retryAfterSeconds('A'), 0);
 assert.equal(limiter.failed('A'), 0);
});

test('blocked requests do not extend cooldown', () => {
 let now = 0;
 const limiter = createLoginThrottle(() => now);
 for (let i = 0; i < 6; i++) limiter.failed('A');
 now = 20_000;
 assert.equal(limiter.retryAfterSeconds('A'), 10);
 now = 30_000;
 assert.equal(limiter.retryAfterSeconds('A'), 0);
});
