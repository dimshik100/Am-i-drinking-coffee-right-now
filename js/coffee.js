var currentdate = new Date();

var currentTime = padLeft(currentdate.getHours()) + ":" + padLeft(currentdate.getMinutes());

$('.clockpicker input').attr('placeholder', currentTime);


// http://weareoutman.github.io/clockpicker/
$('.clockpicker').clockpicker({
  align: 'left',
  donetext: 'Done',
  'default': 'now',
  vibrate: true,
  afterDone: function (e) {
    timeUpdated($('.clockpicker input').val());
  }
});

/*
probability
The array is arranged according to hours in a 24 hour cycle.
	probability[18] -> 18:00
*/
var probability;

var maxProbability;


/* WEP - Words of estimative probability
	https://en.wikipedia.org/wiki/Words_of_estimative_probability
	I twisted the definitions a little bit :)
*/

var wep = [
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

  var normalizedProbability = probability / maxProbability * 100;

  // fix 100% to look more real, because nothing is certain in life.
  if (normalizedProbability === 100) {
    normalizedProbability = 99.42;
  }
  console.log(`normalizedProbability (${normalizedProbability}) = real probability (${probability})/ max Probability (${maxProbability}) * 100`);

  return normalizedProbability;
}


function prettyProbability(str) {

  var strArr = str.split('.');
  var number = strArr[0];
  var fraction = '';

  if (strArr.length == 2) {
    fraction = strArr[1].slice(0, 2);
  } else {
    fraction = '00';
  }

  return number + '.' + fraction;
}

function padLeft(str) {
  str = str.toString();
  var pad = "00"
  return pad.substring(0, pad.length - str.length) + str;

}

// returns the probability
function getProbability(hours) {
  return probability[hours].probability;
}

// returns string
function getWEP(probability) {

  for (var i = 0; i < wep.length; i++) {
    var curWEP = wep[i];
    if (probability >= curWEP.min && probability < curWEP.max) {
      return curWEP.text;
    }
  }
}

function timeUpdated(timeString) {
  var hours = parseInt(timeString.split(":")[0]);

  var normalizedProbability = normalizeProbability(getProbability(hours));
  var WEP = getWEP(normalizedProbability);

  console.log(normalizedProbability, WEP);

  $('.probability').html(prettyProbability(normalizedProbability.toString()));
  $('.wep').html(WEP);

}

$(document).ready(function () {
  $.getJSON("ajax/hashedTimes_2018-10-29T22:15:18.562Z.json", function (data) {

    $('.total').html(data.totalCups);
    $('.from-date').html(moment(data.firstRecordedCoffeeCup).format('LL'));
    $('.to-date').html(moment(data.latestRecordedCoffeeCup).format('LL'));

    probability = data.probabilityArr;

    maxProbability = Math.max.apply(Math, data.probabilityArr.map(function (o) { return o.probability; }));
    console.log('maxProbability ', maxProbability);

    // first init
    timeUpdated(currentTime);
  });
});



