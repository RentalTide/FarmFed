import React, { useEffect } from 'react';
import { useIntl } from '../../../util/reactIntl';

import css from './ListingShuffleTab.module.css';

const formatWhen = iso => {
  try {
    return new Date(iso).toLocaleString();
  } catch (e) {
    return iso;
  }
};

const ListingShuffleTab = props => {
  const {
    shuffleSettings,
    updateInProgress,
    updateSuccess,
    error,
    runInProgress,
    runResult,
    onUpdateSettings,
    onRunNow,
    onClearSuccess,
  } = props;

  const intl = useIntl();

  const enabled = !!shuffleSettings?.enabled;
  const lastRun = shuffleSettings?.lastRun;

  useEffect(() => {
    if (updateSuccess) {
      const timer = setTimeout(() => onClearSuccess(), 3000);
      return () => clearTimeout(timer);
    }
  }, [updateSuccess, onClearSuccess]);

  const handleToggle = () => {
    if (!updateInProgress) {
      onUpdateSettings({ enabled: !enabled });
    }
  };

  const runFailures =
    runResult && (Array.isArray(runResult.failures) ? runResult.failures.length : runResult.failures);

  return (
    <div>
      <div className={css.currentSetting}>
        <div className={css.currentSettingLabel}>
          {intl.formatMessage({ id: 'AdminPage.shuffleStatusLabel' })}
        </div>
        <div className={css.currentSettingValue}>
          {enabled
            ? intl.formatMessage({ id: 'AdminPage.shuffleEnabled' })
            : intl.formatMessage({ id: 'AdminPage.shuffleDisabled' })}
        </div>
        {lastRun ? (
          <div className={css.currentSettingStatus}>
            {intl.formatMessage(
              { id: 'AdminPage.shuffleLastRun' },
              {
                when: formatWhen(lastRun.at),
                updated: lastRun.updated,
                total: lastRun.total,
                failures: lastRun.failures,
              }
            )}
          </div>
        ) : (
          <div className={css.currentSettingStatus}>
            {intl.formatMessage({ id: 'AdminPage.shuffleNeverRun' })}
          </div>
        )}
      </div>

      <p className={css.help}>{intl.formatMessage({ id: 'AdminPage.shuffleHelp' })}</p>

      <div className={css.form}>
        <label className={css.label}>
          {intl.formatMessage({ id: 'AdminPage.shuffleEnabledLabel' })}
          <div className={css.toggleWrapper}>
            <button
              type="button"
              className={enabled ? css.toggleActive : css.toggle}
              onClick={handleToggle}
              disabled={updateInProgress}
              aria-pressed={enabled}
            >
              <span className={css.toggleKnob} />
            </button>
            <span className={css.toggleText}>
              {enabled
                ? intl.formatMessage({ id: 'AdminPage.shuffleToggleOn' })
                : intl.formatMessage({ id: 'AdminPage.shuffleToggleOff' })}
            </span>
          </div>
        </label>

        <div className={css.runSection}>
          <button
            type="button"
            className={css.runButton}
            onClick={onRunNow}
            disabled={runInProgress}
          >
            {runInProgress
              ? intl.formatMessage({ id: 'AdminPage.shuffleRunning' })
              : intl.formatMessage({ id: 'AdminPage.shuffleRunNow' })}
          </button>
          <p className={css.runHelp}>{intl.formatMessage({ id: 'AdminPage.shuffleRunHelp' })}</p>
        </div>
      </div>

      {updateSuccess && (
        <p className={css.successMessage}>
          {intl.formatMessage({ id: 'AdminPage.saveSuccess' })}
        </p>
      )}
      {runResult && !runInProgress && (
        <p className={css.successMessage}>
          {intl.formatMessage(
            { id: 'AdminPage.shuffleRunDone' },
            { updated: runResult.updated, total: runResult.total, failures: runFailures }
          )}
        </p>
      )}
      {error && (
        <p className={css.errorMessage}>{intl.formatMessage({ id: 'AdminPage.saveError' })}</p>
      )}
    </div>
  );
};

export default ListingShuffleTab;
