# Node.js / TS Scraper Application

This application is a Node.js and TypeScript-based REST API and web scraper that retrieves and processes pre-match odds from Flashscore.com website. The data is stored in a MongoDB database, and the application supports filtering matches, calculating single/AKO odds, and maintaining a history of odds changes.

## Features

- Built with Node.js and TypeScript
- Scrapes bet data using Playwright from flashcore.com
- Uses MongoDB for data storage
- Dockerized
- Supports basic unit tests with Jest

---

## Prerequisites

Make sure you have the following installed:

- [Docker](https://www.docker.com/)
- [Node.js 20](https://nodejs.org/) (for development purposes)
- [npm](https://www.npmjs.com/)

---

## Running the Application

### Running with Docker

1. Build the Docker containers:
   ```bash
   docker-compose build
   ```
2. Start the containers in detached mode:
   ```bash
   docker-compose up -d
   ```

This will create two containers:

- **app**: Runs the application on port 3000.
- **mongodb**: Runs MongoDB on port 27017.

3. Verify that the app is running:

```
 http://localhost:3000
```

### Running locally

1. Install dependencies

```
npm install
```

2. Install playwright dependencies if necessary

```
RUN npx playwright install chromium
RUN npx playwright install-deps chromium
```

3. Make sure that correct data are provided in env file e.g

```
SCRAPER_URL=https://www.flashscore.com/
MONGO_URI=mongodb://root:example@localhost:27017/
PORT=5000
```

4. Start app locally

```
npm run dev
```

5. (Optional) run app locally with hot reloading

```
npm run live
```

## Running tests

```
npm run tests
```

## Formatting and Linting

### Format the codebase with Prettier:

```

npm run format

```

### Lint the codebase:

```
npm run lint
```

### Automatically fix lint issues:

```
npm run lint:fix
```
