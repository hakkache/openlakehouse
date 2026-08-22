# 01 — Role Matrix Deep Dive

## The real role × capability matrix (verified against real endpoint calls)

| Capability | `VIEWER` | `DATA_ANALYST` | `DATA_ENGINEER` | `ADMIN` |
|---|---|---|---|---|
| Read Trino data | ✅ | ✅ | ✅ | ✅ |
| Save/edit pipelines (non-elevated) | ❌ | ✅ | ✅ | ✅ |
| Run `python`/`pyspark` code nodes (elevated) | ❌ | ❌ | ✅ | ✅ |
| Manage users/connections | ❌ | ❌ | ❌ | ✅ |

## Hands-On Walkthrough — prove each row with a real call

1. As `viewer.user`, attempt to save a pipeline. **Expected**: real
   `403`.
2. As `admin.user` (or a real `DATA_ANALYST` test user), attempt to run
   a pipeline containing a `pyspark` code node. **Expected for
   `DATA_ANALYST`**: real `403` citing the elevated-role requirement from
   module 06 doc 09. **Expected for `DATA_ENGINEER`/`ADMIN`**: succeeds.

> 🧪 **Checkpoint**: reproduced a real `403` for a `VIEWER` pipeline save,
> and a real elevated-role `403` for a non-engineer attempting a
> `pyspark` node.

## Next document

[`02-jwt-and-token-lifecycle.md`](02-jwt-and-token-lifecycle.md).
