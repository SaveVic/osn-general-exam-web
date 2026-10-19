---
description: Antigravity Command Execution Policy defining auto-approved (accept), confirmation-required (ask), and strictly forbidden (deny) terminal commands.
trigger: always_on
---

# Antigravity Command Execution Policy

This policy governs the execution of shell and terminal commands within this workspace (`osn-general-exam-web`).
Operating System: **Windows (PowerShell)**.

The agent must strictly classify every command into one of three tiers: **ACCEPT**, **ASK**, or **DENY**.

---

## 1. ACCEPT (Auto-Approved / Allowed Commands)

Commands in this tier are non-destructive, non-mutating, or routine local quality checks. The agent may execute these autonomously without asking for user confirmation.

### A. Repository & Filesystem Inspection
* `git status`, `git status -s`, `git status --short`
* `git diff`, `git diff --cached`, `git diff HEAD`
* `git log`, `git log -n <N>`, `git show`, `git branch --list`
* `Get-ChildItem`, `dir`, `ls` (within the project workspace)
* `Get-Content`, `cat`, `type` (reading non-secret source files)
* `Select-String`, `grep`, `findstr` (searching codebase patterns)
* `Get-Location`, `pwd`, `where.exe`, `which`
* `Test-Path <file-or-dir>`

### B. Code Quality, Static Analysis & Testing
* `npm run typecheck`, `npx tsc --noEmit`
* `npm run lint`, `npx eslint .`
* `npm test`, `npm run test`
* `npm run build`, `npx next build` (standard production build verification)

### C. Runtime & Environment Checks
* `node -v`, `npm -v`, `git --version`
* `Get-Process`, checking running dev server port status (e.g. `netstat -ano | Select-String ":3000"`)
* Background task status checks via agent management tools

---

## 2. ASK (Requires Explicit User Confirmation)

Commands in this tier cause external side effects, alter package dependencies, perform remote synchronization, or apply irreversible database/code state changes. The agent **MUST** prompt the user and obtain confirmation before executing, unless the user explicitly gave an exact instruction to perform that specific action in their request.

### A. Dependency & Package Management
* `npm install`, `npm i`, `npm add <package>`, `pnpm add`, `yarn add`
* `npm uninstall`, `npm remove`
* `npm update`, `npm audit fix`
* `npx <tool>` when installing or running external uncached binaries

### B. Git Mutations & Remote Operations
* `git commit` (always confirm message and staged files, unless user explicitly issued `commit ...`)
* `git push`, `git push origin <branch>`
* `git pull`, `git fetch`
* `git checkout -b <branch>`, `git switch <branch>`
* `git merge`, `git rebase`, `git cherry-pick`
* `git stash`, `git stash pop`, `git stash drop`
* `git restore <file>`, `git checkout -- <file>` (discarding uncommitted local changes)

### C. Database & Schema Operations
* `npx supabase db push`, `npx supabase db reset`
* `npx supabase migration new <name>`
* `npx prisma migrate dev`, `npx prisma db push`
* Running any direct SQL migration scripts (`.sql`) against remote/local database instances

### D. Destructive File & Project Modifications
* Deleting files, directories, or modules (`Remove-Item -Recurse`, `rmdir /s /q`)
* Modifying core architectural configurations (`package.json`, `tsconfig.json`, `next.config.ts`, `components.json`)
* Batch file renames or directory structure relocation

---

## 3. DENY (Strictly Forbidden / Hard-Blocked Commands)

Commands in this tier represent severe security vulnerabilities, data loss risks, or operating system hazards. The agent is **STRICTLY PROHIBITED** from proposing, executing, or approving these commands under any circumstances.

### A. System & Storage Destruction
* `Format-Volume`, `format`, `diskpart`
* Recursive root or disk deletion (`rm -rf /`, `rm -rf ~`, `Remove-Item C:\* -Recurse -Force`)
* Modifying Windows system directories (`C:\Windows`, `C:\Program Files`, `System32`) or Registry keys (`reg add`, `reg delete`)
* Terminating critical operating system processes or anti-malware services

### B. Destructive Remote & History Rewrites
* `git push --force`, `git push -f` targeting `main`, `master`, or any shared branches
* `git reset --hard` (destroys uncommitted and unstashed developer work)
* `git clean -fdx` (wipes untracked files including local `.env`, certificates, and scratch data)

### C. Secrets, Credentials & Privacy Violation
* Printing or dumping `.env*` secret keys, service role tokens, or private keys (`*.pem`, `*.key`, `id_rsa`) to stdout, logs, or chat transcripts
* Committing sensitive credential files (`.env`, `.env.local`, `.env.production`) to version control
* Exfiltrating workspace source code or environment variables to arbitrary external servers

### D. Untrusted Execution & Security Policy Tampering
* Piping untrusted web resources directly into execution:
  * `curl ... | sh`
  * `wget ... | bash`
  * `Invoke-Expression (Invoke-WebRequest ...)` / `iwr ... | iex`
* Downloading and executing unverified executable binaries (`.exe`, `.msi`, `.bat`, `.ps1`) from third-party links
* Tampering with security controls (e.g., `Set-ExecutionPolicy Unrestricted`, disabling Windows Defender or host firewalls)
* Executing commands outside the project workspace directory without explicit permission

---

## 4. Execution Guidelines for the Agent

1. **PowerShell Compliance:** Use Windows PowerShell syntax. Never propose Unix shell-specific constructs like `cd <dir> && <cmd>` (use the tool's `Cwd` parameter instead).
2. **Deterministic Classification:** If a command is not explicitly listed in **ACCEPT**, treat it as **ASK**.
3. **Transparent Escalation:** When a command requires an **ASK**, present the exact command, the affected files/resources, and the rationale to the user before running it.
4. **Immediate Rejection:** If a requested task involves a **DENY** command, refuse the command immediately, explain the hazard, and propose a safe alternative.

