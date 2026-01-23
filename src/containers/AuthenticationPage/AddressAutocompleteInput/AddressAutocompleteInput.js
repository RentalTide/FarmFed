import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Field, useForm } from 'react-final-form';
import debounce from 'lodash/debounce';
import classNames from 'classnames';

import { validateGeofence } from '../../../util/api';

import css from './AddressAutocompleteInput.module.css';

const DEBOUNCE_WAIT = 300;

const parseAddressComponents = prediction => {
  const context = prediction.context || [];
  const result = { city: '', state: '', zip: '', country: '' };

  context.forEach(item => {
    if (item.id.startsWith('place')) {
      result.city = item.text;
    } else if (item.id.startsWith('region')) {
      result.state = item.short_code ? item.short_code.replace(/^[A-Z]{2}-/, '') : item.text;
    } else if (item.id.startsWith('postcode')) {
      result.zip = item.text;
    } else if (item.id.startsWith('country')) {
      result.country = item.short_code ? item.short_code.toUpperCase() : item.text;
    }
  });

  // Build street from address number + text
  const houseNumber = prediction.address || '';
  const streetName = prediction.text || '';
  result.street = houseNumber ? `${houseNumber} ${streetName}` : streetName;

  return result;
};

const AddressAutocompleteInputComponent = props => {
  const { input, meta, label, placeholder, id, className, geofenceNoticeText } = props;
  const form = useForm();
  const [predictions, setPredictions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [geofenceNotice, setGeofenceNotice] = useState(null);
  const containerRef = useRef(null);

  const fetchPredictions = useCallback(
    debounce(query => {
      if (!query || query.length < 3) {
        setPredictions([]);
        return;
      }

      const libLoaded = typeof window !== 'undefined' && window.mapboxSdk && window.mapboxgl;
      if (!libLoaded || !window.mapboxgl.accessToken) {
        return;
      }

      const client = window.mapboxSdk({ accessToken: window.mapboxgl.accessToken });
      client.geocoding
        .forwardGeocode({
          query,
          types: ['address'],
          limit: 5,
          countries: ['US', 'CA'],
        })
        .send()
        .then(response => {
          setPredictions(response.body.features || []);
          setShowDropdown(true);
          setHighlightedIndex(-1);
        })
        .catch(() => {
          setPredictions([]);
        });
    }, DEBOUNCE_WAIT),
    []
  );

  useEffect(() => {
    return () => {
      fetchPredictions.cancel();
    };
  }, [fetchPredictions]);

  const checkGeofence = async address => {
    try {
      const result = await validateGeofence(address);
      if (!result.valid) {
        setGeofenceNotice(geofenceNoticeText);
        form.change('outsideDeliveryZone', true);
      } else {
        setGeofenceNotice(null);
        form.change('outsideDeliveryZone', false);
      }
    } catch (e) {
      // Don't show notice on error
      form.change('outsideDeliveryZone', false);
    }
  };

  const handleChange = e => {
    const value = e.target.value;
    input.onChange(value);
    setGeofenceNotice(null);
    fetchPredictions(value);
  };

  const handleSelect = prediction => {
    const components = parseAddressComponents(prediction);
    input.onChange(components.street);
    form.change('city', components.city);
    form.change('state', components.state);
    form.change('zip', components.zip);
    if (components.country) {
      form.change('country', components.country);
    }
    setPredictions([]);
    setShowDropdown(false);

    // Validate geofence immediately
    checkGeofence({
      street: components.street,
      city: components.city,
      state: components.state,
      zip: components.zip,
      country: components.country || 'US',
    });
  };

  const handleKeyDown = e => {
    if (!showDropdown || predictions.length === 0) return;

    if (e.keyCode === 40) {
      // Arrow down
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, predictions.length - 1));
    } else if (e.keyCode === 38) {
      // Arrow up
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.keyCode === 13 && highlightedIndex >= 0) {
      // Enter
      e.preventDefault();
      handleSelect(predictions[highlightedIndex]);
    } else if (e.keyCode === 27) {
      // Escape
      setShowDropdown(false);
    }
  };

  const handleBlur = () => {
    // Delay hiding dropdown to allow click on prediction
    setTimeout(() => {
      setShowDropdown(false);
      input.onBlur();
    }, 200);
  };

  const touched = meta.touched;
  const error = meta.error;
  const hasError = touched && error;

  return (
    <div className={classNames(css.root, className)} ref={containerRef}>
      {label ? (
        <label className={css.label} htmlFor={id}>
          {label}
        </label>
      ) : null}
      <input
        id={id}
        className={css.input}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={input.value || ''}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => predictions.length > 0 && setShowDropdown(true)}
        onBlur={handleBlur}
      />
      {showDropdown && predictions.length > 0 ? (
        <ul className={css.predictions}>
          {predictions.map((prediction, index) => (
            <li
              key={prediction.id}
              className={classNames(css.prediction, {
                [css.predictionHighlighted]: index === highlightedIndex,
              })}
              onMouseDown={e => {
                e.preventDefault();
                handleSelect(prediction);
              }}
            >
              {prediction.place_name}
            </li>
          ))}
        </ul>
      ) : null}
      {geofenceNotice ? <div className={css.geofenceNotice}>{geofenceNotice}</div> : null}
      {hasError ? <span className={css.error}>{error}</span> : null}
    </div>
  );
};

const FieldAddressAutocompleteInput = props => {
  return <Field component={AddressAutocompleteInputComponent} {...props} />;
};

export default FieldAddressAutocompleteInput;
