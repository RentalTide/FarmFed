import React, { useState } from 'react';
import { useIntl, FormattedMessage } from '../../../util/reactIntl';

import css from './PushNotificationsTab.module.css';

const formatDate = dateStr => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const PushNotificationsTab = props => {
  const {
    announcements = [],
    sendInProgress,
    sendSuccess,
    sendError,
    toggleInProgress,
    onSend,
    onToggleActive,
    onClearSuccess,
  } = props;

  const intl = useIntl();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');

  const canSend = title.trim() && body.trim() && !sendInProgress;

  const handleSubmit = e => {
    e.preventDefault();
    if (!canSend) return;
    onSend({ title: title.trim(), body: body.trim(), link: link.trim() || undefined }).then(() => {
      setTitle('');
      setBody('');
      setLink('');
    });
  };

  return (
    <div className={css.root}>
      <p className={css.intro}>
        <FormattedMessage id="AdminPage.pushIntro" />
      </p>

      <form className={css.form} onSubmit={handleSubmit}>
        <label className={css.fieldLabel} htmlFor="push-title">
          <FormattedMessage id="AdminPage.pushTitleLabel" />
        </label>
        <input
          id="push-title"
          className={css.input}
          value={title}
          maxLength={80}
          onChange={e => {
            setTitle(e.target.value);
            if (sendSuccess) onClearSuccess();
          }}
          placeholder={intl.formatMessage({ id: 'AdminPage.pushTitlePlaceholder' })}
        />

        <label className={css.fieldLabel} htmlFor="push-body">
          <FormattedMessage id="AdminPage.pushBodyLabel" />
        </label>
        <textarea
          id="push-body"
          className={css.textarea}
          value={body}
          maxLength={300}
          rows={3}
          onChange={e => {
            setBody(e.target.value);
            if (sendSuccess) onClearSuccess();
          }}
          placeholder={intl.formatMessage({ id: 'AdminPage.pushBodyPlaceholder' })}
        />

        <label className={css.fieldLabel} htmlFor="push-link">
          <FormattedMessage id="AdminPage.pushLinkLabel" />
        </label>
        <input
          id="push-link"
          className={css.input}
          value={link}
          onChange={e => setLink(e.target.value)}
          placeholder={intl.formatMessage({ id: 'AdminPage.pushLinkPlaceholder' })}
        />

        {sendError ? (
          <p className={css.error}>
            <FormattedMessage id="AdminPage.pushError" />
          </p>
        ) : null}
        {sendSuccess ? (
          <p className={css.success}>
            <FormattedMessage id="AdminPage.pushSuccess" />
          </p>
        ) : null}

        <button className={css.sendButton} type="submit" disabled={!canSend}>
          {sendInProgress ? (
            <FormattedMessage id="AdminPage.pushSending" />
          ) : (
            <FormattedMessage id="AdminPage.pushSendButton" />
          )}
        </button>
      </form>

      <section className={css.history}>
        <h3 className={css.sectionTitle}>
          <FormattedMessage id="AdminPage.pushHistoryHeading" />
        </h3>
        {announcements.length === 0 ? (
          <p className={css.emptyState}>
            <FormattedMessage id="AdminPage.pushHistoryEmpty" />
          </p>
        ) : (
          <div className={css.list}>
            {announcements.map(a => (
              <div key={a.id} className={css.row}>
                <div className={css.rowInfo}>
                  <span className={css.rowTitle}>{a.title}</span>
                  <span className={css.rowBody}>{a.body}</span>
                  <span className={css.rowMeta}>
                    <FormattedMessage
                      id="AdminPage.pushSentMeta"
                      values={{ count: a.sentCount || 0, date: formatDate(a.createdAt) }}
                    />
                  </span>
                </div>
                <button
                  className={css.toggleButton}
                  type="button"
                  disabled={toggleInProgress}
                  onClick={() => onToggleActive({ id: a.id, active: a.active === false })}
                >
                  {a.active === false ? (
                    <FormattedMessage id="AdminPage.pushShowBanner" />
                  ) : (
                    <FormattedMessage id="AdminPage.pushHideBanner" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default PushNotificationsTab;
