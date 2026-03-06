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

## Docker Deployment

This repository includes:

- `deploy/Dockerfile`
- `deploy/docker-compose.yml`

Build and run:

```bash
docker compose -f deploy/docker-compose.yml up -d --build
```

Check logs:

```bash
docker compose -f deploy/docker-compose.yml logs -f
```

Stop:

```bash
docker compose -f deploy/docker-compose.yml down
```

The app is exposed at `http://localhost:4321`.

## Development

### Getting Started

Install dependencies:

```bash
bun install
```

Start dev server:

```bash
bun run dev
```

Build production output:

```bash
bun run build
```

Preview production build locally:

```bash
bun run preview
```

### Lint and Format

Run lint (auto-fix enabled by script):

```bash
bun run lint
```

Run formatter:

```bash
bun run format
```
