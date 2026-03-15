import React, { useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import appSettings from '../../config/settings';
import { IconSpinner } from '../../components';

import css from './DeliveryProblemModal.module.css';

const STEP_CATEGORY = 1;
const STEP_DESCRIPTION = 2;
const STEP_CONFIRMATION = 3;

const CATEGORIES = ['delivery_issue', 'contents_issue', 'both'];

/**
 * A multi-step modal for reporting delivery problems.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {boolean} props.isOpen whether the modal is currently visible
 * @param {Function} props.onClose callback to close the modal
 * @param {Function} props.onSubmit callback when the report is submitted, receives { category, description }
 * @param {boolean} props.inProgress whether the submit request is in progress
 * @returns {JSX.Element|null} delivery problem modal component
 */
const DeliveryProblemModal = props => {
  const { className, rootClassName, isOpen, onClose, onSubmit, inProgress } = props;

  const intl = useIntl();
  const [step, setStep] = useState(STEP_CATEGORY);
  const [category, setCategory] = useState(null);
  const [description, setDescription] = useState('');

  // Feature-flag gate
  if (!appSettings.featureFlags.deliveryProblemReport) {
    return null;
  }

  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = e => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleClose = () => {
    setStep(STEP_CATEGORY);
    setCategory(null);
    setDescription('');
    onClose();
  };

  const handleNext = () => {
    if (step === STEP_CATEGORY && category) {
      setStep(STEP_DESCRIPTION);
    }
  };

  const handleBack = () => {
    if (step === STEP_DESCRIPTION) {
      setStep(STEP_CATEGORY);
    }
  };

  const handleSubmit = () => {
    if (step === STEP_DESCRIPTION && description.trim()) {
      onSubmit({ category, description: description.trim() });
      setStep(STEP_CONFIRMATION);
    }
  };

  const classes = classNames(rootClassName || css.root, className);

  const renderStepIndicator = () => (
    <div className={css.stepIndicator}>
      {[STEP_CATEGORY, STEP_DESCRIPTION, STEP_CONFIRMATION].map(s => (
        <div
          key={s}
          className={classNames(css.stepDot, {
            [css.stepDotActive]: s === step,
            [css.stepDotCompleted]: s < step,
          })}
        />
      ))}
    </div>
  );

  const renderCategoryStep = () => (
    <div className={css.stepContent}>
      <h3 className={css.stepTitle}>
        <FormattedMessage id="DeliveryProblemModal.categoryTitle" />
      </h3>
      <p className={css.stepDescription}>
        <FormattedMessage id="DeliveryProblemModal.categoryDescription" />
      </p>
      <div className={css.radioGroup}>
        {CATEGORIES.map(cat => (
          <label key={cat} className={css.radioLabel}>
            <input
              type="radio"
              name="deliveryProblemCategory"
              className={css.radioInput}
              value={cat}
              checked={category === cat}
              onChange={() => setCategory(cat)}
            />
            <span className={css.radioCustom} />
            <span className={css.radioText}>
              {intl.formatMessage({ id: `DeliveryProblemModal.category.${cat}` })}
            </span>
          </label>
        ))}
      </div>
      <div className={css.actions}>
        <button type="button" className={css.cancelButton} onClick={handleClose}>
          <FormattedMessage id="DeliveryProblemModal.cancel" />
        </button>
        <button
          type="button"
          className={css.primaryButton}
          onClick={handleNext}
          disabled={!category}
        >
          <FormattedMessage id="DeliveryProblemModal.next" />
        </button>
      </div>
    </div>
  );

  const renderDescriptionStep = () => (
    <div className={css.stepContent}>
      <h3 className={css.stepTitle}>
        <FormattedMessage id="DeliveryProblemModal.descriptionTitle" />
      </h3>
      <p className={css.stepDescription}>
        <FormattedMessage id="DeliveryProblemModal.descriptionPrompt" />
      </p>
      <textarea
        className={css.textarea}
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder={intl.formatMessage({ id: 'DeliveryProblemModal.descriptionPlaceholder' })}
        rows={5}
      />
      <div className={css.actions}>
        <button type="button" className={css.cancelButton} onClick={handleBack}>
          <FormattedMessage id="DeliveryProblemModal.back" />
        </button>
        <button
          type="button"
          className={css.primaryButton}
          onClick={handleSubmit}
          disabled={!description.trim() || inProgress}
        >
          {inProgress ? (
            <IconSpinner rootClassName={css.spinner} />
          ) : (
            <FormattedMessage id="DeliveryProblemModal.submit" />
          )}
        </button>
      </div>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className={css.stepContent}>
      <div className={css.confirmationMessage}>
        <h3 className={css.stepTitle}>
          <FormattedMessage id="DeliveryProblemModal.confirmationTitle" />
        </h3>
        <p className={css.stepDescription}>
          <FormattedMessage id="DeliveryProblemModal.confirmationMessage" />
        </p>
      </div>
      <div className={css.actions}>
        <button type="button" className={css.primaryButton} onClick={handleClose}>
          <FormattedMessage id="DeliveryProblemModal.close" />
        </button>
      </div>
    </div>
  );

  return (
    <div className={css.overlay} onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div className={classes}>
        <button
          type="button"
          className={css.closeButton}
          onClick={handleClose}
          aria-label={intl.formatMessage({ id: 'DeliveryProblemModal.closeAriaLabel' })}
        >
          &times;
        </button>

        {renderStepIndicator()}

        {step === STEP_CATEGORY ? renderCategoryStep() : null}
        {step === STEP_DESCRIPTION ? renderDescriptionStep() : null}
        {step === STEP_CONFIRMATION ? renderConfirmationStep() : null}
      </div>
    </div>
  );
};

export default DeliveryProblemModal;
