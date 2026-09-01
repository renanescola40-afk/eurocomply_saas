import styles from './public-commercial-route-v2.module.css';

type PublicCommercialSurface = 'pricing' | 'enterprise' | 'book-demo' | 'contact';

type Props = {
  children: React.ReactNode;
  surface: PublicCommercialSurface;
};

export function PublicCommercialRouteV2({ children, surface }: Props) {
  return (
    <div className={styles.frame} data-public-commercial-v2={surface}>
      {children}
    </div>
  );
}
