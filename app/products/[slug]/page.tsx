import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PRODUCTS, getProduct } from '@/lib/products';

interface ProductPageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return PRODUCTS.map((product) => ({ slug: product.slug }));
}

export function generateMetadata({ params }: ProductPageProps) {
  const product = getProduct(params.slug);
  if (!product) {
    return { title: 'Product Not Found — InterlinedList' };
  }
  return {
    title: `${product.name} — InterlinedList`,
    description: product.summary,
  };
}

export default function ProductPage({ params }: ProductPageProps) {
  const product = getProduct(params.slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="container-fluid container-fluid-max py-4">
      <div className="row justify-content-center">
        <div className="col-lg-8 col-12">
          {/* Breadcrumb back to products */}
          <div className="mb-3">
            <Link
              href="/products"
              className="text-primary"
              style={{ textDecoration: 'none', fontWeight: 500 }}
            >
              <i className="bx bx-chevron-left align-middle"></i>
              All products
            </Link>
          </div>

          <div className="card">
            <div className="card-body" style={{ padding: '2rem' }}>
              {/* Product name */}
              <div className="d-flex align-items-center gap-3 mb-3">
                <i className={`bx ${product.icon} fs-32 text-primary`}></i>
                <h1 className="h2 mb-0">{product.name}</h1>
              </div>

              {/* Coming soon callout */}
              <div className="alert alert-info d-flex align-items-center gap-2 mb-4" role="alert">
                <i className="bx bx-time-five fs-18 flex-shrink-0"></i>
                <strong>Coming soon, in development.</strong>
              </div>

              {/* Description */}
              <p className="text-muted mb-4">{product.description}</p>

              {/* Links */}
              <div className="d-flex gap-3 flex-wrap">
                <Link href="/" className="btn btn-primary">
                  <i className="bx bx-arrow-back align-middle me-1"></i>
                  Back to home
                </Link>
                <Link href="/products" className="btn btn-outline-secondary">
                  View all products
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
