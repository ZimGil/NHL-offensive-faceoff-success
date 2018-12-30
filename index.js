const request = require('request');
const colors = require('colors/safe');
const async = require('async');

const season = process.argv[2];
const allSeasonData = [];

request(`http://live.nhl.com/GameData/SeasonSchedule-${season}.json`,
  (error, response, body) => {
    if (error || response.statusCode !== 200) {
      console.log(colors.red(`Failed to get schedule for season ${season}`));
      return;
    }

    const importedJSON = JSON.parse(body);
    console.log(colors.green(`Schedule for ${season} processed successfully`));

    const utcDate = new Date().toJSON().slice(0,10).replace(/-/g,'');
    let lastProcessedId;

    async.eachSeries(importedJSON, (row, callback) => {
      const gameId = row.id;
      const gameDate = row.est;

      const URL = `http://statsapi.web.nhl.com/api/v1/game/${gameId}/feed/live`;
      lastProcessedId = gameId;

      request(URL, (error, response, body) => {
        if (error) {
          callback(error);
        } else {
          if ((utcDate - 1) < gameDate.substring(0, 8)) {
            console.log(colors.green('All available games fetched'));
            return;
          } else {
            console.log(colors.green(`Fetching URL: ${URL}`));
            allSeasonData.push(JSON.parse(body));
            callback();
          }
        }
      });
    }, err => {
      if (err) {
        console.log(colors.red(`Last attempted GameID: ${lastProcessedId}`));
        console.log('detailed error:', err);
        return;
      } else {
        console.log(colors.green('All available games fetched successfully'));
      }
      analyseGamesData(allSeasonData);
    });
  });

function analyseGamesData(gamesData) {
  let offensiveAdvantage = 0;
  gamesData.forEach(gameData => offensiveAdvantage += analyseGame(gameData));

  console.log(offensiveAdvantage);
}

function analyseGame(gameData) {
  const homeTeamTriCode = gameData.gameData.teams.home.triCode;
  const isHomeTeamStartsOnLeft = gameData.liveData.linescore.periods[0].home.rinkSide === 'left';

  let offensiveAdvantage = 0;
  const plays = gameData.liveData.plays.allPlays;
  const faceoffs = getFaceoffs(plays);

  faceoffs.forEach(faceoff => {
    offensiveAdvantage += isOffensiveWon(faceoff, homeTeamTriCode, isHomeTeamStartsOnLeft);
  });

  return offensiveAdvantage / faceoffs.length;
}

function isOffensiveWon(faceoff, homeTeamTriCode, isHomeTeamStartsOnLeft) {
  if (faceoff.about.period % 2 !== 0) {
    if (faceoff.coordinates.x === 0) {
      return faceoff.team.triCode === homeTeamTriCode;
    } else if (faceoff.coordinates.x < 0) {
      return (faceoff.team.triCode === homeTeamTriCode) ^ isHomeTeamStartsOnLeft;
    } else if (faceoff.coordinates.x > 0) {
      return !((faceoff.team.triCode === homeTeamTriCode) ^ isHomeTeamStartsOnLeft);
    }
  } else {
    if (faceoff.coordinates.x === 0) {
      return faceoff.team.triCode === homeTeamTriCode;
    } else if (faceoff.coordinates.x < 0) {
      return !((faceoff.team.triCode === homeTeamTriCode) ^ isHomeTeamStartsOnLeft);
    } else if (faceoff.coordinates.x > 0) {
      return (faceoff.team.triCode === homeTeamTriCode) ^ isHomeTeamStartsOnLeft;
    }
  }
}

function getFaceoffs(allPlays) {
  const faceoffs = [];

  allPlays.forEach(play => {
    if (play.result.eventTypeId === 'FACEOFF') {
      faceoffs.push(play);
    }
  });

  return faceoffs;
}
