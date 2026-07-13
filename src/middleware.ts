/**
 * Edge-compatible route protection for Next.js.
 *
 * This project uses Next.js 16 `proxy.ts` as the primary request interceptor.
 * This file re-exports the same Edge-safe logic (jose JWT only — no Node `fs`,
 * no Mongoose) so deployments expecting `middleware` still work.
 */
export { proxy as middleware, config } from './proxy'
