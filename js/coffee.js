var currentdate = new Date();

var currentTime = currentdate.getHours() + ":" + currentdate.getMinutes();

$('.clockpicker input').attr('placeholder', currentTime);


// http://weareoutman.github.io/clockpicker/
$('.clockpicker').clockpicker({
	align: 'left',
	donetext: 'Done',
	'default': 'now'
});
