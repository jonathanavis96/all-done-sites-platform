# All Done Sites

This repository contains:

- `website/`: the production website (Vite + React + TypeScript)
- `workers/`, `cortex/`, `brain/`, `skills/`: agent infrastructure and knowledge base

## Website development

You can run the website either from `website/` directly, or from repo root using wrapper scripts.

Install deps in `website/` once:

```bash
cd website
npm install
```

Then you can run dev either way.

From `website/`:

```bash
npm run dev
```

From repo root (wrapper script):

```bash
npm run dev
```

Build (also generates static pages for deep links on GitHub Pages):

```bash
npm run build
```

See `website/README.md` for more.

---

# Legacy Lovable README

The content below is preserved from the original Lovable bootstrap.

# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/d1db3fad-b638-4d9c-bf77-bd4989b82dd3

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/d1db3fad-b638-4d9c-bf77-bd4989b82dd3) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/d1db3fad-b638-4d9c-bf77-bd4989b82dd3) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
