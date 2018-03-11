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
var probability = [
	{
		time: "00:00",
		probability: "0",
	},
	{
		time: "01:00",
		probability: "0",
	},
	{
		time: "02:00",
		probability: "0.3968253968",
	},
	{
		time: "03:00",
		probability: "0",
	},
	{
		time: "04:00",
		probability: "0",
	},
	{
		time: "05:00",
		probability: "0",
	},
	{
		time: "06:00",
		probability: "0",
	},
	{
		time: "07:00",
		probability: "3.174603175",
	},
	{
		time: "08:00",
		probability: "3.571428571",
	},
	{
		time: "09:00",
		probability: "4.365079365",
	},
	{
		time: "10:00",
		probability: "13.88888889",
	},
	{
		time: "11:00",
		probability: "8.333333333",
	},
	{
		time: "12:00",
		probability: "4.761904762",
	},
	{
		time: "13:00",
		probability: "8.73015873",
	},
	{
		time: "14:00",
		probability: "9.523809524",
	},
	{
		time: "15:00",
		probability: "7.142857143",
	},
	{
		time: "16:00",
		probability: "13.88888889",
	},
	{
		time: "17:00",
		probability: "9.126984127",
	},
	{
		time: "18:00",
		probability: "4.365079365",
	},
	{
		time: "19:00",
		probability: "2.380952381",
	},
	{
		time: "20:00",
		probability: "1.984126984",
	},
	{
		time: "21:00",
		probability: "1.984126984",
	},
	{
		time: "22:00",
		probability: "1.587301587",
	},
	{
		time: "23:00",
		probability: "0.7936507937",
	}
];



/* WEP - Words of estimative probability
	https://en.wikipedia.org/wiki/Words_of_estimative_probability
	I twisted the definitions a little bit :)
*/
var wep = [
	{
		max: 14,
		min: 12,
		text: "Almost Definitely" //2
	},
	{
		max: 12,
		min: 9,
		text: "Almost Certain" //2
	},
	{
		max: 9,
		min: 4,
		text: "Probably" //6
	},
	{
		max: 4,
		min: 2,
		text: "Likely" //3
	},
	{
		max: 2,
		min: 1,
		text: "Unlikely" //3
	},
	{
		max: 1,
		min: 0,
		text: "Probably Not" //8
	}
];


function normalizeProbability(str) {
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
	return probability[hours];
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
	var probability = getProbability(hours);
	var WEP = getWEP(probability);

	console.log(probability, WEP);

	$('.probability').html(normalizeProbability(probability.toString()));
	$('.wep').html(WEP);

}

var totalCups;




$( document ).ready(function() {
    $.getJSON("ajax/hashedTimes_2018-03-11T20:35:10.759Z.json", function (data) {

		// calculate total number of cups
		totalCups = data.reduce((a, b) => a + b, 0);
	
		$('.total').html(totalCups);
	
		probability = [];
		for (let i = 0; i < data.length; i++) {
			probability.push(data[i] / totalCups * 100);
		}
		// first init
		timeUpdated(currentTime);
	});
});



