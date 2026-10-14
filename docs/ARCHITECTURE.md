# Architecture

## Overview

Smart Mess Manager is an offline-first React application with Supabase providing authentication, PostgreSQL persistence, Row Level Security, and secured RPC operations.

```text
Browser / PWA
│
├─ React UI
├─ AuthContext
├─ DataContext
├─ Business validation / calculation utilities
├─ IndexedDB local snapshot
├─ Service Worker / app update check
│
└──── authenticated network boundary ────► Supabase
                                          ├─ Auth
                                          ├─ PostgreSQL
                                          ├─ RLS policies
                                          └─ SECURITY DEFINER RPCs
```

## Frontend layers

### Pages and components

`src/pages/` contains workflow-level screens such as Dashboard, Members, Meals, Deposits, Market Costs, Expenses, Reports, Notices, Profile, and Settings.

`src/components/` contains reusable UI and application-shell components.

### Contexts

`AuthContext` manages Supabase/user-session concerns.

`DataContext` coordinates active mess data, local persistence, synchronization, financial mutations, and manager/member application behavior.

The frontend role checks improve UX but are not treated as the final authorization boundary.

### Utilities

`src/utils/` contains calculation, storage, synchronization, warning, notification, transaction, profile, and other domain helpers.

Business validation should remain in reusable utilities where possible so the same rules can be regression-tested outside the UI.

## Persistence model

### Local

IndexedDB stores the local/offline snapshot. It supports temporary loss of connectivity and fast local UI hydration.

### Cloud

Supabase stores authenticated workspace data and membership/profile records. PostgreSQL RLS and secured RPC functions enforce the server/database authorization model.

## Authorization trust boundaries

The browser is untrusted for authorization decisions. Hiding a button does not prevent a direct database/API call.

Database rules therefore enforce the intended model:

```text
Manager of Mess A
  └─ may perform authorized shared mutations for Mess A

Member of Mess A
  ├─ may read authorized Mess A data
  └─ may change only explicitly permitted self-service fields

User of Mess B / outsider
  └─ may not access protected Mess A workspace data
```

Manager-owned writes should use manager-authorized database operations. Self-service member updates should use narrowly scoped RPCs instead of generic workspace replacement.

## Financial model

Monthly settlement derives from persisted records:

```text
meal rate = total market cost / total meals
meal cost = member meals × meal rate
payable = meal cost + shared expense allocation + assigned expense
balance = deposits - payable
```

Important invariants tested by the regression suite include:

- financial amounts are valid positive finite numbers where required;
- referenced members belong to the active mess;
- records from another mess do not enter the current settlement;
- total settlement balances reconcile to deposits and payable totals.

## Warning and meal-off lifecycle

A negative balance starts a due cycle. Warning and meal-off settings use calendar-day thresholds. The warning state is reset after the due clears. Automatic meal suspension should not overwrite an intentional manual suspension.

## Synchronization model

The current application is local-first and synchronizes a workspace snapshot when online.

Key risks to continue testing:

- simultaneous edits from two devices;
- stale offline snapshot overwriting newer cloud data;
- duplicate/retried writes;
- role/manager changes during an offline session;
- conflict resolution after long offline periods.

## Deployment architecture

```text
GitHub
  └─ protected main + required CI
       └─ Vercel production deployment

Vercel frontend
  └─ Supabase Auth/PostgreSQL
```

Production configuration is stored in deployment environment variables, not committed `.env` files.
