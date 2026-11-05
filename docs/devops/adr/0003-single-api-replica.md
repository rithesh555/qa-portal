# ADR 0003: The API runs as one replica

- **Status:** accepted
- **Date:** 2026-11-05
- **Deciders:** maintainer

## Context

The usual Kubernetes answer to "keep it up" is several replicas behind a Service, plus a HorizontalPodAutoscaler. The QA Portal API keeps some state in process memory:

- The global rate limit (`@fastify/rate-limit`, 1000 requests per minute per IP, `apps/api/src/app.ts`) uses its in-memory store.
- The per-user limits on expensive routes (reports, exports, imports) are a `Map` in `apps/api/src/lib/rate-limits.ts`.
- The per-username sign-in throttle (10 failures in 15 minutes, from any IP) is a `Map` in `apps/api/src/plugins/auth.ts`.

With two replicas, each process counts on its own. A user who gets 10 imports a minute would get 20, and more with each replica. A password guesser would get 10 tries per replica. These limits protect the database and the accounts, so multiplying them silently is a real weakening. Sessions and Better Auth's own per-IP sign-in limit live in Postgres (`storage: "database"`), so they aren't affected.

App behaviour is frozen in Phase 9 (only flagged, approved changes).

## Options considered

1. **One replica.** Pros: limits stay exact; no app change. Cons: a deploy or a crash is a short outage; no horizontal scaling.
2. **Several replicas, accept looser limits.** Pros: no app change, no downtime. Cons: the limits are wrong by a factor nobody sees, and it changes with scaling.
3. **Move the limits to a shared store** (Postgres, or Valkey/Redis). Pros: correct at any replica count; then an HPA is possible. Cons: an app change (flagged exception 3 in the Phase 9 plan), and Valkey would be one more stateful service to run.
4. **Sticky sessions** at the gateway. Pros: no app change. Cons: limits are per user only while the routing holds; uneven load; it fails over badly.

## Decision

We chose **one API replica** for now. The chart (Stage 5) will use `replicas: 1`, `strategy: Recreate` and no HPA. `Recreate` stops the old pod before starting the new one, so two processes never count at once. The web tier (nginx, stateless) runs two replicas.

## Consequences

- A deploy causes a few seconds of 503s from the API. The readiness probe and the graceful SIGTERM shutdown (`apps/api/src/server.ts`) keep it short. Stage 7's SLO budget accounts for it.
- No autoscaling on the API. At an internal tool's load, one Node process is plenty; Stage 8's load test will show the headroom.
- Any change that sets API replicas above 1 must update this ADR first. The devops-reviewer agent flags it.
- Revisit by taking option 3 (limits in Postgres, the store we already run) if the load test or an SLO says one replica isn't enough, or when downtime on deploy stops being acceptable.
