const colors = require('colors/safe');
//
const analyseSeasonData = require('./lib/analyzer');
const fetchSeasonData = require('./lib/fetcher');


const season = process.argv[2];

if (!season || !season.match(/^\d{8}$/g)) {
  console.log(colors.red('Please provide a valid season in 8 digits pattern (i.g: 20172018)'));
  process.exit();
}

fetchSeasonData(season)
  .then(gamesData => {
    console.log(colors.cyan(`Done fetching data for season ${season}\nAnalyzing...`));
    return analyseSeasonData(gamesData);
  })
  .then(offensiveFaceoffWinRatio => {
    console.log([
      colors.green(`Offensive Faceoff Win Ratio for the ${season} season:`),
      colors.cyan(offensiveFaceoffWinRatio)
    ].join(' '));
  });
