const spreadsheetId = "1Q4Ia6WG8heKThDScF-5MIAPVdTZBPbjNS8BH4tfWkVM";
const dashboardTabName = "Dashboard_API";
const probabilityTabName = "Probability_API";
const coffeeDbTabName = "Coffee%20DB";

let probabilitiesData = [];
let maxProbability = 0;
let dashboardData = {};
let coffeeDbData = [];
let latestDateObj = new Date();
let liveTimerInterval;

const wep = [
  { max: 100, min: 93, text: "Almost Definitely" },
  { max: 93, min: 75, text: "Almost Certain" },
  { max: 75, min: 50, text: "Probably" },
  { max: 50, min: 30, text: "Likely" },
  { max: 30, min: 7, text: "Unlikely" },
  { max: 7, min: 0, text: "Probably Not" }
];

const pad = (num) => num.toString().padStart(2, '0');

function normalizeProbability(prob) {
  let normalized = (prob / maxProbability) * 100;
  if (normalized === 100) normalized = 99.42;
  return normalized;
}

function getWEP(prob) {
  for (let w of wep) {
    if (prob >= w.min && prob <= w.max) return w.text;
  }
  return "Unknown";
}

function formatDuration(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m ${secs}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function parseDateDDMMYYYYHHMMSS(dateStr) {
  if (!dateStr) return new Date();
  const parts = dateStr.split(' ');
  const dateParts = parts[0].split('-');
  const timeParts = parts[1] ? parts[1].split(':') : ['00', '00', '00'];
  return new Date(
    parseInt(dateParts[2]),
    parseInt(dateParts[1]) - 1,
    parseInt(dateParts[0]),
    parseInt(timeParts[0]),
    parseInt(timeParts[1]),
    parseInt(timeParts[2])
  );
}

function getContextualMessage(hours, prob) {
  if (hours >= 22 || hours < 4) {
    return prob > 10 ? "Late night grind or bad decisions? 🦉" : "You should be sleeping. 🛏️";
  }
  if (hours >= 7 && hours <= 10) {
    return prob > 50 ? "Prime coffee time! ☕" : "Starting the day slow? 🌅";
  }
  if (hours >= 14 && hours <= 16) {
    return prob > 30 ? "Afternoon slump avoided. ⚡" : "Powering through the afternoon. 💪";
  }
  return "Just another beautiful day. ✨";
}

function updateProbabilityDisplay(timeStr) {
  const hours = parseInt(timeStr.split(":")[0], 10);
  if (!probabilitiesData[hours]) return;

  const prob = probabilitiesData[hours].probability;
  const normalized = normalizeProbability(prob);
  const wepText = getWEP(normalized);

  document.querySelector(".probability").textContent = normalized.toFixed(2);
  document.querySelector(".wep").textContent = wepText;

  // Update Contextual Message
  document.getElementById("ContextualMessage").textContent = getContextualMessage(hours, normalized);

  // Animate Liquid Level (via group transform)
  const liquidStack = document.getElementById("liquid-stack");
  if (liquidStack) {
    const maxH = 180.305;
    const bottomY = 315.779;

    // Enforce a minimum visual height of 40% so the waves never hide entirely
    const visualPercent = Math.max(40, normalized);
    const newY = bottomY - (visualPercent / 100) * maxH;

    liquidStack.style.transform = `translate(147px, ${newY}px)`;
  }
}

function updateLiveClock() {
  const secondsSinceLast = Math.floor((new Date() - latestDateObj) / 1000);
  document.getElementById("TimeSinceLastData").textContent = formatDuration(secondsSinceLast);
}

function updateDashboardUI() {
  document.querySelector(".total").textContent = dashboardData.totalCups;

  const firstDate = parseDateDDMMYYYYHHMMSS(dashboardData.firstRecordedCoffeeCup);
  latestDateObj = parseDateDDMMYYYYHHMMSS(dashboardData.latestRecordedCoffeeCup);

  const yearsTotal = ((latestDateObj - firstDate) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);
  document.querySelector(".total-years").textContent = `${yearsTotal} years`;

  document.getElementById("TotalCupsData").textContent = dashboardData.totalCups;
  document.getElementById("CaffeineHint").textContent = `~${Math.round(dashboardData.totalCups * 0.08)}g of caffeine`;

  document.getElementById("FirstCupData").textContent = firstDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + " " + firstDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById("LatestCupData").textContent = latestDateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + " " + latestDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (liveTimerInterval) clearInterval(liveTimerInterval);
  updateLiveClock();
  liveTimerInterval = setInterval(updateLiveClock, 1000);

  document.getElementById("LongestGapData").textContent = formatDuration(dashboardData.longestTimeBetweenTwoCupsInSeconds);
  document.getElementById("ShortestGapData").textContent = formatDuration(dashboardData.shortestTimeBetweenTwoCupsInSeconds);

  document.getElementById("MaxCupsData").textContent = `${dashboardData.maximalNumberOfCupsInOneDay} Cups`;
  const maxCupsDate = parseDateDDMMYYYYHHMMSS(dashboardData.latestMostFrequentDay);
  document.getElementById("MaxCupsHint").textContent = `On ${maxCupsDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`;

  let goldenHourStr = "0:00:00";
  let maxP = 0;
  probabilitiesData.forEach((item) => {
    const p = parseFloat(item.probability);
    if (p > maxP) {
      maxP = p;
      goldenHourStr = item["start time"];
    }
  });
  const goldenHour = parseInt(goldenHourStr.split(":")[0], 10);
  const goldenTime = new Date();
  goldenTime.setHours(goldenHour, 0, 0);
  const goldenEndTime = new Date();
  goldenEndTime.setHours(goldenHour + 1, 0, 0);

  const startStr = goldenTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endStr = goldenEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const goldenEl = document.getElementById("GoldenHourData");
  goldenEl.textContent = `${startStr} - ${endStr}`;
  goldenEl.style.fontSize = "1.2rem";

  // Build Histogram
  const histogramSvg = document.getElementById("ProbabilityHistogram");
  if (histogramSvg && probabilitiesData.length > 0) {
    histogramSvg.innerHTML = "";
    probabilitiesData.forEach((item, index) => {
      const p = parseFloat(item.probability);
      const maxH = 50;
      const barHeight = maxProbability > 0 ? (p / maxProbability) * maxH : 0;

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", index * 10);
      rect.setAttribute("y", 80 - barHeight);
      rect.setAttribute("width", 8);
      rect.setAttribute("height", Math.max(1, barHeight));
      rect.setAttribute("fill", "#E8882E");
      rect.setAttribute("rx", 2);
      rect.style.transition = "height 0.8s, y 0.8s";

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      const hourStr = item["start time"].split(":")[0].padStart(2, "0");
      const nextHourStr = ((parseInt(hourStr) + 1) % 24).toString().padStart(2, "0");
      text.textContent = `${hourStr}-${nextHourStr}`;

      const textX = index * 10 + 4;
      const textY = 80 - barHeight - 2;
      text.setAttribute("x", textX);
      text.setAttribute("y", textY);
      text.setAttribute("fill", "#a69182");
      text.setAttribute("font-size", "4px");
      text.setAttribute("font-weight", "500");
      text.setAttribute("text-anchor", "start");
      text.setAttribute("alignment-baseline", "middle");
      text.setAttribute("transform", `rotate(-90, ${textX}, ${textY})`);

      g.appendChild(rect);
      g.appendChild(text);
      histogramSvg.appendChild(g);
    });
  }

  // Volume
  const liters = (dashboardData.totalCups * 0.25).toFixed(1);
  const bathtubs = (liters / 80).toFixed(1); // avg bathtub is 80L
  document.getElementById("LiquidVolumeData").textContent = `${liters} Liters`;
  document.getElementById("BathtubHint").textContent = `~${bathtubs} Bathtubs 🛁`;
}

// Background DB Fetching & Crunching
async function fetchCoffeeDB() {
  try {
    const res = await fetch(`https://opensheet.elk.sh/${spreadsheetId}/${coffeeDbTabName}`);
    coffeeDbData = await res.json();
    processFullDB();
  } catch (e) {
    console.error("Error fetching full DB", e);
  }
}

function processFullDB() {
  if (!coffeeDbData || coffeeDbData.length === 0) return;

  let weekends = 0;
  let weekdays = 0;

  const seasonCount = { Winter: 0, Spring: 0, Summer: 0, Fall: 0 };
  const datesSet = new Set();

  coffeeDbData.forEach(row => {
    // Weekend Split (Friday & Saturday)
    if (row.Weekday === 'Friday' || row.Weekday === 'Saturday') weekends++;
    else weekdays++;

    // Season
    if (row.Day) {
      const month = parseInt(row.Day.split('-')[1], 10);
      if (month === 12 || month <= 2) seasonCount.Winter++;
      else if (month >= 3 && month <= 5) seasonCount.Spring++;
      else if (month >= 6 && month <= 8) seasonCount.Summer++;
      else seasonCount.Fall++;

      datesSet.add(row.Day.split(' ')[0]);
    }
  });

  // Update Split
  const total = weekends + weekdays;
  if (total > 0) {
    const wkdPct = Math.round((weekdays / total) * 100);
    const wendPct = Math.round((weekends / total) * 100);
    document.getElementById("WeekendSplitData").textContent = `${wkdPct}% / ${wendPct}%`;
  }

  // Peak Season
  let peakSeason = 'Winter';
  let maxSeasonVal = seasonCount.Winter;
  for (const [season, count] of Object.entries(seasonCount)) {
    if (count > maxSeasonVal) {
      maxSeasonVal = count;
      peakSeason = season;
    }
  }
  document.getElementById("PeakSeasonData").textContent = peakSeason;
  document.getElementById("PeakSeasonData").nextElementSibling.textContent = `W:${seasonCount.Winter} Sp:${seasonCount.Spring} Su:${seasonCount.Summer} F:${seasonCount.Fall}`;

  // Streak Calculation
  const sortedDates = Array.from(datesSet).map(d => {
    const p = d.split('-');
    return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0])).getTime();
  }).sort((a, b) => a - b);

  let maxStreak = 0;
  let currStreak = 1;
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 1; i < sortedDates.length; i++) {
    const diff = Math.round((sortedDates[i] - sortedDates[i - 1]) / dayMs);
    if (diff === 1) {
      currStreak++;
    } else {
      if (currStreak > maxStreak) maxStreak = currStreak;
      currStreak = 1;
    }
  }
  if (currStreak > maxStreak) maxStreak = currStreak;

  document.getElementById("JitterStreakData").textContent = `${maxStreak} Days`;
}

async function init() {
  try {
    const [dashRes, probRes] = await Promise.all([
      fetch(`https://opensheet.elk.sh/${spreadsheetId}/${dashboardTabName}`),
      fetch(`https://opensheet.elk.sh/${spreadsheetId}/${probabilityTabName}`)
    ]);

    const dashData = await dashRes.json();
    probabilitiesData = await probRes.json();

    dashboardData = {
      totalCups: dashData[0]["total cups"],
      firstRecordedCoffeeCup: dashData[0]["first recorded coffee cup date"],
      latestRecordedCoffeeCup: dashData[0]["latest recorded coffee cup date"],
      maximalNumberOfCupsInOneDay: dashData[0]["maximal number of cups in one day"],
      latestMostFrequentDay: dashData[0]["latest most frequent date"],
      shortestTimeBetweenTwoCupsInSeconds: parseInt(dashData[0]["shortest time between two cups in seconds"], 10),
      longestTimeBetweenTwoCupsInSeconds: parseInt(dashData[0]["longest time between two cups in seconds"], 10),
    };

    maxProbability = Math.max(...probabilitiesData.map(o => o.probability));

    updateDashboardUI();

    const timePicker = document.getElementById('timePicker');
    const now = new Date();
    const currentTimeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    timePicker.value = currentTimeStr;

    updateProbabilityDisplay(currentTimeStr);
    timePicker.addEventListener('change', (e) => {
      updateProbabilityDisplay(e.target.value);
    });

    // Navigation active state logic
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', function () {
        navItems.forEach(n => n.classList.remove('active'));
        this.classList.add('active');
      });
    });

    // Async load the full DB so UI doesn't block
    setTimeout(fetchCoffeeDB, 500);

  } catch (e) {
    console.error("Error fetching data:", e);
    document.querySelector(".wep").textContent = "Error loading data";
  }
}

document.addEventListener('DOMContentLoaded', init);
