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

## API Overview

The application provides two main API endpoints:

### 1. GET /api/matches

Fetches a list of today's pending matches along with their odds history, optionally filtered by league and bookmaker. The result can be fetched from the cache or from the database if no cached data is available.

#### Query Parameters:

- `league` (optional): Filters matches by the specified league.
- `bookmaker` (optional): Filters the odds by a specific bookmaker.

### Query example

- `league` - `BRAZIL_Carioca`
- `bookmaker` - `BETFAN`

#### Response:

- `200 OK`: A JSON response containing the list of matches and their odds history.
- `400 Bad Request`: If the query parameters are invalid.
- `500 Internal Server Error`: If there is an issue fetching matches.

---

### 2. GET /api/calculate-bet

Calculates the potential return of a bet, either as a "single" or "ako" (accumulator) bet, based on selected matches and bookmakers. The response includes the cumulative odds for the selected matches.

#### Query Parameters:

- `betType` (required): Specifies the type of bet. Valid values:

  - `single`: A bet on a single match. Requires `matches` parameter.
  - `ako`: An accumulator bet on multiple matches. Requires `matches` parameter.

- `matches` (required): A stringified list of match objects, each containing:
  - `matchId` (required): Unique match ID.
  - `eventType` (required): Type of event (e.g., "home", "draw", or "guest").
  - `bookmaker` (required): The bookmaker for the bet.

### Query example

- `betType` - `single`
- `matches` - `[{"matchId":"678ed73a57e796a17d905540","eventType":"draw","bookmaker":"BETFAN"}]`

or

- `betType` - `ako`
- `matches` - `[{"matchId":"678c37986e3b89f3b1e4476f","eventType":"home","bookmaker":"eFortuna"},{"matchId":"678c37986e3b89f3b1e44778","eventType":"draw","bookmaker":"eFortuna"}]`

#### Response:

- `200 OK`: A JSON response containing the calculated total odds for the selected matches.
- `400 Bad Request`: If the query parameters are invalid.
- `404 Not Found`: If the matches are not found.
- `500 Internal Server Error`: If there is an issue fetching odds or calculating the bet.

## Additional notes

## Cron Jobs

The application includes several scheduled tasks:

- **Initial Scraping Task**: On first run, the app automatically scrapes match data.
- **Scheduled Scraping**: Every 30 minutes, the app fetches updated match data.
- **End of Day Cleanup**: At 23:59, the app clears outdated data and scrapes new match data.
- **Beginning of Day Scraping**: At 00:01, the app performs an initial scrape for the day's matches.
