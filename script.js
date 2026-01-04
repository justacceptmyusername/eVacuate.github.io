let currentAlert = null;
let reports = [];
let blockedRoutes = [];

function showView(view) {
  document.getElementById('citizenView').classList.add('hidden');
  document.getElementById('adminView').classList.add('hidden');

  if (view === 'citizen') {
    document.getElementById('citizenView').classList.remove('hidden');
  } else {
    document.getElementById('adminView').classList.remove('hidden');
  }
}


function sendAlert() {
  const message = document.getElementById('adminAlert').value;
  currentAlert = message;
  document.getElementById('alertMessage').innerText = message;
}


navigator.geolocation.getCurrentPosition(
  pos => {
    document.getElementById('locationStatus').innerText =
      `Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`;
  },
  () => {
    document.getElementById('locationStatus').innerText = "Location unavailable";
  }
);


function calculateRoute() {
  const routes = [
    "Main Road → Barangay Hall",
    "River Road → Elementary School",
    "Highway → Evacuation Center"
  ];

  const safeRoutes = routes.filter(r => !blockedRoutes.includes(r));
  const list = document.getElementById('routeList');
  list.innerHTML = "";

  safeRoutes.forEach(r => {
    const li = document.createElement('li');
    li.innerText = r;
    list.appendChild(li);
  });
}


function submitReport() {
  const type = document.getElementById('reportType').value;
  const report = {
    type,
    time: new Date().toLocaleTimeString()
  };

  reports.push(report);
  blockedRoutes.push("River Road → Elementary School");
  updateReports();
}

function updateReports() {
  const list = document.getElementById('reportList');
  list.innerHTML = "";

  reports.forEach(r => {
    const li = document.createElement('li');
    li.innerText = `${r.time} - ${r.type}`;
    list.appendChild(li);
  });
}

function switchView(view) {
  document.getElementById("citizen").classList.add("hidden");
  document.getElementById("admin").classList.add("hidden");

  document.getElementById(view).classList.remove("hidden");
}
