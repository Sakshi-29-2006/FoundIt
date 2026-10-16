# FoundIt — Campus Lost & Found (ReactJS)

A client-side React assignment demonstrating controlled inputs, state, event handling, validation, feedback messages, filtering, and browser storage.

## Requirements
- Node.js LTS (includes npm)
- A browser

## Run locally
```bash
npm install
npm run dev
```
Open the local URL printed by Vite, usually `http://localhost:5173`.

## Test production build
```bash
npm run build
npm run preview
```

## Deploy on Netlify
1. Create a GitHub repository and upload the contents of this folder.
2. Sign in to Netlify and choose **Add new site → Import an existing project**.
3. Connect the GitHub repository.
4. Set build command to `npm run build` and publish directory to `dist`.
5. Deploy, open the public URL, and test the deployed site.

## Features
- Report Lost or Found items
- Validation for item name, category, location, date, description, and email
- Inline field errors and success/error banners
- Search by title, description, location, and category
- Filters by report type, category, and status
- Mark reports resolved/reopen them, delete reports, reset demo data
- Summary statistics
- Responsive UI
- Persists reports in localStorage

## Important limitation
This is a front-end-only demonstration. Reports are saved in the current browser's localStorage, not shared with other visitors or devices. Email links open the visitor's configured email application. Client-side validation is for usability, not a substitute for server-side validation in a real production system.
