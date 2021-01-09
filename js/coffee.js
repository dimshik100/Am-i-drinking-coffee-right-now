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

$(document).ready(function() {
  $.getJSON("ajax/hashedTimes_2021-01-09T15:22:13.367Z.json", function(data) {
    const firstRecordedCoffeeCup = moment(data.firstRecordedCoffeeCup).format(
      "LL"
    );
    const latestRecordedCoffeeCup = moment(data.latestRecordedCoffeeCup).format(
      "LL"
    );

    const shortestTimeBetweenTwoCups = moment
      .duration(data.shortestTimeBetweenTwoCupsInMs)
      .humanize();
    const longestTimeBetweenTwoCups = moment
      .duration(data.longestTimeBetweenTwoCupsInMs)
      .humanize();

    const latestMostFrequentDay = moment(
      data.maximalNumberOfCupsInOneDay.latestMostFrequentDay,
      "MM-DD-YYYY"
    ).format("LL");

    $(".total").html(data.totalCups);

    $(".from-date").html(firstRecordedCoffeeCup);
    $(".to-date").html(latestRecordedCoffeeCup);

    $("#TotalCups .card-data").text(data.totalCups);
    $("#TotalCups .card-hint-data").text(
      `About ${(data.totalCups * 80) / 1000} grams of caffeine`
    );

    $("#FirstRecordedCoffeeCup .card-data").text(firstRecordedCoffeeCup);
    $("#LatestRecordedCoffeeCup .card-data").text(latestRecordedCoffeeCup);

    $("#ShortestTimeBetweenTwoCups .card-data").text(
      shortestTimeBetweenTwoCups
    );
    $("#LongestTimeBetweenTwoCups .card-data").text(longestTimeBetweenTwoCups);

    $("#LongestTimeBetweenTwoCups .card-hint-data").text(
      `${Math.round(
        moment.duration(data.longestTimeBetweenTwoCupsInMs).asDays()
      )} Days`
    );

    $("#MaximalNumberOfCupsInOneDay .card-data").text(
      `${data.maximalNumberOfCupsInOneDay.maximalNumberOfCups} Cups`
    );
    $("#MaximalNumberOfCupsInOneDay .card-hint-data").text(
      latestMostFrequentDay
    );

    // Update globals
    probability = data.probabilityArr;

    maxProbability = Math.max.apply(
      Math,
      data.probabilityArr.map(function(o) {
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
