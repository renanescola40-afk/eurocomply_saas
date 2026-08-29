import type { ReactNode } from 'react';

import styles from './fria-ui-v2.module.css';

export default function FriaLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell} data-risck-fria-shell="risck-ui-v2">
      {children}
    </div>
  );
}
