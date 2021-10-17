------
# LinkedIn Activities Scraper (based on LinkedIn Profil Scraper by jvandenaardweg)
LinkedIn activities scraper using Puppeteer headless browser. So you can use it on a server. Returns array of urn-activity in JSON format. Works in 2020.

This scraper will extract each `data-urn` of linkedIn user's activities:

## Getting started
In order to scrape LinkedIn activities, you need to make sure the scraper is logged-in into LinkedIn. For that you need to find your account's session cookie. I suggest creating a new account on LinkedIn and enable all the privacy options so people don't see you visiting their activities when using the scraper.

1. Create a new account on LinkedIn, or use one you already have
2. Login to that account using your browser
3. Open your browser's Dev Tools to find the cookie with the name `li_at`. Use that value for `sessionCookieValue` when setting up the scraper.
4. Install: `npm install linkedin-activities-scraper`

## Usage
```typescript
// TypeScript
import { LinkedInActivitiesScraper } from 'linkedin-activities-scraper';

// Plain Javascript
// const { LinkedInActivitiesScraper } = require('linkedin-activities-scraper')

(async() => {
  const scraper = new LinkedInActivitiesScraper({
    sessionCookieValue: 'LI_AT_COOKIE_VALUE',
    keepAlive: false
  });

  // Prepare the scraper
  // Loading it in memory
  await scraper.setup()

  const result = await scraper.run('https://www.linkedin.com/in/jvandenaardweg/')
  
  console.log(result)
})()
```

See [src/examples](https://github.com/JustinMartinDev/linkedin-activities-scraper/tree/master/src/examples) for more examples.

See [Example response](#example-response) for an example response.

## Faster recurring scrapes
Set `keepAlive` to `true` to keep Puppeteer running in the background for faster recurring scrapes. This will keep your memory usage high as Puppeteer will sit idle in the background.

By default the scraper will close after a successful scrape. Freeing up your memory.

## Detect when session is expired
Known LinkedIn sessions could expire after some time. This usually happens when you do not use LinkedIn for a while. The scraper can notify you about this specifically, so you can act upon that.

You should obtain a new `li_at` cookie value from the LinkedIn.com website when this error shows and update the `sessionCookieValue` with that new value. For that, follow the [Getting started](#getting-started) steps above in this readme.

```typescript
(async() => {
  try {
    const scraper = new LinkedInActivitiesScraper({
      sessionCookieValue: 'LI_AT_COOKIE_VALUE'
    });

    await scraper.setup()

    const result = await scraper.run('https://www.linkedin.com/in/jvandenaardweg/')
  
    console.log(result)
  } catch (err) {
    if (err.name === 'SessionExpired) {
      // Do something when the scraper notifies you it's not logged-in anymore
    }
  }
})()
```

## Example response

```json
{
  "activities" : {
    "articles": [
      "6684815697408741376",
      "6681949732748828673"
    ],
    "posts": [
      "6684815697408741376",
      "6681949732748828673"
    ],
    "documents": [
      "6684815697408741376",
      "6681949732748828673"
    ]
  }
}
```

### About using the session cookie
This module uses the session cookie of a succesfull login into LinkedIn, instead of an e-mail and password to set you logged-in. I did this because LinkedIn has security measures by blocking login requests from unknown locations or requiring you to fill in Captcha's upon login. So, if you run this from a server and try to login with an e-mail address and password, your login could be blocked. By using a known session, we prevent this from happening and allows you to use this scraper on any server on any location.

So, using a session cookie is the most reliable way that I currently know.

You probably need to follow the setup steps when the scraper logs show it's not logged-in anymore.

### About the performance
- Upon start the module will open a headless browser session using Chromium. That session could be kept alive using the `keepAlive` option. Chromium uses about 75MB memory when in idle.
- Scraping usually takes a few seconds, because the script needs to scroll through the page and expand several elements in order for all the data to appear.

### Usage limits
LinkedIn has some usage limits in place. Please respect those and use their options to increase limits. More info: [LinkedIn Commercial Use Limit](https://www.linkedin.com/help/linkedin/answer/52950)
# linkedin-employees-scraper
