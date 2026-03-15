import React from 'react';
import { FormattedMessage } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { LINE_ITEM_SALES_TAX } from '../../util/types';

import css from './OrderBreakdown.module.css';

const LineItemTaxMaybe = props => {
  const { lineItems, intl } = props;

  const taxLineItem = lineItems.find(
    item => item.code === LINE_ITEM_SALES_TAX && !item.reversal
  );

  return taxLineItem ? (
    <div className={css.lineItem}>
      <span className={css.itemLabel}>
        <FormattedMessage id="OrderBreakdown.salesTax" />
      </span>
      <span className={css.itemValue}>{formatMoney(intl, taxLineItem.lineTotal)}</span>
    </div>
  ) : null;
};

export default LineItemTaxMaybe;
