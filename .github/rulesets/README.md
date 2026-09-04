# Branch rulesets

`main.json` and `development.json` are the exact payloads of the two
repository rulesets that protect the release and integration branches. They
are committed so the configuration can be reviewed in a pull request and
restored if it is ever changed by hand in the GitHub UI.

The rules themselves are explained for contributors in
[`docs/git-guidelines.md`](../../docs/git-guidelines.md). This file is the
operator's copy: how to apply them and how to get out of trouble.

## What they enforce

Both branches: no direct pushes, no force pushes, no deletion, squash-merge
only, and a pull request with approvals, resolved conversations and a green
pipeline. `bypass_actors` is empty in both, so the rules bind repository
administrators and organisation owners too.

|                                   | `development` | `main` |
| --------------------------------- | ------------- | ------ |
| Approvals required                | 1             | 3      |
| Stale approvals dismissed on push | yes           | yes    |
| Approval required after last push | yes           | yes    |
| Review conversations resolved     | yes           | yes    |
| Code owner review                 | yes           | yes    |
| Branch must be up to date         | **yes**       | **no** |
| Required status checks            | 8             | 8      |

### Why `main` does not require an up-to-date branch

A release is a squash merge of `development` into `main`, which creates a
commit on `main` that is not an ancestor of `development`. `development` is
then permanently "behind" `main`, and neither escape works: GitHub disables
the **Update branch** button when the head branch of a pull request is
protected, and a squashed back-merge creates a new commit rather than
establishing ancestry. With `strict_required_status_checks_policy: true` on
`main`, no release could ever merge.

This is safe to relax because CI runs on the `pull_request` merge ref — head
already merged into base — so the tree that gets tested is the merge result,
not the head branch in isolation. `development` keeps the strict policy,
where head branches are ordinary unprotected feature branches.

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

A required check that never reports does not fail — it sits at
_"Expected — waiting for status to be reported"_ and blocks the pull request
indefinitely. Renaming a CI job therefore requires updating these files and
re-applying, in the same change.

## Applying

Requires repository admin. Create `development`, update `main` in place —
ruleset `21126704` already exists, and reusing the id preserves its history.

```bash
# First time: create, then read back and confirm nothing was dropped.
gh api -X POST repos/LasceUCR/lasce/rulesets \
  --input .github/rulesets/development.json

# Update an existing ruleset.
gh api -X PUT repos/LasceUCR/lasce/rulesets/21126704 \
  --input .github/rulesets/main.json
```

Verify the effective rules on a branch, which is the assertion that matters:

```bash
gh api repos/LasceUCR/lasce/rules/branches/development
gh api repos/LasceUCR/lasce/rulesets --jq '.[] | {id, name, enforcement}'
```

Check that CODEOWNERS still parses — an invalid file makes the code-owner
requirement impossible to satisfy on both branches at once:

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
admin cannot disable. None applies today — `gh api
repos/LasceUCR/lasce/rules/branches/main` returns the effective rules,
inherited ones included, and it listed none before these were applied.

## Known limitation

These files are not automatically reconciled with GitHub. If someone edits a
ruleset in the UI, the JSON here goes stale. Re-applying the file is what
makes them agree again. Do not automate the apply from a workflow: it would
need an admin token in CI, which is a larger risk than the drift.
