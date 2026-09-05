# Git Workflow Standards

This guide defines the minimum conventions required to keep the team's work organized and easy to review.

## 1. General Rules

- Every change must be linked to a task or issue.
- Direct changes to `main` or `development` are not allowed; both branches reject pushes.
- Each branch must address a single objective.
- Every change must be submitted through a Pull Request.
- Credentials, `.env` files, and sensitive information must not be committed.
- The code must compile and pass all tests before being merged.

## 2. Main Branches

| Branch        | Purpose                           |
| ------------- | --------------------------------- |
| `main`        | Stable and release-ready version  |
| `development` | Integration of the team's changes |

Working branches are created from `development` and merged back into `development` through a Pull Request. `hotfix` branches are created from `main`.

## 3. Branch Names

### Format

```text
<type>-<group>-<description>
```

Examples:

```text
feature-g01-user-login
fix-g02-email-validation
docs-g01-api-guide
```

### Allowed Types

| Type       | Purpose                                          |
| ---------- | ------------------------------------------------ |
| `feature`  | New functionality                                |
| `fix`      | Bug fix or correction                            |
| `hotfix`   | Urgent fix for `main`                            |
| `refactor` | Code restructuring without changing its behavior |
| `docs`     | Documentation                                    |
| `test`     | Tests                                            |
| `chore`    | Configuration or maintenance                     |

### Rules

- Use lowercase letters.
- Separate words with hyphens.
- Do not use spaces, accent marks, or special characters.
- Use the agreed group identifier, such as `g01`.
- Keep the description short and clear.

## 4. Commits

### Format

```text
<type>(<module>): <description>
```

Examples:

```text
feat(auth): add user login
fix(users): prevent duplicate emails
docs(api): update endpoint documentation
test(auth): add login validation tests
```

Main types:

- `feat`: new functionality.
- `fix`: bug fix or correction.
- `docs`: documentation.
- `refactor`: code restructuring.
- `test`: tests.
- `chore`: configuration or maintenance.

The description must begin with a verb, use lowercase letters, and not end with a period. Each commit should represent a logical unit of work.

## 5. Pull Requests

### Title

```text
<type>(<module>): <description> [<group>]
```

Example:

```text
feat(auth): implement user login [g01]
```

### Template

The template lives at [`.github/PULL_REQUEST_TEMPLATE.md`](../.github/PULL_REQUEST_TEMPLATE.md) and GitHub fills it into the description of every new Pull Request automatically. It asks for a description, the related issue and group, the type of change, what was done, how it was tested, and a short checklist.

Fill in every section. Delete nothing: if a section does not apply, write `None`.

## 6. Short Task or Issue Template

```markdown
# Task Title

## Group

g01

## Objective

Describe the expected outcome.

## Acceptance Criteria

- [ ]
- [ ]

## Dependencies

List any dependencies or write `None`.
```

## 7. Workflow

1. Create or assign a task.
2. Create a branch from `development`.
3. Implement the change and create clear commits.
4. Run the tests.
5. Open a Pull Request into `development`.
6. Address the review and obtain the required approvals: one for `development`, three for `main`.
7. Merge using **Squash and merge**. The branch is deleted automatically; `main` and `development` never are.

## 8. Merge Requirements

- The Pull Request is complete and the acceptance criteria are met.
- All eight pipeline checks pass.
- There are no unresolved review conversations.
- The approvals below have been received. An author cannot approve their own Pull Request, so every merge is reviewed by somebody else.

  | Target branch | Approvals |
  | ------------- | --------- |
  | `development` | 1         |
  | `main`        | 3         |

- At least one approval comes from a code owner, listed in [`.github/CODEOWNERS`](../.github/CODEOWNERS).
- For `development`, the branch is up to date with the target branch.
- There are no merge conflicts.

### Complete Example

```text
Branch: feature-g01-user-login
Commit: feat(auth): add user login
PR:     feat(auth): implement user login [g01]
Target: development
```

## 9. Enforced Rules

Sections 1 to 8 used to be conventions that nothing checked. They are now enforced by two repository rulesets, committed as [`.github/rulesets/`](../.github/rulesets/). The rules apply to **everyone, including repository administrators**. Nobody is on the bypass list.

### What is blocked

| Attempt                                     | Result                                                     |
| ------------------------------------------- | ---------------------------------------------------------- |
| `git push` straight to `main`/`development` | Rejected: _"Changes must be made through a pull request."_ |
| `git push --force` to either branch         | Rejected: non-fast-forward pushes are not allowed.         |
| Deleting either branch                      | Rejected.                                                  |
| Merging with a failing or missing check     | Merge button disabled; the check is named on the PR.       |
| Merging without the required approvals      | Merge button disabled.                                     |
| Merging with unresolved conversations       | Merge button disabled until every thread is resolved.      |
| Merging a conflicted Pull Request           | Blocked by GitHub; rebase or merge the target in.          |
| Merge commit or rebase merge                | Not offered. Squash is the only method.                    |

Pushing a new commit **dismisses existing approvals**, so they have to be given again. This is deliberate: an approval applies to the code that was reviewed, not to the branch name.

### The required checks

All eight come from [`ci.yml`](../.github/workflows/ci.yml) and must pass:

```
lint  typecheck  test  build  worker  e2e  docker (web)  docker (worker)
```

If one of these sits at _"Expected"_ and never starts, the check did not run rather than failing. That usually means the pipeline was renamed without updating the ruleset, so raise it rather than waiting.

### Why a push was rejected

The error names the rule. `GH013` with _"Changes must be made through a pull request"_ means exactly that: commit to a branch, push the branch, open a Pull Request.

```
remote: error: GH013: Repository rule violations found for refs/heads/development.
remote: - Changes must be made through a pull request.
```

If you have already committed to `main` or `development` locally:

```bash
git branch feature-g01-my-change      # keep the work
git reset --hard origin/development   # restore the local branch
git checkout feature-g01-my-change
git push -u origin feature-g01-my-change
```

### Changing the rules

The rulesets are configuration under review like anything else. Open a Pull Request against `.github/rulesets/` explaining what should change and why; an administrator applies it once the change is approved. Editing a ruleset directly in the GitHub UI makes the committed files stale and will be reverted the next time they are applied.
