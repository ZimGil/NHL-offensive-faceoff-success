const request = require('request');
const colors = require('colors/safe');
const jsonfile = require('jsonfile');
const async = require('async');

const season = process.argv[2];
const allSeasonInfo = [];

request(`http://live.nhl.com/GameData/SeasonSchedule-${season}.json`,
  (error, response, body) => {
    if (error || response.statusCode !== 200) {
      console.log(colors.red(`Failed to get schedule for season ${season}`));
      return;
    }

    const importedJSON = JSON.parse(body);
    jsonfile.writeFileSync(`data/schedule-${season}.json`, importedJSON);
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
          try {
            if ((utcDate - 1) < gameDate.substring(0, 8)) {
              console.log(colors.green('All available games fetched'));
              return;
            } else {
              console.log(colors.green(`Fetching URL: ${URL}`));
              allSeasonInfo.push(body);
              callback();
            }
          } catch (err) {
            console.log(colors.red(`Failed to fetch GameID: ${gameId}`));
            callback(err);
          }
        }
      }, err => {
        if (err) {
          console.log(colors.red(`Last attempted GameID: ${lastProcessedId}`));
          console.log('detailed error:', err);
          return;
        } else {
          console.log(colors.green('All available games fetched successfully'));
        }
      });
    });
  });
