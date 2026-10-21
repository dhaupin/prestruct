# horcrux/

The snapshot locker between **prestruct** and **vant**.

Agents working on this repo keep long-lived memory (identity, goals,
progress, lessons) as brain content inside a
[vant](https://github.com/dhaupin/vant) install. `horcrux/` is where that
memory lands in the repo: **stones** - brain snapshots encoded as small SVG
images - plus temporary handoff documents passing between projects.

## Stones

A stone is a password-encrypted, self-contained memory snapshot:

- The dotfield SVG is the payload carrier: the encrypted brain content is
  embedded inside the image, so the file stays one portable asset.
- The filename records the stone id and **the password itself**
  (`<name>-p_<password><year>.svg`). That is deliberate: the prestruct stone
  is public, and contributors/agents must be able to boot it without a
  side channel.
- The prestruct stone lives at
  [`prestruct-p_st0neph0enix2026.svg`](prestruct-p_st0neph0enix2026.svg),
  with a `.sha256` integrity sidecar beside it, so any copy can be
  tamper-checked with `sha256sum` against the sidecar without decrypting.
  Handoff documents (PRDs, decision records between repos) also move
  through this directory temporarily; they are workspace mailboxes, not
  part of the shipped package.

## Booting a stone

Restore happens on the vant side:

- `VANT_ALLOW_FILENAME_PW=true` - allow the legacy filename-password lookup,
  or
- an explicit password via `VANT_BRAIN_PASSWORD`

## Rules baked into the format

- **Passwords never contain separators.** The locator splits on `-` and `_`
  and takes the first segment after `p_`; a separator inside the password
  makes the stone unreachable through the filename convention.
- **Everything in the install ships inside the stone.** Because the password
  is transparent, brain content must be OSS-safe end to end; anything
  personal or private belongs in a separate vant install's brain instead.
- Canonical brain content lives in vant under `models/private/prestruct/`;
  `models/public/prestruct/` is a curated pointer-only mirror that feeds the
  stone here.

## Read next

- [vant](https://github.com/dhaupin/vant) docs - the locator, boot flow, and
  brain templates
- [`AGENTS.md`](../AGENTS.md) - the engineering history this stone snapshots
- [`labs/prd-prestruct.md`](../labs/prd-prestruct.md) - the roadmap board
  (prd-[project].md standard)
- [`labs/TASKS.md`](../labs/TASKS.md) - the pass ledger the recon draws from
