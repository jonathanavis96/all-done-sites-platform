# Secrets Management Patterns

## Overview

Strategies for managing secrets (API keys, webhooks, tokens) securely without exposing them in version control.

**Golden Rule:** Secrets should NEVER be committed to git.

---

## Pattern: .env File for Local Development

**Use case:** Local development, single-machine deployments, personal projects

### Implementation

**1. Create .env file (gitignored):**

```bash
# .env
API_KEY="your-secret-key-here"
WEBHOOK_URL="https://api.example.com/webhook/abc123"
DATABASE_PASSWORD="secure-password"
```

**2. Add .env to .gitignore:**

```bash
# .gitignore
.env
*.env
!.env.example
```

**3. Create .env.example template:**

```bash
# .env.example
API_KEY="your-api-key-here"
WEBHOOK_URL="https://api.example.com/webhook/YOUR_ID"
DATABASE_PASSWORD="your-password-here"
```

**4. Load in shell (bash/zsh):**

```bash
# In ~/.bashrc or ~/.zshrc
if [ -f ~/path/to/project/.env ]; then
  export $(grep -v '^#' ~/path/to/project/.env | xargs)
fi
```

**5. Load in Python:**

```python
from dotenv import load_dotenv
import os

load_dotenv()
api_key = os.getenv("API_KEY")
```

**6. Load in Node.js:**

```javascript
require('dotenv').config();
const apiKey = process.env.API_KEY;
```

### Pros and Cons

✅ **Pros:**

- Simple to implement
- Works for local development
- Easy to share template (.env.example)
- No external dependencies (shell scripts)

❌ **Cons:**

- File-based (can be accidentally committed)
- No rotation/expiry management
- Not suitable for production deployments
- Secrets stored in plaintext on disk

---

## Pattern: Environment Variables (Cloud/CI)

**Use case:** Cloud deployments, CI/CD pipelines, containerized applications

### Implementation

**1. Set via cloud provider:**

```bash
# AWS Lambda
aws lambda update-function-configuration \
  --function-name my-function \
  --environment Variables={API_KEY=secret123}

# Heroku
heroku config:set API_KEY=secret123

# GitHub Actions
# Settings → Secrets → New repository secret
```

**2. Access in application:**

```python
import os
api_key = os.environ.get("API_KEY")
if not api_key:
    raise ValueError("API_KEY not set")
```

### Pros and Cons

✅ **Pros:**

- Native cloud provider encryption
- No files to manage
- Works across environments
- Easy rotation via cloud console

❌ **Cons:**

- Different syntax per provider
- Harder to debug locally
- May require cloud provider access

---

## Pattern: Secret Management Services

**Use case:** Production systems, multi-user teams, compliance requirements

### Options

| Service | Use Case | Complexity |
|---------|----------|------------|
| AWS Secrets Manager | AWS-native apps | Medium |
| HashiCorp Vault | Multi-cloud, enterprise | High |
| 1Password CLI | Developer workflows | Low |
| Azure Key Vault | Azure-native apps | Medium |
| Google Secret Manager | GCP-native apps | Medium |

### Example: AWS Secrets Manager

```python
import boto3
import json

def get_secret(secret_name):
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

secrets = get_secret('prod/api/credentials')
api_key = secrets['api_key']
```

### Pros and Cons

✅ **Pros:**

- Centralized secret management
- Audit logs and versioning
- Automatic rotation support
- Access control (IAM/RBAC)

❌ **Cons:**

- Additional infrastructure
- Cost (most charge per secret)
- Learning curve
- Network dependency

---

## Anti-Patterns (Never Do This)

### ❌ Hardcoding Secrets in Source Code

```python
# BAD - secret in code
API_KEY = "sk-1234567890abcdef"
```

**Why:** Secrets become part of git history forever, even if "deleted" later.

### ❌ Committing .env Files

```bash
# BAD - .env tracked in git
git add .env
git commit -m "Add environment config"
```

**Why:** Secrets exposed on GitHub, GitLab, etc. Anyone with repo access sees them.

### ❌ Secrets in Config Files (YAML/JSON)

```yaml
# BAD - config.yaml
database:
  password: "super-secret-password"
```

**Why:** Config files are typically committed. Use environment variable placeholders instead.

### ❌ Logging Secrets

```python
# BAD - secret in logs
logging.info(f"Using API key: {api_key}")
```

**Why:** Logs are often less secure than application code, may be shipped to external services.

### ❌ Putting Secrets in Documentation

```markdown
# BAD - README.md
To set up, use webhook: https://discord.com/api/webhooks/123456/secret-token
```

**Why:** Documentation is committed to git, often public. Use placeholders like `YOUR_WEBHOOK_URL`.

---

## Recovery: Secret Exposed in Git History

If a secret is accidentally committed, **assume it's compromised forever** (even if deleted in later commits).

### Steps to Recover

1. **Revoke the secret immediately** (rotate API key, delete webhook, change password)
2. **Generate new secret** from the provider
3. **Update application** to use new secret (via .env or cloud config)
4. **Optional:** Rewrite git history (complex, not recommended for shared repos)

```bash
# Remove file from git history (last resort)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/secret-file" \
  --prune-empty --tag-name-filter cat -- --all
```

**Better approach:** Don't rewrite history. Just revoke the old secret and move forward with the new one.

---

## Brain Repository Example

**What happened:** Discord webhook URL was accidentally committed in task documentation (commit `4dc2c21`).

**Resolution:**

1. ✅ Deleted old webhook from Discord (revoked)
2. ✅ Created new webhook
3. ✅ Added `.env` file (gitignored) with new webhook
4. ✅ Updated task documentation to use `.env` pattern
5. ✅ Committed fix to remove exposed secret from future commits

**Files:**

- `.env` - Contains actual webhook (gitignored)
- `.env.example` - Template for setup (committed)
- `.gitignore` - Includes `.env` entry

**Result:** New webhook secure, old webhook revoked, pattern documented for future use.

---

## Decision Tree: Which Pattern to Use?

```text
Is this a personal/local project?
├─ Yes → Use .env file pattern
└─ No → Is this production?
    ├─ Yes → Use secret management service (AWS/Vault)
    └─ No → Is this CI/CD?
        ├─ Yes → Use environment variables (GitHub Secrets, etc.)
        └─ No → Use .env file pattern
```

---

## Checklist: Before Committing Code

- [ ] Run `git diff --staged` and check for secrets
- [ ] Verify `.env` is in `.gitignore`
- [ ] Check `.env.example` has placeholders (not real secrets)
- [ ] Search codebase: `git grep -i "password\|api.key\|secret\|token"` (check each match)
- [ ] Ensure secrets load from environment, not hardcoded

---

## See Also

- [12-Factor App: Config](https://12factor.net/config) - Store config in environment
- [OWASP: Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- Brain example: `.env.example`, task 34.1.1 in `workers/workers/IMPLEMENTATION_PLAN.md`
