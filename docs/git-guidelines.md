# Git Workflow Standards

This guide defines the minimum conventions required to keep the team's work organized and easy to review.

## 1. General Rules

- Every change must be linked to a task or issue.
- Direct changes to `main` or `develop` are not allowed.
- Each branch must address a single objective.
- Every change must be submitted through a Pull Request.
- Credentials, `.env` files, and sensitive information must not be committed.
- The code must compile and pass all tests before being merged.

## 2. Main Branches

| Branch    | Purpose                           |
| --------- | --------------------------------- |
| `main`    | Stable and release-ready version  |
| `develop` | Integration of the team's changes |

Working branches are created from `develop` and merged back into `develop` through a Pull Request. `hotfix` branches are created from `main`.

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

This content can be copied into `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Description

Briefly describe the purpose of the Pull Request.

## Related Issue

- Issue ID:
- Group ID:

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactor
- [ ] Tests
- [ ] Configuration

## What Was Done?

-
-

## Testing

Briefly explain how the changes were verified.

## Additional Notes

List any risks, limitations, or pending work. Write `None` if not applicable.

## Checklist

- [ ] The change meets the acceptance criteria.
- [ ] The project builds and all tests pass.
- [ ] I reviewed my own changes.
- [ ] I did not include credentials or sensitive information.
```

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
2. Create a branch from `develop`.
3. Implement the change and create clear commits.
4. Run the tests.
5. Open a Pull Request into `develop`.
6. Address the review and obtain at least one approval.
7. Merge using **Squash and merge** and delete the branch.

## 8. Merge Requirements

- The Pull Request is complete.
- The acceptance criteria are met.
- The project builds and all tests pass.
- There are no unresolved review conversations.
- At least three approvals have been received (at least one from each group).
- The branch is up to date with the target branch.

### Complete Example

```text
Branch: feature-g01-user-login
Commit: feat(auth): add user login
PR:     feat(auth): implement user login [g01]
Target: develop
```
