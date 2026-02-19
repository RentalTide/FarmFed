import React, { useEffect, useState } from 'react';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { ResponsiveImage, Modal } from '../../components';
import { isNativeApp } from '../../util/capacitor';

import ImageCarousel from './ImageCarousel/ImageCarousel';

import css from './ListingPage.module.css';

const VIEW_PHOTOS_BUTTON_ID = 'viewPhotosButton';

const ShareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const handleShare = async (shareData, intl) => {
  const { title, text, url } = shareData;

  // 1. Native Capacitor share
  if (isNativeApp()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title, text, url, dialogTitle: title });
      return;
    } catch (e) {
      // fall through to web share
    }
  }

  // 2. Web Share API
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
      // fall through to clipboard
    }
  }

  // 3. Clipboard fallback
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(url);
      return;
    } catch (e) {
      // ignore
    }
  }
};

const SectionHero = props => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    title,
    listing,
    isOwnListing,
    handleViewPhotosClick,
    imageCarouselOpen,
    onImageCarouselClose,
    onManageDisableScrolling,
    actionBar,
    shareData,
  } = props;

  const intl = useIntl();

  const hasImages = listing.images && listing.images.length > 0;
  const firstImage = hasImages ? listing.images[0] : null;
  const variants = firstImage
    ? Object.keys(firstImage?.attributes?.variants).filter(k => k.startsWith('scaled'))
    : [];

  const viewPhotosButton = hasImages ? (
    <button id={VIEW_PHOTOS_BUTTON_ID} className={css.viewPhotos} onClick={handleViewPhotosClick}>
      <FormattedMessage
        id="ListingPage.viewImagesButton"
        values={{ count: listing.images.length }}
      />
    </button>
  ) : null;

  const shareButton = mounted && shareData ? (
    <button
      className={css.shareButton}
      onClick={e => {
        e.stopPropagation();
        handleShare(shareData, intl);
      }}
      type="button"
      aria-label={intl.formatMessage({ id: 'ListingPage.shareListing' })}
    >
      <ShareIcon />
    </button>
  ) : null;

  return (
    <section className={css.sectionHero} data-testid="hero">
      <div className={css.imageWrapperForSectionHero} onClick={handleViewPhotosClick}>
        {mounted && listing.id && isOwnListing ? (
          <div onClick={e => e.stopPropagation()} className={css.actionBarContainerForHeroLayout}>
            {actionBar}
          </div>
        ) : null}

        {shareButton}

        <ResponsiveImage
          rootClassName={css.rootForImage}
          alt={title}
          image={firstImage}
          variants={variants}
        />
        {viewPhotosButton}
      </div>
      <Modal
        id="ListingPage.imageCarousel"
        scrollLayerClassName={css.carouselModalScrollLayer}
        containerClassName={css.carouselModalContainer}
        lightCloseButton
        isOpen={imageCarouselOpen}
        onClose={onImageCarouselClose}
        usePortal
        onManageDisableScrolling={onManageDisableScrolling}
        focusElementId={VIEW_PHOTOS_BUTTON_ID}
      >
        <ImageCarousel
          images={listing.images}
          imageVariants={['scaled-small', 'scaled-medium', 'scaled-large', 'scaled-xlarge']}
        />
      </Modal>
    </section>
  );
};

export default SectionHero;
