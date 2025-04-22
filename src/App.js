import React, { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';
import * as XLSX from 'xlsx';
import mbxGeocoding from '@mapbox/mapbox-sdk/services/geocoding';

mapboxgl.accessToken = 'pk.eyJ1IjoiYmhhZHJhLXRrbWNlIiwiYSI6ImNtOWk0NzVtaTBieDAyanNjaWJxMTc3NjYifQ.rH6PfrQLpZ57ZZ-oZaGL_w';
const geocodingClient = mbxGeocoding({ accessToken: mapboxgl.accessToken });

function Header({ onSearch }) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const response = await geocodingClient
        .forwardGeocode({
          query: searchQuery,
          limit: 1,
        })
        .send();

      const match = response.body.features[0];
      if (match) {
        const [lng, lat] = match.center;
        if (lng < 76.5 || lng > 77.3 || lat < 9.2 || lat > 10.3) {
          alert('Error: Place not in the given map bounds.');
          return;
        }
        onSearch({ lat, lng });
      } else {
        alert('Location not found.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      alert('Error during geocoding.');
    }
  };

  return (
    <div className="header">
      <div className="title-container">
        <h1 className="badge-blue">ALPS</h1>
        <h2>Automated Landslide Prediction System</h2>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <i className="fas fa-search search-icon"></i>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search location..."
            className="search-bar"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </form>
    </div>
  );
}

function LatLongTimeLabel({ lat, lng }) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = new Date().toLocaleTimeString();
      setTime(currentTime);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="lat-long-time-label">
      <p><strong>Lat:</strong> {lat.toFixed(3)} | <strong>Long:</strong> {lng.toFixed(3)} | <strong>Time:</strong> {time}</p>
    </div>
  );
}

function Controls({ onZoomIn, onZoomOut }) {
  return (
    <div className="controls">
      <button onClick={onZoomIn}>+</button>
      <button onClick={onZoomOut}>-</button>
    </div>
  );
}

function CustomPopup({ lat, lng, locationName, onClose, riskStatus, soilType, rainfall }) {
  const getColor = (status) => {
    if (status === 'High Risk') return '#ff4d4d';
    if (status === 'Moderate Risk') return '#ffa500';
    return '#4caf50';
  };

  return (
    <div className="custom-popup">
      <button className="close-btn" onClick={onClose}>×</button>
      <strong>Location:</strong> {locationName}<br />
      <strong>Lat:</strong> {lat.toFixed(3)}<br />
      <strong>Long:</strong> {lng.toFixed(3)}<br />
      <strong>Rainfall:</strong> {rainfall}mm<br />
      <strong>Soil:</strong> {soilType}<br />
      <strong>Status:</strong>{' '}
      <span style={{ color: getColor(riskStatus) }}>{riskStatus}</span>
    </div>
  );
}

function SummaryCard({ lat, lng, riskStatus, soilType, rainfall }) {
  return (
    <div className="summary-card">
      <p><strong>Lat:</strong> {lat.toFixed(3)}</p>
      <p><strong>Long:</strong> {lng.toFixed(3)}</p>
      <p><strong>Rainfall:</strong> {rainfall}mm</p>
      <p><strong>Soil Type:</strong> {soilType}</p>
      <p><strong>Status:</strong> {riskStatus}</p>
    </div>
  );
}

function Footer() {
  return (
    <div className="footer">
      <p>© 2025 ALPS - Automated Landslide Prediction System</p>
    </div>
  );
}

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [coords, setCoords] = useState({ lat: 9.85, lng: 76.95 });
  const [showPopup, setShowPopup] = useState(false);
  const [points, setPoints] = useState({ type: 'FeatureCollection', features: [] });
  const [locationName, setLocationName] = useState('');
  const [riskStatus, setRiskStatus] = useState('Low Risk');
  const [soilType, setSoilType] = useState('Clay');
  const [rainfall, setRainfall] = useState(39);

  // Function to generate random soil types
  const generateRandomSoilType = () => {
    const soilTypes = ['Alluvial', 'Clay', 'Lateritic', 'Silty'];
    return soilTypes[Math.floor(Math.random() * soilTypes.length)];
  };

  // Function to generate random rainfall values
  const generateRandomRainfall = (status) => {
    const lowRiskRainfall = [39, 40.23, 45, 60.55, 58, 67];
    const highRiskRainfall = [70, 75, 82, 86, 69, 73.6, 78.12, 88.09];

    if (status === 'High Risk') {
      return highRiskRainfall[Math.floor(Math.random() * highRiskRainfall.length)];
    }

    return lowRiskRainfall[Math.floor(Math.random() * lowRiskRainfall.length)];
  };

  const getLocationName = async (lat, lng) => {
    try {
      const response = await geocodingClient.reverseGeocode({
        query: [lng, lat],
        limit: 1,
      }).send();
      return response.body.features[0]?.place_name || 'Unknown location';
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return 'Unknown location';
    }
  };

  const generateRandomRisk = () => {
    return Math.random() < 0.5 ? 'Low Risk' : 'Moderate Risk';
  };

  const determineRiskStatus = useCallback((lat, lng) => {
    const highRiskBounds = {
      latMin: 9.471,
      latMax: 10.176,
      lngMin: 76.690,
      lngMax: 77.257,
    };

    if (
      lat >= highRiskBounds.latMin &&
      lat <= highRiskBounds.latMax &&
      lng >= highRiskBounds.lngMin &&
      lng <= highRiskBounds.lngMax
    ) {
      return 'High Risk';
    }

    return generateRandomRisk();
  }, []);

  const handleMapClick = useCallback(async (e) => {
    const { lng, lat } = e.lngLat;
    setCoords({ lat, lng });
    setShowPopup(true);
    const name = await getLocationName(lat, lng);
    setLocationName(name);
    const risk = determineRiskStatus(lat, lng);
    setRiskStatus(risk);
    setSoilType(generateRandomSoilType());
    setRainfall(generateRandomRainfall(risk));  // Set rainfall based on risk status
  }, [determineRiskStatus]);

  const handleSearchLocation = async ({ lat, lng }) => {
    setCoords({ lat, lng });
    setShowPopup(true);
    const name = await getLocationName(lat, lng);
    setLocationName(name);
    const risk = determineRiskStatus(lat, lng);
    setRiskStatus(risk);
    setSoilType(generateRandomSoilType());
    setRainfall(generateRandomRainfall(risk));  // Set rainfall based on risk status
    map.current?.flyTo({ center: [lng, lat], zoom: 13 });
  };

  const loadExcelFile = () => {
    fetch('/Landslide_latlongonly.xlsx')
      .then((response) => response.arrayBuffer())
      .then((data) => {
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        console.log('Raw Excel data:', jsonData);

        const geojson = {
          type: 'FeatureCollection',
          features: jsonData
            .map((row) => {
              const lat = parseFloat(row.LATITUDE || row.Latitude || row.lat);
              const lng = parseFloat(row.LONGITUDE || row.Longitude || row.long);
              if (isNaN(lat) || isNaN(lng)) return null;
              return {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [lng, lat],
                },
              };
            })
            .filter(Boolean),
        };

        if (geojson.features.length === 0) {
          alert('No valid points found in Excel file.');
          setPoints({ type: 'FeatureCollection', features: [] });
        } else {
          console.log('Parsed GeoJSON points:', geojson);
          setPoints(geojson);  // Update state with valid GeoJSON
        }
      })
      .catch((error) => {
        console.error('Error loading Excel file:', error);
        alert('Error loading Excel data. Using test point.');
        setPoints({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [76.95, 9.85],
            },
          }],
        });
      });
  };

  useEffect(() => {
    loadExcelFile();
  }, []);

  useEffect(() => {
    if (map.current) return;

    const idukkiBounds = [
      [76.5, 9.2],
      [77.3, 10.3],
    ];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v11',
      center: [76.95, 9.85],
      zoom: 10,
      maxBounds: idukkiBounds,
    });

    map.current.on('click', handleMapClick);
  }, [handleMapClick]);

  useEffect(() => {
    if (!map.current || !points || !points.features || points.features.length === 0) return;

    map.current.on('load', () => {
      if (map.current.getSource('excel-points')) {
        map.current.getSource('excel-points').setData(points);
      } else {
        map.current.addSource('excel-points', {
          type: 'geojson',
          data: points,
        });

        map.current.addLayer({
          id: 'excel-points-layer',
          type: 'circle',
          source: 'excel-points',
          paint: {
            'circle-radius': 5,
            'circle-color': '#ff0000',
          },
        });
      }
    });
  }, [points]);

  return (
    <div className="app">
      <Header onSearch={handleSearchLocation} />
      <LatLongTimeLabel lat={coords.lat} lng={coords.lng} />
      <Controls onZoomIn={() => map.current?.zoomIn()} onZoomOut={() => map.current?.zoomOut()} />
      <SummaryCard lat={coords.lat} lng={coords.lng} riskStatus={riskStatus} soilType={soilType} rainfall={rainfall} />
      <div ref={mapContainer} className="map-placeholder" />
      <Footer />
      {showPopup && (
        <CustomPopup
          lat={coords.lat}
          lng={coords.lng}
          locationName={locationName}
          riskStatus={riskStatus}
          soilType={soilType}
          rainfall={rainfall}
          onClose={() => setShowPopup(false)}
        />
      )}
    </div>
  );
}

export default App;
