module.exports = analyseSeasonData;

function analyseSeasonData(gamesData) {
  let totalOffensiveWins = 0;
  let totalFaceoffs = 0;
  gamesData.forEach(gameData => {
    gameData = JSON.parse(gameData);
    const homeTeamTriCode = gameData.gameData.teams.home.triCode;
    const isHomeTeamStartsOnLeft = gameData.liveData.linescore.periods[0].home.rinkSide === 'left';
    const faceoffs = getFaceoffs(gameData.liveData.plays.allPlays);

    totalOffensiveWins += analyseGame(faceoffs, homeTeamTriCode, isHomeTeamStartsOnLeft);
    totalFaceoffs += faceoffs.length;
  });

  return totalOffensiveWins / totalFaceoffs;
}

function analyseGame(faceoffs, homeTeamTriCode, isHomeTeamStartsOnLeft) {
  let offensiveWins = 0;
  faceoffs.forEach(faceoff => offensiveWins += isOffensiveWon(faceoff, homeTeamTriCode, isHomeTeamStartsOnLeft));

  return offensiveWins;
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

function isOffensiveWon(faceoff, homeTeamTriCode, isHomeTeamStartsOnLeft) {

  // Center ice faceoff
  if (faceoff.coordinates.x === 0) {
    return faceoff.team.triCode === homeTeamTriCode;
  }

  // First and Third Periods and Second and every other OT period
  if (faceoff.about.period % 2 !== 0) {
    if (faceoff.coordinates.x < 0) {
      // Home team win XOR Home team started on left side
      return (faceoff.team.triCode === homeTeamTriCode) ^ isHomeTeamStartsOnLeft;
    } else if (faceoff.coordinates.x > 0) {
      // Away team win XOR Home team started on left side
      return !((faceoff.team.triCode === homeTeamTriCode) ^ isHomeTeamStartsOnLeft);
    }

  // Second Period and First and every other OT Period
  } else {
    if (faceoff.coordinates.x < 0) {
      // Away team win XOR Home team started on left side
      return !((faceoff.team.triCode === homeTeamTriCode) ^ isHomeTeamStartsOnLeft);
    } else if (faceoff.coordinates.x > 0) {
      // Home team win XOR Home team started on left side
      return (faceoff.team.triCode === homeTeamTriCode) ^ isHomeTeamStartsOnLeft;
    }
  }
}
