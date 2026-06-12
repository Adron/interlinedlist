import Link from 'next/link';
import { PRODUCTS } from '@/lib/products';

export const metadata = {
  title: 'Products — InterlinedList',
  description:
    'Native apps and desktop synchronization tools for InterlinedList — all currently in development.',
};

export default function ProductsPage() {
  const apps = PRODUCTS.filter((p) => p.category === 'app');
  const syncTools = PRODUCTS.filter((p) => p.category === 'sync');

  return (
    <div className="container-fluid container-fluid-max py-4">
      {/* Hero */}
      <div className="row mb-4">
        <div className="col-12 text-center" style={{ padding: '2rem 0 1rem' }}>
          <h1 className="h2 mb-2">Products</h1>
          <p className="text-muted" style={{ maxWidth: '600px', margin: '0 auto' }}>
            Native apps and desktop synchronization tools for InterlinedList. Everything here is
            in development — coming soon.
          </p>
        </div>
      </div>

      {/* Apps */}
      <div className="row mb-2">
        <div className="col-12">
          <h5 className="mb-3">
            <i className="bx bx-devices fs-18 align-middle me-2"></i>
            Apps
          </h5>
        </div>
      </div>
      <div className="row g-4 mb-4">
        {apps.map((product) => (
          <div key={product.slug} className="col-lg-6 col-12">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                  <i className={`bx ${product.icon} fs-32 text-primary`}></i>
                  <h5 className="card-title mb-0">{product.name}</h5>
                  <span className="badge bg-secondary fw-normal" style={{ fontSize: '0.7rem' }}>
                    Coming Soon
                  </span>
                </div>
                <p className="card-text text-muted">{product.summary}</p>
                <Link
                  href={`/products/${product.slug}`}
                  className="text-primary"
                  style={{ textDecoration: 'none', fontWeight: 500 }}
                >
                  Learn more &rarr;
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Synchronization Tools */}
      <div className="row mb-2">
        <div className="col-12">
          <h5 className="mb-3">
            <i className="bx bx-sync fs-18 align-middle me-2"></i>
            Synchronization Tools
          </h5>
        </div>
      </div>
      <div className="row g-4 mb-4">
        {syncTools.map((product) => (
          <div key={product.slug} className="col-lg-4 col-md-6 col-12">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                  <i className={`bx ${product.icon} fs-32 text-primary`}></i>
                  <h5 className="card-title mb-0">{product.name}</h5>
                  <span className="badge bg-secondary fw-normal" style={{ fontSize: '0.7rem' }}>
                    Coming Soon
                  </span>
                </div>
                <p className="card-text text-muted">{product.summary}</p>
                <Link
                  href={`/products/${product.slug}`}
                  className="text-primary"
                  style={{ textDecoration: 'none', fontWeight: 500 }}
                >
                  Learn more &rarr;
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Back to home */}
      <div className="row mb-4">
        <div className="col-12 text-center">
          <Link href="/" className="btn btn-outline-secondary">
            <i className="bx bx-arrow-back align-middle me-1"></i>
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
