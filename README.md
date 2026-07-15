# Dynamic Dan Fullstack

This is the combined backend + frontend version.

One Node/Express app does all of this:

- Serves the visual chat page
- Runs the `/chat` API
- Runs the `/leads` API
- Crawls and indexes `dynamicecohome.com`
- Stores leads in `data/leads.json`

## Setup on Mac

```bash
npm install
cp .env.example .env
```

Open `.env` and add your OpenAI API key:

```env
OPENAI_API_KEY=your_key_here
```

## Crawl the website

```bash
npm run crawl
```

This creates:

```text
data/index.json
```

## Run everything together

```bash
npm run dev
```

Then open:

```text
http://localhost:3001
```

That one URL shows the frontend and uses the backend at the same time.

## Test API directly

```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Do you offer roofing?","pageUrl":"https://dynamicecohome.com/roofing"}'
```

## Pricing lead test

Ask:

```text
How much does solar cost?
```

The widget should ask for name and phone number, then save the lead to:

```text
data/leads.json
```

## Important files

```text
src/server.js               Main fullstack server
src/prompt.js               Dynamic Dan behavior rules
src/crawler.js              Website crawler
data/approvedUrls.json      Pages Dynamic Dan is allowed to use
public/index.html           Demo frontend page
public/dynamic-dan.css      Chat widget styles
public/dynamic-dan.js       Chat widget logic
```

## Add this to the real website later

For local development, this fullstack project is easiest.

For the real Dynamic EcoHome website, you will usually deploy the backend somewhere like Render, Railway, Vercel, or AWS, then load only these frontend files on the website:

```text
public/dynamic-dan.css
public/dynamic-dan.js
```
