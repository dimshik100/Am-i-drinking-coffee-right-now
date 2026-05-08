const savedTheme = localStorage.getItem('coffee-theme') || 'espresso';
document.documentElement.setAttribute('data-theme', savedTheme);

const spreadsheetId = "1Q4Ia6WG8heKThDScF-5MIAPVdTZBPbjNS8BH4tfWkVM";
const dashboardTabName = "Dashboard_API";
const probabilityTabName = "Probability_API";
const coffeeDbTabName = "Coffee%20DB";
const weekdaysDistributionTabName = "Weekdays%20distribution";

let probabilitiesData = [];
let maxProbability = 0;
let dashboardData = {};
let weekdaysDistributionData = [];
let coffeeDbData = [];
let coffeeHeatmapData = {};
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

function animateValue(obj, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    obj.textContent = Math.floor(progress * (end - start) + start);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

function normalizeProbability(prob) {
  let normalized = (prob / maxProbability) * 100;
  // Cap at 99.42 to avoid displaying a flat 100% (float equality is unreliable, use threshold)
  if (normalized >= 99.99) normalized = 99.42;
  return normalized;
}

function getWEP(prob) {
  // Use > on min (not >=) so boundary values (e.g. 93) match exactly one bracket
  for (let w of wep) {
    if (prob > w.min && prob <= w.max) return w.text;
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

function updateProbabilityDisplay(timeStr) {
  const hours = parseInt(timeStr.split(":")[0], 10);
  if (!probabilitiesData[hours]) return;

  const prob = probabilitiesData[hours].probability;
  const normalized = normalizeProbability(prob);
  const wepText = getWEP(normalized);

  document.querySelector(".probability").textContent = normalized.toFixed(2);
  document.querySelector(".wep").textContent = wepText;

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

  const totalCupsEl = document.getElementById("TotalCupsData");
  animateValue(totalCupsEl, 0, parseInt(dashboardData.totalCups, 10), 1500);
  document.getElementById("CaffeineHint").innerHTML = `~${Math.round(dashboardData.totalCups * 0.08)}g of caffeine<br>(based on 80mg per cup)`;

  document.getElementById("FirstCupData").textContent = firstDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + " " + firstDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById("LatestCupData").textContent = latestDateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + " " + latestDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (liveTimerInterval) clearInterval(liveTimerInterval);
  updateLiveClock();
  liveTimerInterval = setInterval(updateLiveClock, 1000);

  document.getElementById("LongestGapData").textContent = formatDuration(dashboardData.longestTimeBetweenTwoCupsInSeconds);
  document.getElementById("ShortestGapData").textContent = formatDuration(dashboardData.shortestTimeBetweenTwoCupsInSeconds);

  document.getElementById("MaxCupsData").textContent = `${dashboardData.maximalNumberOfCupsInOneDay} Cups`;
  const maxCupsDate = parseDateDDMMYYYYHHMMSS(dashboardData.latestMostFrequentDay);
  document.getElementById("MaxCupsHint").textContent = `Most recently on ${maxCupsDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`;

  let maxWDayCups = 0;
  let maxWDay = "";
  weekdaysDistributionData.forEach(item => {
    const cups = parseInt(item["1"], 10);
    if (cups > maxWDayCups) {
      maxWDayCups = cups;
      maxWDay = item.Weekday;
    }
  });
  document.getElementById("MostCaffeinatedDayData").textContent = maxWDay;
  document.getElementById("MostCaffeinatedDayHint").textContent = `${maxWDayCups} total cups recorded`;

  // Weekday Histogram
  const weekdayOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const weekdaySvg = document.getElementById("WeekdayHistogram");
  if (weekdaySvg && weekdaysDistributionData.length > 0) {
    weekdaySvg.innerHTML = "";
    const sorted = weekdayOrder.map(day => {
      const found = weekdaysDistributionData.find(d => d.Weekday === day);
      return { day, cups: found ? parseInt(found["1"], 10) : 0 };
    });
    const maxCups = Math.max(...sorted.map(d => d.cups));
    const totalWidth = 240;
    const slotWidth = totalWidth / sorted.length;

    sorted.forEach(({ day, cups }, index) => {
      const isPeak = cups === maxCups;
      const maxH = 50;
      const barHeight = maxCups > 0 ? (cups / maxCups) * maxH : 0;
      const rectWidth = slotWidth * 0.95;
      const rectX = index * slotWidth + (slotWidth - rectWidth) / 2;

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", rectX);
      rect.setAttribute("y", 80 - barHeight);
      rect.setAttribute("width", rectWidth);
      rect.setAttribute("height", Math.max(1, barHeight));
      rect.setAttribute("fill", isPeak ? "#FFB347" : "#E8882E");
      rect.setAttribute("rx", 2);
      rect.style.transition = "height 0.8s, y 0.8s";

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.textContent = day.slice(0, 3).toUpperCase();
      const textX = rectX + rectWidth / 2;
      label.setAttribute("x", textX);
      label.setAttribute("y", 80 - barHeight - 4);
      label.setAttribute("fill", isPeak ? "#FFB347" : "#a69182");
      label.setAttribute("font-size", "8px");
      label.setAttribute("font-weight", isPeak ? "700" : "500");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("alignment-baseline", "bottom");

      const countLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      countLabel.textContent = cups;
      countLabel.setAttribute("x", textX);
      countLabel.setAttribute("y", 77);
      countLabel.setAttribute("fill", "#140c08");
      countLabel.setAttribute("font-size", "10px");
      countLabel.setAttribute("font-weight", "700");
      countLabel.setAttribute("text-anchor", "middle");
      countLabel.setAttribute("alignment-baseline", "bottom");

      g.appendChild(rect);
      g.appendChild(label);
      g.appendChild(countLabel);
      weekdaySvg.appendChild(g);
    });
  }

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
  const peakProbability = Math.max(...probabilitiesData.map(o => parseFloat(o.probability)));
  if (histogramSvg && probabilitiesData.length > 0) {
    histogramSvg.innerHTML = "";
    probabilitiesData.forEach((item, index) => {
      const p = parseFloat(item.probability);
      const maxH = 50;
      const barHeight = maxProbability > 0 ? (p / maxProbability) * maxH : 0;
      const isPeak = p === peakProbability;

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

      const totalWidth = 240;
      const slotWidth = totalWidth / probabilitiesData.length;
      const rectWidth = slotWidth * 0.9;
      const rectX = index * slotWidth + (slotWidth - rectWidth) / 2;

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", rectX);
      rect.setAttribute("y", 80 - barHeight);
      rect.setAttribute("width", rectWidth);
      rect.setAttribute("height", Math.max(1, barHeight));
      rect.setAttribute("fill", isPeak ? "#FFB347" : "#E8882E");
      rect.setAttribute("rx", 2);
      rect.style.transition = "height 0.8s, y 0.8s";
      if (isPeak) {
        rect.setAttribute("filter", "url(#peakGlow)");
      }

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      const hourStr = item["start time"].split(":")[0].padStart(2, "0");
      const nextHourStr = ((parseInt(hourStr) + 1) % 24).toString().padStart(2, "0");
      text.textContent = `${hourStr}-${nextHourStr}`;

      const textX = rectX + rectWidth / 2;
      const textY = 80 - barHeight - 2;
      text.setAttribute("x", textX);
      text.setAttribute("y", textY);
      text.setAttribute("fill", isPeak ? "#FFB347" : "#a69182");
      text.setAttribute("font-size", "7.5px");
      text.setAttribute("font-weight", isPeak ? "700" : "500");
      text.setAttribute("text-anchor", "start");
      text.setAttribute("alignment-baseline", "middle");
      text.setAttribute("transform", `rotate(-90, ${textX}, ${textY})`);

      g.appendChild(rect);
      g.appendChild(text);
      histogramSvg.appendChild(g);
    });
  }

  // Remove shimmer from cards populated by the initial dashboard API
  document.querySelectorAll('.card-data:not(#WeekendSplitData):not(#PeakSeasonData):not(#JitterStreakData):not(#AvgCupsData), .card-hint').forEach(el => {
    el.classList.remove('loading-shimmer');
  });

  // Volume
  const liters = (dashboardData.totalCups * 0.25).toFixed(1);
  const bathtubs = (liters / 80).toFixed(1); // avg bathtub is 80L
  document.getElementById("LiquidVolumeData").textContent = `${liters} Liters`;
  document.getElementById("BathtubHint").innerHTML = `~${bathtubs} Bathtubs 🛁<br>(based on 250ml cappuccino)`;
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
  const yearCounts = {};

  coffeeDbData.forEach(row => {
    // Weekend Split (Friday & Saturday)
    if (row.Weekday === 'Friday' || row.Weekday === 'Saturday') weekends++;
    else weekdays++;

    // Season & Year
    if (row.Day) {
      const month = parseInt(row.Day.split('-')[1], 10);
      if (month === 12 || month <= 2) seasonCount.Winter++;
      else if (month >= 3 && month <= 5) seasonCount.Spring++;
      else if (month >= 6 && month <= 8) seasonCount.Summer++;
      else seasonCount.Fall++;

      const year = row.Day.split('-')[2].substring(0, 4);
      yearCounts[year] = (yearCounts[year] || 0) + 1;

      const dateStr = row.Day.split(' ')[0]; // DD-MM-YYYY
      const dParts = dateStr.split('-');
      const yyyymmdd = `${dParts[2]}-${dParts[1]}-${dParts[0]}`;
      coffeeHeatmapData[yyyymmdd] = (coffeeHeatmapData[yyyymmdd] || 0) + 1;

      datesSet.add(dateStr);
    }
  });

  // Update Split
  const total = weekends + weekdays;
  if (total > 0) {
    const wkdPct = Math.round((weekdays / total) * 100);
    const wendPct = Math.round((weekends / total) * 100);
    const splitEl = document.getElementById("WeekendSplitData");
    if (splitEl) {
      splitEl.textContent = `${wkdPct}% / ${wendPct}%`;
      splitEl.classList.remove('loading-shimmer');
    }
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
  const peakEl = document.getElementById("PeakSeasonData");
  if (peakEl) {
    peakEl.textContent = peakSeason;
    peakEl.nextElementSibling.innerHTML = `Winter: ${seasonCount.Winter} &nbsp; Spring: ${seasonCount.Spring}<br>Summer: ${seasonCount.Summer} &nbsp; Fall: ${seasonCount.Fall}`;
    peakEl.classList.remove('loading-shimmer');
  }

  // Yearly Breakup
  const breakupEl = document.getElementById("YearlyBreakupData");
  if (breakupEl) {
    breakupEl.innerHTML = "";
    const maxYearCups = Math.max(...Object.values(yearCounts));
    const sortedYears = Object.keys(yearCounts).sort((a, b) => b - a);

    sortedYears.forEach(year => {
      const count = yearCounts[year];
      const pct = (count / maxYearCups) * 100;
      breakupEl.innerHTML += `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
          <div style="width: 45px; font-weight: 600;">${year}</div>
          <div style="flex-grow: 1; background: var(--card-border); height: 8px; border-radius: 4px; overflow: hidden;">
            <div style="width: ${pct}%; background: var(--accent); height: 100%; border-radius: 4px; transition: width 1s ease-out;"></div>
          </div>
          <div style="width: 40px; text-align: right; color: var(--text-muted); font-size: 0.9em;">${count}</div>
        </div>
      `;
    });
  }

  // Populate Heatmap Years
  const yearSelect = document.getElementById("HeatmapYearSelect");
  if (yearSelect) {
    yearSelect.innerHTML = "";
    const years = Object.keys(yearCounts).sort((a, b) => b - a);
    years.forEach(y => {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    });
    yearSelect.value = years.includes("2025") ? "2025" : years[0];

    // Ensure we only add the listener once
    const newSelect = yearSelect.cloneNode(true);
    yearSelect.parentNode.replaceChild(newSelect, yearSelect);
    newSelect.addEventListener("change", (e) => {
      renderHeatmap(e.target.value);
    });
    renderHeatmap(newSelect.value);
  }

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

  const streakEl = document.getElementById("JitterStreakData");
  if (streakEl) {
    streakEl.textContent = `${maxStreak} Days`;
    streakEl.classList.remove('loading-shimmer');
  }

  // Avg cups per day — calculated from actual unique days in the full DB
  const uniqueDayCount = datesSet.size;
  if (uniqueDayCount > 0) {
    const avgPerDay = (coffeeDbData.length / uniqueDayCount).toFixed(1);
    const avgCupsEl = document.getElementById("AvgCupsData");
    if (avgCupsEl) {
      avgCupsEl.textContent = `${avgPerDay} Cups`;
      avgCupsEl.classList.remove('loading-shimmer'); // Remove shimmer if it was added
    }
  }
}

function renderHeatmap(yearStr) {
  const container = document.getElementById('HeatmapContainer');
  if (!container) return;
  container.innerHTML = '';

  const year = parseInt(yearStr, 10);
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  const startDayOfWeek = startDate.getDay(); // 0 is Sunday
  for (let i = 0; i < startDayOfWeek; i++) {
    const emptySquare = document.createElement('div');
    emptySquare.className = 'heatmap-square';
    emptySquare.style.opacity = '0';
    container.appendChild(emptySquare);
  }

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const yStr = d.getFullYear();
    const mStr = pad(d.getMonth() + 1);
    const dayStr = pad(d.getDate());
    const ymd = `${yStr}-${mStr}-${dayStr}`;

    const count = coffeeHeatmapData[ymd] || 0;
    let level = 0;
    if (count === 1) level = 1;
    else if (count >= 2 && count <= 3) level = 2;
    else if (count >= 4 && count <= 5) level = 3;
    else if (count > 5) level = 4;

    const square = document.createElement('div');
    square.className = `heatmap-square level-${level}`;
    square.title = `${ymd}: ${count} cups`;
    container.appendChild(square);
  }
}

async function init() {
  try {
    const [dashRes, probRes, weekdaysRes] = await Promise.all([
      fetch(`https://opensheet.elk.sh/${spreadsheetId}/${dashboardTabName}`),
      fetch(`https://opensheet.elk.sh/${spreadsheetId}/${probabilityTabName}`),
      fetch(`https://opensheet.elk.sh/${spreadsheetId}/${weekdaysDistributionTabName}`)
    ]);

    const dashData = await dashRes.json();
    probabilitiesData = await probRes.json();
    weekdaysDistributionData = await weekdaysRes.json();

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

document.addEventListener('DOMContentLoaded', () => {
  // Apply shimmer to all stat cards while data loads
  document.querySelectorAll('.card-data, .card-hint').forEach(el => {
    el.classList.add('loading-shimmer');
  });

  const themeSelect = document.getElementById('ThemeSelect');
  if (themeSelect) {
    themeSelect.value = savedTheme;
    themeSelect.addEventListener('change', (e) => {
      const theme = e.target.value;
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('coffee-theme', theme);
    });
  }

  init();
});
