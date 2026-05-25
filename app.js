// -------------------------------------------------------
// 1. MAP INITIALIZATION
// -------------------------------------------------------

const map = L.map("map", {
  zoomControl: true,
  attributionControl: false
}).setView([41.390, 2.168], 13);

window.leafletMap = map;
L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  maxZoom: 20
}).addTo(map);


// -------------------------------------------------------
// 2. LAYER GROUPS
// -------------------------------------------------------

const layers = {
  buildings: L.layerGroup().addTo(map),
  districts: L.layerGroup().addTo(map),
  deficit: L.layerGroup(),
  surplus: L.layerGroup(),
  flows: L.layerGroup()
};

window.leafletMap = map;
window.appLayers = layers;

// -------------------------------------------------------
// 3. STYLE FUNCTIONS
// -------------------------------------------------------

function getBuildingColor(score) {

  if (score >= 85) return "#ffe066";   // excellent
  if (score >= 70) return "#ffb366";   // good
  return "#9bb6c9";                    // moderate

}

function buildingStyle(feature) {
  const score = feature.properties.suitability_score;

  return {
    color: getBuildingColor(score),
    weight: 0.8,
    fillColor: getBuildingColor(score),
    fillOpacity: 0.82,
    opacity: 0.95
  };
}
let rooftopClicked = false;

function highlightBuilding(layer) {

  layer.bringToFront();
  layer.on("click", function(e) {
    L.DomEvent.stopPropagation(e);
  rooftopClicked = true;

  if (selectedBuilding) {
    buildingLayer.resetStyle(selectedBuilding);
  }

  selectedBuilding = layer;

  layer.setStyle({
    weight: 4,
    color: "#ffffff",
    fillOpacity: 1
  });
layer.on("mouseover", function () {

  layer.setStyle({
    weight: 2,
    color: "#ffffff",
    fillOpacity: 0.82
  });

  if (layer.getElement()) {
    layer.getElement().style.cursor = "pointer";
  }

});

layer.on("mouseout", function () {

  buildingLayer.resetStyle(layer);

});
  document
    .getElementById("rightPanelContent")
    .classList.remove("collapsed");

  updateFeaturePanel(p);
});

}
function resetBuilding(layer) {

  buildingLayer.resetStyle(layer);

  layer.setStyle({
    opacity: 0.95
  });

}

// -------------------------------------------------------
// 4. BUILDING LAYER
// -------------------------------------------------------
let selectedBuilding = null;
let buildingLayer = null;

fetch("data/barcelona_buildings.geojson")
  .then(response => response.json())
  .then(data => {
data.features.forEach(feature => {

  const p = feature.properties;

  // pseudo roof area
  const roofArea = Math.floor(120 + Math.random() * 900);

  // estimated capacity
  const capacity = Math.round(roofArea * 0.18);

  // yearly production
  const production = Math.round(capacity * 1.45);

  // suitability score
  let score = 55;

  if (roofArea > 700) score += 25;
  else if (roofArea > 400) score += 18;
  else if (roofArea > 200) score += 10;

  if (capacity > 120) score += 10;
  if (production > 180) score += 5;

  score = Math.min(score, 98);

  p.roof_area_m2 = roofArea;
  p.capacity_kw = capacity;
  p.production_mwh_year = production;
  p.suitability_score = score;

});
    buildingLayer = L.geoJSON(data, {

      style: function(feature) {

  return {
    color: getBuildingColor(feature.properties.suitability_score),
    weight: 1,
    fillColor: getBuildingColor(feature.properties.suitability_score),
    fillOpacity: 0.55
  };

},

      onEachFeature: function(feature, layer) {

        layer.on("mouseover", function() {

          layer.setStyle({
  weight: 3.5,
  color: "#ffffff",
  fillOpacity: 0.95
});

layer.bringToFront();
        });

        layer.on("mouseout", function() {

          if (selectedBuilding !== layer) {
            buildingLayer.resetStyle(layer);
          }

        });

        layer.on("click", function(e) {
  L.DomEvent.stopPropagation(e);

  if (selectedBuilding) {
    buildingLayer.resetStyle(selectedBuilding);
  }

  selectedBuilding = layer;

  layer.setStyle({
    weight: 4,
    color: "#ffffff",
    fillOpacity: 1
  });

  updateFeaturePanel(feature.properties);

});

      }

    }).addTo(layers.buildings);
const rooftopStats = {
  count: 0,
  production: 0
};

buildingLayer.eachLayer(layer => {
  const p = layer.feature.properties;

  if (p.suitability_score >= 70) {
    rooftopStats.count += 1;
    rooftopStats.production += p.production_mwh_year;
  }
});

const districtDemand = 5200;
const coverage = Math.round((rooftopStats.production / districtDemand) * 100);
const sharedPotential = Math.round(rooftopStats.production * 0.28);

document.getElementById("kpi-rooftops").textContent = rooftopStats.count;
document.getElementById("kpi-production").textContent =
  Math.round(rooftopStats.production) + " MWh";

document.getElementById("kpi-co2").textContent = coverage + "%";
document.getElementById("kpi-households").textContent =
  sharedPotential + " MWh";
    map.fitBounds(buildingLayer.getBounds());

  });


// -------------------------------------------------------
// 5. SIMPLE DISTRICT / BALANCE / FLOW LAYERS
// These are temporary. Later we replace them with real GeoJSON.
// -------------------------------------------------------

const districtPolygon = L.polygon([
  [41.383, 2.145],
  [41.410, 2.145],
  [41.418, 2.190],
  [41.390, 2.205],
  [41.370, 2.170]
], {
  color: "#dffaff",
  weight: 2,
  dashArray: "6,4",
  fillOpacity: 0.04
}).bindPopup("Study area / district boundary");

districtPolygon.addTo(layers.districts);

const deficitZone = L.circle([41.389, 2.174], {
  radius: 480,
  color: "#ff6b6b",
  fillColor: "#ff6b6b",
  fillOpacity: 0.16,
  weight: 2,
  interactive: false
});

deficitZone.addTo(layers.deficit);


const surplusZone = L.circle([41.398, 2.165], {
  radius: 480,
  color: "#69db7c",
  fillColor: "#69db7c",
  fillOpacity: 0.16,
  weight: 2,
  interactive: false
});

surplusZone.addTo(layers.surplus);


const flowLine = L.polyline([
  [41.398, 2.165],
  [41.389, 2.174]
], {
  color: "#9b5cff",
  weight: 5,
  opacity: 1,
  dashArray: "12,14",
  className: "energy-flow-line",
  interactive: false
});

flowLine.addTo(layers.flows);
// -------------------------------------------------------
// 6. PANEL UPDATE
// -------------------------------------------------------

function updateFeaturePanel(p) {

  const osmId = p["@id"] || p.id || "OSM building";
  const rawBuildingType = p.building || "building";

const buildingType =
  rawBuildingType === "yes"
    ? "Urban Rooftop"
    : rawBuildingType;

  const score = p.suitability_score || Math.floor(65 + Math.random() * 30);
  const roofArea = p.roof_area_m2 || Math.floor(180 + Math.random() * 620);
  const capacity = p.capacity_kw || Math.round(roofArea * 0.16);
  const production = p.production_mwh_year || Math.round(capacity * 1.35);
  // KPI CALCULATIONS

const rawType = (buildingType || "").toLowerCase();

let roofType = buildingType;

if (
  rawType.includes("yes") ||
  rawType.includes("residential") ||
  rawType.includes("apartments") ||
  rawType.includes("apartment") ||
  rawType.includes("house") ||
  rawType.includes("roof")
) {
  roofType = "Urban Rooftop";
}
function calculateRoofKPIs(area) {
  const roofArea = Number(area) || 80;

  const usableArea = roofArea * 0.65;
  const capacityKW = usableArea / 6;
  const annualProductionKWh = capacityKW * 1250;
  const co2SavedKg = annualProductionKWh * 0.35;
  const households = annualProductionKWh / 2700;

  return {
    roofArea: roofArea.toFixed(0),
    capacity: capacityKW.toFixed(1),
    production: annualProductionKWh.toFixed(0),
    co2: co2SavedKg.toFixed(0),
    households: households.toFixed(1)
  };
}
document.getElementById("rightPanelContent").classList.remove("collapsed");
document.getElementById("feature-title").textContent =
  roofType + " · " + osmId;

  document.getElementById("feature-score").textContent =
    score + "/100";

const kpi = calculateRoofKPIs(roofArea);

document.getElementById("feature-area").textContent =
  `${kpi.roofArea} m²`;

document.getElementById("feature-capacity").textContent =
  `${kpi.capacity} kW`;

document.getElementById("feature-production").textContent =
  `${kpi.production} kWh/year`;

document.getElementById("feature-co2").textContent =
  `${kpi.co2} kg/year`;

document.getElementById("feature-households").textContent =
  `${kpi.households}`;

let priority = "Medium";

if (score >= 85) {
  priority = "Very High";
} else if (score >= 70) {
  priority = "High";
}

document.getElementById("feature-co2").textContent =
  co2 + " t/year";

document.getElementById("feature-households").textContent =
  households;

document.getElementById("feature-priority").textContent =
  priority;

  let action = "Suitable for detailed PV feasibility analysis.";

  if (score >= 85) {
    action = "Excellent candidate. Prioritize this rooftop for the first solar installation phase.";
  } else if (score >= 70) {
    action = "Good candidate. Include this rooftop after public/high-capacity roofs.";
  } else {
    action = "Moderate candidate. Keep visible, but do not prioritize before higher-score rooftops.";
  }

 document.getElementById("feature-action").textContent = action;

// ---------------------------------------------------
// ENERGY CONTEXT
// ---------------------------------------------------

const dot = document.getElementById("energyDot");
const zoneType = document.getElementById("energyZoneType");
const zoneText = document.getElementById("energyContextText");

if (score >= 80) {
  dot.style.background = "#69db7c";

  zoneType.textContent = "Surplus zone";

  zoneText.textContent =
    "High solar potential. Suitable for local sharing or export to nearby deficit areas.";
} else {
  dot.style.background = "#ff6b6b";

  zoneType.textContent = "Deficit zone";

  zoneText.textContent =
    "Local demand may be higher than rooftop production. Connection to surplus areas is recommended.";
}

}



// -------------------------------------------------------
// 7. LAYER TOGGLES
// -------------------------------------------------------

document.querySelectorAll("[data-layer]").forEach(button => {
  button.addEventListener("click", () => {
    const key = button.dataset.layer;
    const isVisible = map.hasLayer(layers[key]);

    if (isVisible) {
      map.removeLayer(layers[key]);
      button.classList.remove("active");
      button.querySelector(".toggle").classList.remove("on");
    } else {
      map.addLayer(layers[key]);
      button.classList.add("active");
      button.querySelector(".toggle").classList.add("on");
    }
  });
});


// -------------------------------------------------------
// 8. ROOFTOP FILTERS
// -------------------------------------------------------

// -------------------------------------------------------
// 8. ROOFTOP FILTERS
// -------------------------------------------------------

document.querySelectorAll("[data-filter]").forEach(button => {

  button.addEventListener("click", () => {

    // close selected feature panel
    document
      .getElementById("rightPanelContent")
      .classList.add("collapsed");

    // reset selected rooftop
    if (selectedBuilding) {
      buildingLayer.resetStyle(selectedBuilding);
      selectedBuilding = null;
    }

    // active button state
    document
      .querySelectorAll("[data-filter]")
      .forEach(b => b.classList.remove("active"));

    button.classList.add("active");

    const filter = button.dataset.filter;

    // -----------------------------------
    // ALL ROOFTOPS
    // -----------------------------------

    if (filter === "all") {

      buildingLayer.eachLayer(layer => {

        layer.addTo(map);

        layer.setStyle({
          fillOpacity: 0.58,
          opacity: 0.95,
          weight: 1
        });

      });

      return;
    }

    // -----------------------------------
    // FILTERED ROOFTOPS
    // -----------------------------------

    buildingLayer.eachLayer(layer => {

      const p = layer.feature.properties;

      let show = true;

      // excellent suitability
      if (filter === "excellent") {

        show = p.suitability_score >= 85;

      }

      // good suitability
      if (filter === "good") {

        show =
          p.suitability_score >= 70 &&
          p.suitability_score < 85;

      }

      // strategic rooftops
      if (filter === "public") {

        show =
          p.roof_area_m2 >= 500 ||
          p.capacity_kw >= 90 ||
          p.production_mwh_year >= 130;

      }

      // SHOW
      if (show) {

        layer.addTo(map);

        layer.setStyle({
          fillOpacity: 0.58,
          opacity: 0.95,
          weight: 1
        });

      }

      // HIDE
      else {

        map.removeLayer(layer);

      }

    });

  });

});

// -------------------------------------------------------
// 9. TAB MODES
// -------------------------------------------------------

document.querySelectorAll("[data-mode]").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll("[data-mode]").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    const mode = tab.dataset.mode;
    const about = document.getElementById("about");

    about.style.display = mode === "about" ? "block" : "none";
    document.body.classList.toggle("about-mode", mode === "about");

    if (mode === "rooftop") {
      setLayerState(["buildings", "districts"]);

      buildingLayer.eachLayer(layer => {
        layer.setStyle({
          fillOpacity: 0.58,
          opacity: 0.95
        });
      });

      document.getElementById("feature-action").textContent =
        "Rooftop mode: identify buildings with the highest solar installation potential.";
    }

    if (mode === "balance") {
      setLayerState(["buildings", "districts", "deficit", "surplus"]);

      buildingLayer.eachLayer(layer => {
        layer.setStyle({
          fillOpacity: 0.18,
          opacity: 0.35
        });
      });

      document.getElementById("feature-action").textContent =
        "Energy balance mode: identify surplus and deficit districts for local energy-sharing strategies.";
    }

    if (mode === "network") {
  setLayerState(["buildings", "districts", "deficit", "surplus", "flows"]);

  buildingLayer.eachLayer(layer => {
    layer.setStyle({
      fillOpacity: 0.08,
      opacity: 0.18,
      weight: 0.6
    });
  });

  deficitZone.setStyle({
    fillOpacity: 0.28,
    opacity: 1,
    weight: 3
  });

  surplusZone.setStyle({
    fillOpacity: 0.28,
    opacity: 1,
    weight: 3
  });

  flowLine.setStyle({
    opacity: 1,
    weight: 6
  });

  document.getElementById("feature-action").textContent =
  "Energy Network Scenario: surplus zones can share renewable energy with nearby deficit areas. The animated flow line represents a possible local energy-sharing connection.";
    }

  });
});

function setLayerState(activeKeys) {
  Object.keys(layers).forEach(key => {
    const shouldShow = activeKeys.includes(key);

    if (shouldShow && !map.hasLayer(layers[key])) map.addLayer(layers[key]);
    if (!shouldShow && map.hasLayer(layers[key])) map.removeLayer(layers[key]);

    const button = document.querySelector(`[data-layer="${key}"]`);

    if (button) {
      button.classList.toggle("active", shouldShow);
      button.querySelector(".toggle").classList.toggle("on", shouldShow);
    }
  });
}
const kpiToggle = document.getElementById("kpiToggle");
const kpiBar = document.getElementById("kpiBar");

kpiToggle.addEventListener("click", () => {
  kpiBar.classList.toggle("collapsed");
});
const rightPanelToggle = document.getElementById("rightPanelToggle");
const rightPanelContent = document.getElementById("rightPanelContent");

rightPanelToggle.addEventListener("click", () => {
  rightPanelContent.classList.toggle("collapsed");
});
const filterToggle = document.getElementById("filterToggle");
const filterGroup = document.getElementById("filterGroup");

filterToggle.addEventListener("click", () => {
  filterGroup.classList.toggle("collapsed");
});
map.on("click", function (e) {

  let clickedOnBuilding = false;

  buildingLayer.eachLayer(function (layer) {

    if (layer.getBounds && layer.getBounds().contains(e.latlng)) {
      clickedOnBuilding = true;
    }

  });

  if (!clickedOnBuilding) {

    document
      .getElementById("rightPanelContent")
      .classList.add("collapsed");

    if (selectedBuilding) {
      buildingLayer.resetStyle(selectedBuilding);
      selectedBuilding = null;
    }

  }

});
document.addEventListener("click", function(e) {
  const about = document.getElementById("about");
  const aboutBtn = document.querySelector('[data-mode="about"]');

  if (
    document.body.classList.contains("about-mode") &&
    !about.contains(e.target) &&
    !aboutBtn.contains(e.target)
  ) {
    about.style.display = "none";
    document.body.classList.remove("about-mode");
  }
});
map.on("click", function () {
  document
    .getElementById("rightPanelContent")
    .classList.add("collapsed");
});
