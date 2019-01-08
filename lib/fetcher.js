const request = require('request-promise-native');
const _ = require('lodash');
const colors = require('colors/safe');
const { timer } = require('rxjs');

module.exports = fetchSeasonData;

function fetchSeasonData(season) {
  return new Promise((resolve, reject) => {
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
  return new Promise((resolve, reject) => {
    const gamesData = [];
    _.forEach(gameUrls, gameUrl => {
      request(gameUrl, (error, response, body) => {
        if (!error) {
          console.log(colors.green(`Fetched game from: ${gameUrl}`));
          gamesData.push(body);
        }
      });
    });

    const doneTimer = timer(0, 500).subscribe(() => {
      if (gamesData.length === gameUrls.length) {
        resolve(gamesData);
        doneTimer.unsubscribe();
      }
    });
  });
}
