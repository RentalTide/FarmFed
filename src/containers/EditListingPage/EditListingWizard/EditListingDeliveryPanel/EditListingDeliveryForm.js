import React, { useEffect } from 'react';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';

// Import configs and util modules
import appSettings from '../../../../config/settings';
import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import { propTypes } from '../../../../util/types';
import { displayDeliveryPickup, displayDeliveryShipping } from '../../../../util/configHelpers';
import {
  autocompleteSearchRequired,
  autocompletePlaceSelected,
  composeValidators,
  required,
} from '../../../../util/validators';

// Import shared components
import {
  Form,
  FieldLocationAutocompleteInput,
  Button,
  FieldCurrencyInput,
  FieldTextInput,
  FieldCheckbox,
} from '../../../../components';

// Import modules from this directory
import css from './EditListingDeliveryForm.module.css';

const identity = v => v;

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const VendorPickupScheduleFields = ({ formId, values, form, intl }) => {
  const schedule = values.pickupSchedule || [];

  const addSlot = () => {
    const newSchedule = [...schedule, { day: 'monday', startTime: '08:00', endTime: '12:00' }];
    form.change('pickupSchedule', newSchedule);
  };

  const removeSlot = index => {
    const newSchedule = schedule.filter((_, i) => i !== index);
    form.change('pickupSchedule', newSchedule);
  };

  const updateSlot = (index, field, value) => {
    const newSchedule = schedule.map((slot, i) =>
      i === index ? { ...slot, [field]: value } : slot
    );
    form.change('pickupSchedule', newSchedule);
  };

  return (
    <div className={css.pickupScheduleSection}>
      <h4 className={css.pickupScheduleTitle}>
        <FormattedMessage id="EditListingDeliveryForm.pickupScheduleTitle" />
      </h4>
      <p className={css.pickupScheduleDescription}>
        <FormattedMessage id="EditListingDeliveryForm.pickupScheduleDescription" />
      </p>

      {schedule.map((slot, index) => (
        <div key={index} className={css.pickupSlot}>
          <select
            className={css.pickupDaySelect}
            value={slot.day}
            onChange={e => updateSlot(index, 'day', e.target.value)}
          >
            {DAYS_OF_WEEK.map(d => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
          <input
            type="time"
            className={css.pickupTimeInput}
            value={slot.startTime}
            onChange={e => updateSlot(index, 'startTime', e.target.value)}
          />
          <span className={css.pickupTimeSeparator}>-</span>
          <input
            type="time"
            className={css.pickupTimeInput}
            value={slot.endTime}
            onChange={e => updateSlot(index, 'endTime', e.target.value)}
          />
          <button
            type="button"
            className={css.pickupRemoveSlot}
            onClick={() => removeSlot(index)}
          >
            &times;
          </button>
        </div>
      ))}

      <button type="button" className={css.pickupAddSlot} onClick={addSlot}>
        <FormattedMessage id="EditListingDeliveryForm.addPickupSlot" />
      </button>
    </div>
  );
};

/**
 * The EditListingDeliveryForm component.
 *
 * @component
 * @param {Object} props - The component props
 * @param {string} props.formId - The form ID
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {Function} props.onSubmit - The submit function
 * @param {string} props.saveActionMsg - The save action message
 * @param {Object} props.selectedPlace - The selected place
 * @param {string} props.marketplaceCurrency - The marketplace currency
 * @param {boolean} props.hasStockInUse - Whether the stock is in use
 * @param {boolean} props.disabled - Whether the form is disabled
 * @param {boolean} props.ready - Whether the form is ready
 * @param {boolean} props.updated - Whether the form is updated
 * @param {boolean} props.updateInProgress - Whether the form is in progress
 * @param {Object} props.fetchErrors - The fetch errors
 * @param {propTypes.error} [props.fetchErrors.showListingsError] - The show listings error
 * @param {propTypes.error} [props.fetchErrors.updateListingError] - The update listing error
 * @param {boolean} props.autoFocus - Whether the form is auto focused
 * @returns {JSX.Element} The EditListingDeliveryForm component
 */
export const EditListingDeliveryForm = props => (
  <FinalForm
    {...props}
    render={formRenderProps => {
      const {
        formId = 'EditListingDeliveryForm',
        form,
        autoFocus,
        className,
        disabled,
        ready,
        handleSubmit,
        pristine,
        invalid,
        listingTypeConfig,
        marketplaceCurrency,
        allowOrdersOfMultipleItems = false,
        saveActionMsg,
        updated,
        updateInProgress,
        fetchErrors,
        values,
      } = formRenderProps;
      const intl = useIntl();

      // This is a bug fix for Final Form.
      // Without this, React will return a warning:
      //   "Cannot update a component (`ForwardRef(Field)`)
      //   while rendering a different component (`ForwardRef(Field)`)"
      // This seems to happen because validation calls listeneres and
      // that causes state to change inside final-form.
      // https://github.com/final-form/react-final-form/issues/751
      //
      // TODO: it might not be worth the trouble to show these fields as disabled,
      // if this fix causes trouble in future dependency updates.
      const { pauseValidation, resumeValidation } = form;
      pauseValidation(false);
      useEffect(() => resumeValidation(), [values]);

      const displayShipping = displayDeliveryShipping(listingTypeConfig);
      const displayPickup = displayDeliveryPickup(listingTypeConfig);
      const displayMultipleDelivery = displayShipping && displayPickup;
      const shippingEnabled = displayShipping && values.deliveryOptions?.includes('shipping');
      const pickupEnabled = displayPickup && values.deliveryOptions?.includes('pickup');

      const addressRequiredMessage = intl.formatMessage({
        id: 'EditListingDeliveryForm.addressRequired',
      });
      const addressNotRecognizedMessage = intl.formatMessage({
        id: 'EditListingDeliveryForm.addressNotRecognized',
      });

      const optionalText = intl.formatMessage({
        id: 'EditListingDeliveryForm.optionalText',
      });

      const { updateListingError, showListingsError } = fetchErrors || {};

      const classes = classNames(css.root, className);
      const submitReady = (updated && pristine) || ready;
      const submitInProgress = updateInProgress;
      const submitDisabled =
        invalid || disabled || submitInProgress || (!shippingEnabled && !pickupEnabled);

      const shippingLabel = intl.formatMessage({ id: 'EditListingDeliveryForm.shippingLabel' });
      const pickupLabel = intl.formatMessage({ id: 'EditListingDeliveryForm.pickupLabel' });

      const pickupClasses = classNames({
        [css.deliveryOption]: displayMultipleDelivery,
        [css.disabled]: !pickupEnabled,
        [css.hidden]: !displayPickup,
      });
      const shippingClasses = classNames({
        [css.deliveryOption]: displayMultipleDelivery,
        [css.disabled]: !shippingEnabled,
        [css.hidden]: !displayShipping,
      });
      const currencyConfig = appSettings.getCurrencyFormatting(marketplaceCurrency);

      return (
        <Form className={classes} onSubmit={handleSubmit}>
          <FieldCheckbox
            id={formId ? `${formId}.pickup` : 'pickup'}
            className={classNames(css.deliveryCheckbox, { [css.hidden]: !displayMultipleDelivery })}
            name="deliveryOptions"
            label={pickupLabel}
            value="pickup"
          />
          <div className={pickupClasses}>
            {updateListingError ? (
              <p className={css.error}>
                <FormattedMessage id="EditListingDeliveryForm.updateFailed" />
              </p>
            ) : null}

            {showListingsError ? (
              <p className={css.error}>
                <FormattedMessage id="EditListingDeliveryForm.showListingFailed" />
              </p>
            ) : null}

            <FieldLocationAutocompleteInput
              disabled={!pickupEnabled}
              rootClassName={css.input}
              inputClassName={css.locationAutocompleteInput}
              iconClassName={css.locationAutocompleteInputIcon}
              predictionsClassName={css.predictionsRoot}
              validClassName={css.validLocation}
              autoFocus={autoFocus}
              name="location"
              id={`${formId}.location`}
              label={intl.formatMessage({ id: 'EditListingDeliveryForm.address' })}
              placeholder={intl.formatMessage({
                id: 'EditListingDeliveryForm.addressPlaceholder',
              })}
              useDefaultPredictions={false}
              format={identity}
              valueFromForm={values.location}
              validate={
                pickupEnabled
                  ? composeValidators(
                      autocompleteSearchRequired(addressRequiredMessage),
                      autocompletePlaceSelected(addressNotRecognizedMessage)
                    )
                  : () => {}
              }
              hideErrorMessage={!pickupEnabled}
              // Whatever parameters are being used to calculate
              // the validation function need to be combined in such
              // a way that, when they change, this key prop
              // changes, thus reregistering this field (and its
              // validation function) with Final Form.
              // See example: https://codesandbox.io/s/changing-field-level-validators-zc8ei
              key={pickupEnabled ? 'locationValidation' : 'noLocationValidation'}
            />

            <FieldTextInput
              className={css.input}
              type="text"
              name="building"
              id={formId ? `${formId}.building` : 'building'}
              label={intl.formatMessage(
                { id: 'EditListingDeliveryForm.building' },
                { optionalText }
              )}
              placeholder={intl.formatMessage({
                id: 'EditListingDeliveryForm.buildingPlaceholder',
              })}
              disabled={!pickupEnabled}
            />
          </div>

          <FieldCheckbox
            id={formId ? `${formId}.shipping` : 'shipping'}
            className={classNames(css.deliveryCheckbox, { [css.hidden]: !displayMultipleDelivery })}
            name="deliveryOptions"
            label={shippingLabel}
            value="shipping"
          />

          <div className={shippingClasses}>
            <FieldCurrencyInput
              id={
                formId
                  ? `${formId}.shippingPriceInSubunitsOneItem`
                  : 'shippingPriceInSubunitsOneItem'
              }
              name="shippingPriceInSubunitsOneItem"
              className={css.input}
              label={intl.formatMessage({
                id: 'EditListingDeliveryForm.shippingOneItemLabel',
              })}
              placeholder={intl.formatMessage({
                id: 'EditListingDeliveryForm.shippingOneItemPlaceholder',
              })}
              currencyConfig={currencyConfig}
              disabled={!shippingEnabled}
              validate={
                shippingEnabled
                  ? required(
                      intl.formatMessage({
                        id: 'EditListingDeliveryForm.shippingOneItemRequired',
                      })
                    )
                  : null
              }
              hideErrorMessage={!shippingEnabled}
              // Whatever parameters are being used to calculate
              // the validation function need to be combined in such
              // a way that, when they change, this key prop
              // changes, thus reregistering this field (and its
              // validation function) with Final Form.
              // See example: https://codesandbox.io/s/changing-field-level-validators-zc8ei
              key={shippingEnabled ? 'oneItemValidation' : 'noOneItemValidation'}
            />

            {allowOrdersOfMultipleItems ? (
              <FieldCurrencyInput
                id={
                  formId
                    ? `${formId}.shippingPriceInSubunitsAdditionalItems`
                    : 'shippingPriceInSubunitsAdditionalItems'
                }
                name="shippingPriceInSubunitsAdditionalItems"
                className={css.input}
                label={intl.formatMessage({
                  id: 'EditListingDeliveryForm.shippingAdditionalItemsLabel',
                })}
                placeholder={intl.formatMessage({
                  id: 'EditListingDeliveryForm.shippingAdditionalItemsPlaceholder',
                })}
                currencyConfig={currencyConfig}
                disabled={!shippingEnabled}
                validate={
                  shippingEnabled
                    ? required(
                        intl.formatMessage({
                          id: 'EditListingDeliveryForm.shippingAdditionalItemsRequired',
                        })
                      )
                    : null
                }
                hideErrorMessage={!shippingEnabled}
                // Whatever parameters are being used to calculate
                // the validation function need to be combined in such
                // a way that, when they change, this key prop
                // changes, thus reregistering this field (and its
                // validation function) with Final Form.
                // See example: https://codesandbox.io/s/changing-field-level-validators-zc8ei
                key={shippingEnabled ? 'additionalItemsValidation' : 'noAdditionalItemsValidation'}
              />
            ) : null}
          </div>

          {appSettings.featureFlags.vendorPickupSchedules && pickupEnabled ? (
            <VendorPickupScheduleFields
              formId={formId}
              values={values}
              form={form}
              intl={intl}
            />
          ) : null}

          <Button
            className={css.submitButton}
            type="submit"
            inProgress={submitInProgress}
            disabled={submitDisabled}
            ready={submitReady}
          >
            {saveActionMsg}
          </Button>
        </Form>
      );
    }}
  />
);

export default EditListingDeliveryForm;
