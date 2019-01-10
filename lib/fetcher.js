const _ = require('lodash');
const request = require('request-promise-native');
const Bottleneck = require('bottleneck/es5');
const colors = require('colors/safe');

const limiter = new Bottleneck({
  // allow a total of 700 requests in parallel to not hit the rate limit
  maxConcurrent: 700
});

module.exports = fetchSeasonData;

function fetchSeasonData(season) {
  return new Promise(resolve => {
    request(`http://live.nhl.com/GameData/SeasonSchedule-${season}.json`,
      (error, response, body) => getSeasonSchedule(error, response, body, season))
      .then(seasonSchedule => getSeasonGameUrls(seasonSchedule))
      .then(gameUrls => getGamesData(gameUrls))
      .then(gamesData => resolve(gamesData));
  });
}

function getSeasonSchedule(error, response, body, season) {
  if (error || response.statusCode !== 200) {
    console.log(colors.red(`Failed to get schedule for season ${season}`));
    process.exit();
  }
  console.log(colors.green(`Fetched schedule for season ${season}`));
  return body;
}


function getSeasonGameUrls(seasonSchedule) {
  const seasonGameUrls = [];
  const utcDate = new Date().toJSON().slice(0, 10).replace(/-/g, '');
  seasonSchedule = JSON.parse(seasonSchedule);

  _.forEach(seasonSchedule, game => {
    const gameDate = game.est.substring(0, 8);

    if (utcDate > gameDate) {
      const URL = `http://statsapi.web.nhl.com/api/v1/game/${game.id}/feed/live`;
      seasonGameUrls.push(URL);
    }
  });

  return seasonGameUrls;
}

function getGamesData(gameUrls) {

  let counter = 0;
  const allPromises = gameUrls.map(gameUrl => {

    return rateLimitRequest({
      url: gameUrl,
      method: 'GET',
      // return an object instead of a string
      json: true,
      // timeout after 30 seconds
      timeout: 30000
    })
    // if successful, print a follow up and return the data
      .then(gameData => {
        console.log([
          colors.green(`Fetched game from: ${ gameUrl }`),
          colors.magenta(`(${ ++counter } / ${ gameUrls.length })`)
        ].join(' '));

        return gameData;
      })
      // if failed, don't throw an error.
      // instead, return an object with an error attribute
      .catch(error => {
        console.error([
          colors.red(`Failed to fetch game from: ${ gameUrl } `),
          colors.magenta(`(${ ++counter } / ${ gameUrls.length })\n`),
          colors.yellow(error)
        ].join(''));

        return { error };
      });
  });

  return Promise.all(allPromises)
    // filter all the errors for the function calling this
    // .then(gamesData => gamesData.filter(data => data && !data.error));
}

function rateLimitRequest(...args) {
  return limiter.schedule(() => request(...args));
}
