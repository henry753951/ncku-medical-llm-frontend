# NCKU NIHSS Frontend

## Prerequisites

- Bun (for local development/build)
- Docker + Docker Compose (for container deployment)

## Environment Variables

First, obtain a GROQ API key from [GROQ Console](https://console.groq.com/keys). Then,
Create `.env` in the project root:

```env
GROQ_API_KEY=
GROQ_TRANSCRIBE_MODEL=whisper-large-v3-turbo
EVALUATE_API_URL=http://xx.xx.xx.xx/evaluate
```

You can copy from `.env.sample`.

## Questions Config (`questions.json`)

Question metadata is loaded from backend at runtime.

- File path: project root `questions.json`
- Frontend source: `GET /api/questions`
- If `questions.json` does not exist, backend will auto-create it with default content.
- IDE schema hint: `questions.json` is mapped to `questions.schema.json` via `.vscode/settings.json`.

### JSON format

`questions.json` must be an array, each item must include:

- `code`: string (unique, non-empty)
- `name`: string (non-empty)
- `description`: string (non-empty)
- `examples`: string array (at least one non-empty string)

Example:

```json
[
 {
  "code": "1A",
  "name": "Level of consciousness",
  "description": "此項目是辨別病患意識狀態...",
  "examples": ["先生，你覺得怎麼樣？有哪裡不舒服嗎？"]
 }
]
```

## Development (Local)

### 1) Install dependencies

```bash
bun install
```

### 2) Run dev server

```bash
bun run dev
```

Open `http://localhost:4321`.

### 3) Lint and format

```bash
bun run lint
bun run format
```

## Local Production Preview

Use this when you want to test the production build locally.

### Bash / zsh

```bash
bun install --frozen-lockfile
bun run build
GROQ_API_KEY=your_api_key \
GROQ_TRANSCRIBE_MODEL=whisper-large-v3-turbo \
EVALUATE_API_URL=http://xx.xx.xx.xx/evaluate \
bun run preview
```

### PowerShell

```powershell
bun install --frozen-lockfile
bun run build
$env:GROQ_API_KEY="your_api_key"
$env:GROQ_TRANSCRIBE_MODEL="whisper-large-v3-turbo"
$env:EVALUATE_API_URL="http://xx.xx.xx.xx/evaluate"
bun run preview
```

## Deployment (Docker)

### Files

- `deploy/Dockerfile`
- `deploy/docker-compose.yml`

### Build and run

```bash
docker compose -f deploy/docker-compose.yml up -d --build
```

### Logs

```bash
docker compose -f deploy/docker-compose.yml logs -f
```

### Stop

```bash
docker compose -f deploy/docker-compose.yml down
```

Service URL: `http://localhost:4321`.

### Lockfile note

The Docker build uses `bun install --frozen-lockfile`. If you changed `package.json`, update and commit `bun.lock` first:

```bash
bun install
```
