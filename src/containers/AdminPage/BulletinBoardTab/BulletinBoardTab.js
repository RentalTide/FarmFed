import React, { useState, useEffect } from 'react';
import { useIntl } from '../../../util/reactIntl';

import css from './BulletinBoardTab.module.css';

const EMPTY_BULLETIN = {
  title: '',
  description: '',
  imageUrl: '',
  startDate: '',
  endDate: '',
};

const BulletinBoardTab = props => {
  const {
    bulletins,
    updateInProgress,
    updateSuccess,
    error,
    onUpdateBulletins,
    onClearSuccess,
  } = props;

  const intl = useIntl();

  const [localBulletins, setLocalBulletins] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_BULLETIN });

  useEffect(() => {
    if (bulletins) {
      setLocalBulletins(bulletins);
    }
  }, [bulletins]);

  useEffect(() => {
    if (updateSuccess) {
      const timer = setTimeout(() => onClearSuccess(), 3000);
      return () => clearTimeout(timer);
    }
  }, [updateSuccess, onClearSuccess]);

  const handleAdd = () => {
    setEditingIndex('new');
    setEditForm({ ...EMPTY_BULLETIN });
  };

  const handleEdit = index => {
    setEditingIndex(index);
    setEditForm({ ...localBulletins[index] });
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditForm({ ...EMPTY_BULLETIN });
  };

  const handleDelete = index => {
    const updated = localBulletins.filter((_, i) => i !== index);
    setLocalBulletins(updated);
    onUpdateBulletins({ bulletins: updated });
  };

  const handleFormChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveBulletin = e => {
    e.preventDefault();
    if (!editForm.title.trim()) return;

    let updated;
    if (editingIndex === 'new') {
      updated = [...localBulletins, { ...editForm }];
    } else {
      updated = localBulletins.map((b, i) => (i === editingIndex ? { ...editForm } : b));
    }

    setLocalBulletins(updated);
    setEditingIndex(null);
    setEditForm({ ...EMPTY_BULLETIN });
    onUpdateBulletins({ bulletins: updated });
  };

  const renderBulletinForm = () => (
    <form className={css.bulletinForm} onSubmit={handleSaveBulletin}>
      <label className={css.label}>
        {intl.formatMessage({ id: 'AdminPage.bulletinTitle' })}
        <input
          className={css.input}
          type="text"
          value={editForm.title}
          onChange={e => handleFormChange('title', e.target.value)}
          placeholder={intl.formatMessage({ id: 'AdminPage.bulletinTitlePlaceholder' })}
          disabled={updateInProgress}
          required
        />
      </label>

      <label className={css.label}>
        {intl.formatMessage({ id: 'AdminPage.bulletinDescription' })}
        <textarea
          className={css.textarea}
          value={editForm.description}
          onChange={e => handleFormChange('description', e.target.value)}
          placeholder={intl.formatMessage({ id: 'AdminPage.bulletinDescriptionPlaceholder' })}
          disabled={updateInProgress}
          rows={4}
        />
      </label>

      <label className={css.label}>
        {intl.formatMessage({ id: 'AdminPage.bulletinImageUrl' })}
        <input
          className={css.input}
          type="text"
          value={editForm.imageUrl}
          onChange={e => handleFormChange('imageUrl', e.target.value)}
          placeholder={intl.formatMessage({ id: 'AdminPage.bulletinImageUrlPlaceholder' })}
          disabled={updateInProgress}
        />
      </label>

      <div className={css.dateRow}>
        <label className={css.label}>
          {intl.formatMessage({ id: 'AdminPage.bulletinStartDate' })}
          <input
            className={css.dateInput}
            type="date"
            value={editForm.startDate}
            onChange={e => handleFormChange('startDate', e.target.value)}
            disabled={updateInProgress}
          />
        </label>

        <label className={css.label}>
          {intl.formatMessage({ id: 'AdminPage.bulletinEndDate' })}
          <input
            className={css.dateInput}
            type="date"
            value={editForm.endDate}
            onChange={e => handleFormChange('endDate', e.target.value)}
            disabled={updateInProgress}
          />
        </label>
      </div>

      <div className={css.formActions}>
        <button type="submit" className={css.submitButton} disabled={updateInProgress}>
          {intl.formatMessage({ id: 'AdminPage.saveBulletin' })}
        </button>
        <button type="button" className={css.cancelButton} onClick={handleCancel}>
          {intl.formatMessage({ id: 'AdminPage.cancelBulletin' })}
        </button>
      </div>
    </form>
  );

  return (
    <div>
      <p className={css.description}>
        {intl.formatMessage({ id: 'AdminPage.bulletinBoardDescription' })}
      </p>

      {localBulletins.length > 0 ? (
        <div className={css.bulletinList}>
          {localBulletins.map((bulletin, index) => (
            <div key={index} className={css.bulletinItem}>
              {editingIndex === index ? (
                renderBulletinForm()
              ) : (
                <div className={css.bulletinContent}>
                  <div className={css.bulletinHeader}>
                    <h3 className={css.bulletinItemTitle}>{bulletin.title}</h3>
                    <div className={css.bulletinActions}>
                      <button
                        type="button"
                        className={css.editButton}
                        onClick={() => handleEdit(index)}
                        disabled={updateInProgress}
                      >
                        {intl.formatMessage({ id: 'AdminPage.editBulletin' })}
                      </button>
                      <button
                        type="button"
                        className={css.deleteButton}
                        onClick={() => handleDelete(index)}
                        disabled={updateInProgress}
                      >
                        {intl.formatMessage({ id: 'AdminPage.deleteBulletin' })}
                      </button>
                    </div>
                  </div>
                  {bulletin.description && (
                    <p className={css.bulletinItemDescription}>{bulletin.description}</p>
                  )}
                  {(bulletin.startDate || bulletin.endDate) && (
                    <div className={css.bulletinDates}>
                      {bulletin.startDate && <span>{bulletin.startDate}</span>}
                      {bulletin.startDate && bulletin.endDate && <span> - </span>}
                      {bulletin.endDate && <span>{bulletin.endDate}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className={css.emptyMessage}>
          {intl.formatMessage({ id: 'AdminPage.noBulletins' })}
        </p>
      )}

      {editingIndex === 'new' ? (
        renderBulletinForm()
      ) : (
        <button
          type="button"
          className={css.addButton}
          onClick={handleAdd}
          disabled={updateInProgress || editingIndex !== null}
        >
          {intl.formatMessage({ id: 'AdminPage.addBulletin' })}
        </button>
      )}

      {updateSuccess && (
        <p className={css.successMessage}>
          {intl.formatMessage({ id: 'AdminPage.saveSuccess' })}
        </p>
      )}
      {error && (
        <p className={css.errorMessage}>
          {intl.formatMessage({ id: 'AdminPage.saveError' })}
        </p>
      )}
    </div>
  );
};

export default BulletinBoardTab;
