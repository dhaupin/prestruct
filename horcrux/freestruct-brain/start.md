# start.md

Canonical working scope for the freestruct brain (once moved to
models/private/freestruct/ in the vant install). The vant install's layout
contract is dual-mode: private scope is canonical, a public scope carries the
curated mirror + pointer (see models/public/prestruct/ for the working
example of the pointer.md convention).

IMPORTANT (same rule as the prestruct brain): once a public stone exists, the
public scope rides inside the OSS repo's public face. Never write credentials,
personal data, or anything not safe for github.com/dhaupin/freestruct.

Wake order:
1. Read this directory: identity.md, goals.md, progress.md, lessons.md.
2. Repo records are the detailed source: README.md, CHANGELOG.md, and the
   issue tracker (defect ledger #2-#8 as of 2026-10-20). Once the rehaul
   starts, horcrux/prd-freestruct.md moves into the repo as its prd.md.
3. Pass end (write-what-you-learned): update progress.md + lessons.md here,
   then refresh the repo stone:
     cd <vant-install> && node bin/vant.js snapshot --brain freestruct \
       --output models/public/freestruct/boot/freestruct-p_<password>.svg \
       --password <password>
   then copy that file to <freestruct-repo>/horcrux/ (same name).
4. Stone password: OWNER PICKS IT (prestruct convention: separator-free, embedded
   in the filename so contributors can restore). Locator schema splits on '-' and
   '_' and reads the first segment after p_ - separator-free passwords only.
   Restores also accept the explicit password or VANT_BRAIN_PASSWORD=z; filename
   lookup additionally needs VANT_ALLOW_FILENAME_PW=true.

Layout contract (dual mode: private overrides public on wake):
- models/private/freestruct/  - canonical brain. Everything written here first.
- models/public/freestruct/   - curated mirror for the stone (pointer.md only).
