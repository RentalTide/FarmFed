import React, { useEffect, useRef, useState } from 'react';
import { useIntl } from '../../../util/reactIntl';
import { useConfiguration } from '../../../context/configurationContext';

import css from './GeofenceTab.module.css';

const MAPBOX_DRAW_JS = 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.4.3/mapbox-gl-draw.js';
const MAPBOX_DRAW_CSS = 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.4.3/mapbox-gl-draw.css';

const loadScript = src => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const loadCSS = href => {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
};

const GeofenceTab = props => {
  const {
    polygon,
    updateInProgress,
    updateSuccess,
    error,
    onSaveGeofence,
    onClearSuccess,
  } = props;

  const intl = useIntl();
  const config = useConfiguration();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const drawRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (updateSuccess) {
      const timer = setTimeout(() => onClearSuccess(), 3000);
      return () => clearTimeout(timer);
    }
  }, [updateSuccess, onClearSuccess]);

  useEffect(() => {
    const mapboxToken = config.maps?.mapboxAccessToken || process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
    if (!mapboxToken || !mapContainerRef.current || mapLoaded) return;

    const initMap = async () => {
      loadCSS(MAPBOX_DRAW_CSS);
      await loadScript(MAPBOX_DRAW_JS);

      const mapboxgl = window.mapboxgl;
      const MapboxDraw = window.MapboxDraw;

      if (!mapboxgl || !MapboxDraw) return;

      mapboxgl.accessToken = mapboxToken;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-98.5795, 39.8283], // Center of US
        zoom: 3,
      });

      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
        },
      });

      map.addControl(draw);
      mapRef.current = map;
      drawRef.current = draw;

      map.on('load', () => {
        setMapLoaded(true);

        // Load existing polygon if present
        if (polygon) {
          const feature = {
            type: 'Feature',
            geometry: polygon,
            properties: {},
          };
          draw.add(feature);

          // Fit map to polygon bounds
          const coords = polygon.coordinates[0];
          const bounds = coords.reduce(
            (b, coord) => b.extend(coord),
            new mapboxgl.LngLatBounds(coords[0], coords[0])
          );
          map.fitBounds(bounds, { padding: 50 });
        }
      });
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        drawRef.current = null;
        setMapLoaded(false);
      }
    };
  }, [config.maps?.mapboxAccessToken]);

  const handleSave = () => {
    if (!drawRef.current) return;

    const data = drawRef.current.getAll();
    const polygonFeature = data.features.find(f => f.geometry.type === 'Polygon');

    if (polygonFeature) {
      onSaveGeofence({ polygon: polygonFeature.geometry });
    }
  };

  const handleClear = () => {
    if (drawRef.current) {
      drawRef.current.deleteAll();
    }
    onSaveGeofence({ polygon: null });
  };

  return (
    <div className={css.root}>
      <p className={css.description}>
        {intl.formatMessage({ id: 'AdminPage.geofenceDescription' })}
      </p>

      <div className={css.mapContainer} ref={mapContainerRef} />

      <div className={css.buttons}>
        <button
          className={css.saveButton}
          onClick={handleSave}
          disabled={updateInProgress}
        >
          {intl.formatMessage({ id: 'AdminPage.geofenceSaveButton' })}
        </button>
        <button
          className={css.clearButton}
          onClick={handleClear}
          disabled={updateInProgress}
        >
          {intl.formatMessage({ id: 'AdminPage.geofenceClearButton' })}
        </button>
      </div>

      {updateSuccess && (
        <p className={css.successMessage}>
          {intl.formatMessage({ id: 'AdminPage.geofenceSaveSuccess' })}
        </p>
      )}
      {error && (
        <p className={css.errorMessage}>
          {intl.formatMessage({ id: 'AdminPage.geofenceSaveError' })}
        </p>
      )}
    </div>
  );
};

export default GeofenceTab;
