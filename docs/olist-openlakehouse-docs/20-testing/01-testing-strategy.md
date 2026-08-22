# 01 — Testing Strategy

**Content type: CURRENT PLATFORM CAPABILITY (verified from
`backend/tests/test_health.py`, `backend/pytest.ini`) + PROJECT
IMPLEMENTATION.**

## The real test layers already present, plus what this module adds

**Verified**: `backend/tests/` has real `pytest` + FastAPI `TestClient`
tests today (`test_health.py`), configured via `backend/pytest.ini`.
This module builds a fuller strategy on top: unit tests (backend logic),
integration tests (real Trino/Iceberg round-trips), dbt/quality tests
(already built in modules 06/10), and negative tests (deliberately broken
scenarios reproduced throughout this documentation set).

## Hands-On Walkthrough — run the real existing test suite first

1. ```powershell
   docker compose exec backend pytest -v
   ```
2. **Expected result**: `test_root` and `test_ready` both pass — a real,
   fast smoke test confirming the FastAPI app boots and the `/ready`
   endpoint responds correctly.
3. Add your own first real test, `backend/tests/test_lineage.py`:
   ```python
   from fastapi.testclient import TestClient
   from app.main import app

   client = TestClient(app)

   def test_lineage_requires_auth() -> None:
       response = client.get("/api/v1/lineage")
       assert response.status_code == 401
   ```
4. Run it: `docker compose exec backend pytest tests/test_lineage.py -v`.
   **Expected result**: passes — confirms the real authentication
   dependency genuinely rejects unauthenticated requests (cross-
   references
   [`16-security/03-authorization-and-rbac.md`](../16-security/03-authorization-and-rbac.md)'s
   API-level enforcement).

> 🧪 **Checkpoint**: you ran the real existing test suite, and added and
> passed one new real test of your own against a live FastAPI app
> instance.

## Next document

[`02-dbt-and-quality-tests.md`](02-dbt-and-quality-tests.md).
