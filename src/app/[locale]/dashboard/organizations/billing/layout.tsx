import type { ReactNode } from 'react';

import styles from './billing-ui-v2.module.css';

export default function BillingLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell} data-risck-billing-shell="risck-ui-v2">
      {children}
    </div>
  );
}
