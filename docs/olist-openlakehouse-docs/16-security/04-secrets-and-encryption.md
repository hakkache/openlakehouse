# 04 — Secrets and Encryption

**Content type: CURRENT PLATFORM CAPABILITY (verified from
`backend/app/core/crypto.py`).**

## Hands-On Walkthrough — prove secrets are genuinely encrypted at rest

1. Create a real Connection (module 18) with a fake but non-trivial
   password, e.g. a Postgres connection with `password =
   "SuperSecret123!"`.
2. Query the raw database table directly (bypassing the API entirely):
   ```powershell
   docker exec -it openlakehouse-postgres psql -U openlakehouse -d openlakehouse -c "SELECT password_encrypted FROM connections LIMIT 1;"
   ```
   (adjust the real column/table name to match your actual `Connection`
   model in `backend/app/models/`).
3. **Expected result**: a real Fernet-encrypted token (base64, starts
   with `gAAAAA...`), **not** the plaintext `SuperSecret123!` — direct
   proof encryption is genuinely applied before the value ever reaches
   the database, not just masked in API responses.
4. Confirm the API never leaks it either: `GET` the same connection via
   the app's API. **Expected result**: the password field is omitted or
   masked entirely in the JSON response (per `crypto.py`'s own docstring
   guarantee: "Encrypted values are never returned by any API response").
5. Confirm decryption still works functionally: use the **Test
   Connection** feature (module 18) — it should succeed, proving the
   backend can decrypt and use the real password internally even though
   it's never exposed externally.

## Why the key derivation matters (a real, honest limitation to note)

`crypto.py` derives its Fernet key from `backend_secret_key` via SHA-256
— meaning if `backend_secret_key` is ever rotated, all previously
encrypted values become undecryptable (a real, documented operational
constraint) unless a re-encryption migration is run first. This is worth
noting as a genuine operational hazard, not a hypothetical one.

> 🧪 **Checkpoint**: you directly queried the raw database and confirmed
> a stored password is genuinely encrypted (not plaintext), while the
> API and functional connection test both still work correctly.

## Next document

[`05-security-scenarios.md`](05-security-scenarios.md).
