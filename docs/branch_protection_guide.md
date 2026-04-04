# GitHub Branch Protection Guide

Branch protection rules are essential for maintaining code quality and security in a production-ready repository. Since these cannot be configured via code, this guide provides the necessary steps to set them up in the GitHub UI.

## Why Enable Branch Protection?
- **Prevent Direct Pushes**: Ensure all code changes are reviewed via Pull Requests (PRs).
- **Enforce Code Quality**: Require tests and linting to pass before merging.
- **Maintain History**: Enforce linear history and prevent accidental force-pushes.

---

## Configuration Steps

### 1. Access Settings
Navigate to your repository on GitHub and click on the **Settings** tab.

### 2. Configure Branches
From the left sidebar, click on **Branches**. Under the **Branch protection rules** section, click **Add rule**.

### 3. Add Rule for `main`
- **Branch name pattern**: `main`

### 4. Required Protections (Recommended)

#### [X] Require a pull request before merging
This prevents anyone from pushing directly to the `main` branch.
- **Required approvals**: `1`
- **Dismiss stale pull request approvals when new commits are pushed**: `Checked` (Ensures re-review on changes).
- **Require review from Code Owners**: `Checked` (If using a `CODEOWNERS` file).

#### [X] Require status checks to pass before merging
This ensures CI workflows (linting, building, testing) pass before code is merged.
- **Require branches to be up to date before merging**: `Checked` (Prevents merge conflicts).
- **Status checks to search for**:
  - `Lint and Build (Frontend)`
  - `Lint and Build (Backend)`
  - `Security Scan`

#### [X] Require signed commits
Ensures that all commits are signed with a verified GPG or SSH key, preventing spoofing.

#### [X] Require linear history
Prevents merge commits and ensures a clean, easy-to-read git history.

#### [X] Include administrators
Enforces these rules even for repository owners/admins.

---

## Summary Checklist for Production Repositories

| Rule | Status |
| :--- | :---: |
| Require Pull Request | ✅ |
| Required Approvals (1+) | ✅ |
| Dismiss Stale Reviews | ✅ |
| Require Status Checks | ✅ |
| Require Linear History | ✅ |
| Block Force Pushes | ✅ |
| Lock Branch (Read-Only) | ❌ (Keep it active) |

> [!TIP]
> After setting these rules, try pushing directly to `main` to verify the protection is working as expected. You should see an error message from GitHub.
