const currentTime = moment().format("HH:mm");

/*
probability
The array is arranged according to hours in a 24 hour cycle.
	probability[18] -> 18:00
*/
let probability;

let maxProbability;

/* WEP - Words of estimative probability
	https://en.wikipedia.org/wiki/Words_of_estimative_probability
	I twisted the definitions a little bit :)
*/
const wep = [
  {
    max: 100,
    min: 93,
    text: "Almost Definitely"
  },
  {
    max: 93,
    min: 75,
    text: "Almost Certain"
  },
  {
    max: 75,
    min: 50,
    text: "Probably"
  },
  {
    max: 50,
    min: 30,
    text: "Likely"
  },
  {
    max: 30,
    min: 7,
    text: "Unlikely"
  },
  {
    max: 7,
    min: 0,
    text: "Probably Not"
  }
];

function normalizeProbability(probability) {
  let normalizedProbability = (probability / maxProbability) * 100;

  // fix 100% to look more real, because nothing is certain in life.
  if (normalizedProbability === 100) {
    normalizedProbability = 99.42;
  }
  console.log(
    `normalizedProbability (${normalizedProbability}) = real probability (${probability})/ max Probability (${maxProbability}) * 100`
  );

  return normalizedProbability;
}

function prettyProbability(str) {
  const strArr = str.split(".");
  const number = strArr[0];
  let fraction = "";

  if (strArr.length == 2) {
    fraction = strArr[1].slice(0, 2);
  } else {
    fraction = "00";
  }

  return number + "." + fraction;
}

// returns the probability
function getProbability(hours) {
  return probability[hours].probability;
}

// returns string
function getWEP(probability) {
  for (curWEP of wep) {
    if (probability >= curWEP.min && probability < curWEP.max) {
      return curWEP.text;
    }
  }
}

function timeUpdated(timeString) {
  const hours = parseInt(timeString.split(":")[0]);

  const normalizedProbability = normalizeProbability(getProbability(hours));
  const WEP = getWEP(normalizedProbability);

  console.log(normalizedProbability, WEP);

  $(".probability").html(prettyProbability(normalizedProbability.toString()));
  $(".wep").html(WEP);
}

$(".clockpicker input").attr("placeholder", currentTime);

const spreadsheetId = "1Q4Ia6WG8heKThDScF-5MIAPVdTZBPbjNS8BH4tfWkVM";
const spreadsheetTabName = "Dashboard_API";
const probabilityTabName = "Probability_API";

$(document).ready(function() {
  $.getJSON(`https://opensheet.elk.sh/${spreadsheetId}/${spreadsheetTabName}`, function(response) {

    const data = {
      totalCups: response[0]["total cups"],
      firstRecordedCoffeeCup: moment(response[0]["first recorded coffee cup date"], "DD-MM-YYYY hh:mm:ss"),
      latestRecordedCoffeeCup: moment(response[0]["latest recorded coffee cup date"], "DD-MM-YYYY hh:mm:ss"),
      maximalNumberOfCupsInOneDay: response[0]["maximal number of cups in one day"],
      latestMostFrequentDay: response[0]["latest most frequent date"],
      shortestTimeBetweenTwoCupsInSeconds: parseInt(response[0]["shortest time between two cups in seconds"]),
      longestTimeBetweenTwoCupsInSeconds: parseInt(response[0]["longest time between two cups in seconds"]),
    }


    const latestMostFrequentDay = moment(
      data.latestMostFrequentDay,
      "DD-MM-YYYY"
    ).format("LL");

    $(".total").html(data.totalCups);

    $(".from-date").html(data.firstRecordedCoffeeCup.format("LL"));
    $(".to-date").html(data.latestRecordedCoffeeCup.format("LL"));

    $(".total-years").html(moment.duration(data.latestRecordedCoffeeCup.diff(data.firstRecordedCoffeeCup)).humanize());

    $("#TotalCups .card-data").text(data.totalCups);
    $("#TotalCups .card-hint-data").text(
      `About ${(data.totalCups * 80) / 1000} grams of caffeine`
    );

    $("#FirstRecordedCoffeeCup .card-data").text(data.firstRecordedCoffeeCup.format("LL"));
    $("#LatestRecordedCoffeeCup .card-data").text(data.latestRecordedCoffeeCup.format("LL"));


    $("#ShortestTimeBetweenTwoCups .card-data").text(moment.duration(data.shortestTimeBetweenTwoCupsInSeconds, "seconds").humanize());
    $("#LongestTimeBetweenTwoCups .card-data").text(moment.duration(data.longestTimeBetweenTwoCupsInSeconds, "seconds").humanize());

    $("#LongestTimeBetweenTwoCups .card-hint-data").text(
      `${Math.round(
        moment.duration(data.longestTimeBetweenTwoCupsInSeconds, "seconds").asDays()
      )} Days`
    );

    $("#MaximalNumberOfCupsInOneDay .card-data").text(
      `${data.maximalNumberOfCupsInOneDay} Cups`
    );
    $("#MaximalNumberOfCupsInOneDay .card-hint-data").text(
      latestMostFrequentDay
    );
  });

  $.getJSON(`https://opensheet.elk.sh/${spreadsheetId}/${probabilityTabName}`, function(response) {
    // // Update globals
    probability = response;

    maxProbability = Math.max.apply(
      Math,
      response.map(function(o) {
        return o.probability;
      })
    );

    console.log("maxProbability ", maxProbability);

    // first init
    timeUpdated(currentTime);

    $(".clockpicker").clockpicker({
      align: "left",
      donetext: "Done",
      default: "now",
      vibrate: true,
      afterDone: function(e) {
        timeUpdated($(".clockpicker input").val());
      }
    });
  });
});
