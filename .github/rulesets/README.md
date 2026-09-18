# Branch rulesets

`main.json` and `development.json` are the exact payloads of the two
repository rulesets that protect the release and integration branches. They
are committed so the configuration can be reviewed in a pull request and
restored if it is ever changed by hand in the GitHub UI.

The rules themselves are explained for contributors in
[`docs/git-guidelines.md`](../../docs/git-guidelines.md). This file is the
operator's copy: how to apply them and how to get out of trouble.

## What they enforce

Both branches: no direct pushes, no force pushes, no deletion, a single
allowed merge method, and a pull request with approvals, resolved
conversations and a green pipeline. `bypass_actors` is empty in both, so
the rules bind repository administrators and organisation owners too.

|                                   | `development` | `main`           |
| --------------------------------- | ------------- | ---------------- |
| Approvals required                | 2             | 3                |
| Stale approvals dismissed on push | yes           | yes              |
| Approval required after last push | yes           | yes              |
| Review conversations resolved     | yes           | yes              |
| Code owner review                 | yes           | yes              |
| Branch must be up to date         | **yes**       | **no**           |
| Merge method                      | squash        | **merge commit** |
| Required status checks            | 8             | 8                |

### Why `main` takes a merge commit and does not require an up-to-date branch

Both settings exist because a release is `development` merged into `main`,
and `development` is itself protected.

The sprint 1 release (#68) was squash-merged. That wrote `c79f23f` on `main`,
a commit that is not an ancestor of `development`, and nothing can make it
one afterwards: GitHub disables the **Update branch** button when the head
branch of a pull request is protected, and a squashed back-merge creates yet
another new commit rather than establishing ancestry. This is why
`strict_required_status_checks_policy` is `false` on `main`. It is safe to
relax because CI runs on the `pull_request` merge ref (head already merged
into base), so the tree that gets tested is the merge result, not the head
branch in isolation. `development` keeps the strict policy, where head
branches are ordinary unprotected feature branches.

The second consequence surfaced at the sprint 2 release (#129). The merge
base of the two branches stays at the last commit they genuinely share, so
every file that sprint 1 changed and sprint 2 changed again is reported as a
conflict: 271 files, none of them real, since `main` contained nothing that
`development` lacked. The conflicts cannot be resolved on the head branch,
because the head branch is `development`.

A merge commit avoids both problems. Its second parent is the tip of
`development`, so the next release compares against that tip, `main` has no
diff of its own, and the merge applies cleanly. `main` therefore allows
**only** `merge`, and `development` allows only `squash`. The
contributor-facing procedure is section 10 of
[`docs/git-guidelines.md`](../../docs/git-guidelines.md).

The one-time repair for sprint 2 was a release branch,
`release-g01-sprint-02`, cut from `development` with
`git merge -s ours origin/main`. That keeps the tree of `development` byte
for byte and records `c79f23f` as an ancestor. It was safe because
`git diff d3c53d4 origin/main` was empty and `d3c53d4` is on `development`:
`main` had no content of its own to lose.

A ruleset can only choose among the merge methods the repository has
enabled, so `allow_merge_commit` must be on at the repository level as well.
See [Applying](#applying).

## Required status check names

The eight contexts must match the **display names** that `ci.yml` produces on
a `pull_request` event, exactly:

```
lint  typecheck  test  build  worker  e2e  docker (web)  docker (worker)
```

Three ways to get this wrong:

- **Do not use the `ci / ...` names.** `cd.yml` calls `ci.yml` as a reusable
  workflow, so pushes produce `ci / lint`, `ci / build` and so on. Those
  never appear on a pull request. The ruleset UI's autocomplete offers both
  forms.
- **Use the job's `name:`, not its key.** `cd.yml` has `images` → `image` and
  `context` → `resolve target`.
- **Keep the `docker` job's `name:` pinned** to `docker (${{ matrix.name }})`.
  Without it GitHub joins every matrix value into the check name, which would
  embed the Dockerfile path and break the moment a Dockerfile moves.

`integration_id: 15368` is the `github-actions` app, which stops a
same-named check from another app satisfying the requirement.

A required check that never reports does not fail. It sits at _"Expected"_,
waiting for a status that never arrives, and blocks the pull request
indefinitely. Renaming a CI job therefore requires updating these files and
re-applying, in the same change.

## Applying

Requires repository admin.

The `main` ruleset allows only merge commits, which the repository must have
enabled or the ruleset offers nothing. Squash stays on for `development`;
rebase stays off everywhere:

```bash
gh api -X PATCH repos/LasceUCR/lasce \
  -F allow_merge_commit=true -F allow_squash_merge=true -F allow_rebase_merge=false
```

Both rulesets exist, so update them in place: `development` is ruleset
`22265030` and `main` is `21126704`. Reusing the id preserves a ruleset's
history; a `POST` would create a duplicate instead.

```bash
gh api -X PUT repos/LasceUCR/lasce/rulesets/22265030 \
  --input .github/rulesets/development.json

gh api -X PUT repos/LasceUCR/lasce/rulesets/21126704 \
  --input .github/rulesets/main.json
```

Verify the effective rules on a branch, which is the assertion that matters:

```bash
gh api repos/LasceUCR/lasce/rules/branches/development
gh api repos/LasceUCR/lasce/rulesets --jq '.[] | {id, name, enforcement}'
gh api repos/LasceUCR/lasce/rules/branches/main \
  --jq '.[] | select(.type == "pull_request") | .parameters.allowed_merge_methods'
```

Check that CODEOWNERS still parses, because an invalid file makes the
code-owner requirement impossible to satisfy on both branches at once:

```bash
gh api repos/LasceUCR/lasce/codeowners/errors
```

## If a ruleset blocks everything

Administering a ruleset is a repository-settings permission and is
independent of `bypass_actors`, so an admin can always disable one even when
`current_user_can_bypass` is `never`:

```bash
gh api -X PUT repos/LasceUCR/lasce/rulesets/<id> -f enforcement=disabled
```

or Settings → Rules → Rulesets → set to _Disabled_. Re-apply the JSON once
the cause is fixed. The repository cannot be permanently locked by anything
in this directory.

The one exception is an **organisation-level** ruleset, which a repository
admin cannot disable. None applies today: `gh api
repos/LasceUCR/lasce/rules/branches/main` returns the effective rules,
inherited ones included, and it listed none before these were applied.

## Known limitation

These files are not automatically reconciled with GitHub. If someone edits a
ruleset in the UI, the JSON here goes stale. Re-applying the file is what
makes them agree again. To check for drift, compare the live payload with the
file. GitHub adds `dismissal_restriction` and `required_reviewers` with their
defaults to what it returns, so those two are the only expected difference:

```bash
diff <(jq -S '{rules}' .github/rulesets/main.json) \
     <(gh api repos/LasceUCR/lasce/rulesets/21126704 --jq '{rules}' | jq -S .)
```

Do not automate the apply from a workflow: it would need an admin token in
CI, which is a larger risk than the drift.
