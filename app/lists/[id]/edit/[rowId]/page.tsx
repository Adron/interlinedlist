import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getListWithAncestorChain, getListProperties, getListDataRowById } from '@/lib/lists/queries';
import Link from 'next/link';
import ListBreadcrumbs from '@/components/lists/ListBreadcrumbs';
import ListChildLinks from '@/components/lists/ListChildLinks';
import EditRowForm from './EditRowForm';

interface EditRowPageProps {
  params: { id: string; rowId: string };
}

export default async function EditRowPage({ params }: EditRowPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const { id: listId, rowId } = params;

  const [chainResult, properties, row] = await Promise.all([
    getListWithAncestorChain(listId, user.id),
    getListProperties(listId, user.id),
    getListDataRowById(rowId, listId, user.id),
  ]);

  if (!chainResult || !properties) {
    notFound();
  }

  const { list, ancestors } = chainResult;

  if (!row) {
    notFound();
  }

  // Normalize rowData for the form: DB uses JsonValue (can be null), form expects Record<string, any>
  const rowData =
    row.rowData &&
    typeof row.rowData === 'object' &&
    !Array.isArray(row.rowData)
      ? (row.rowData as Record<string, any>)
      : {};

  const breadcrumbItems = [
    { label: 'Lists', href: '/lists' },
    ...ancestors.map((a) => ({ label: a.title, href: `/lists/${a.id}` })),
    { label: list.title, href: `/lists/${listId}` },
    { label: 'Edit Row' },
  ];

  return (
    <div className="container-fluid container-fluid-max py-4">
      <ListBreadcrumbs items={breadcrumbItems} />
      {list.children && list.children.length > 0 && (
        <ListChildLinks children={list.children} />
      )}
      <div className="row mb-4">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <h1 className="h3 mb-0">Edit Row</h1>
          <Link
            href={`/lists/${listId}`}
            className="btn btn-outline-secondary"
          >
            <i className="bx bx-x me-1"></i>
            Cancel
          </Link>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <EditRowForm
                listId={listId}
                rowId={rowId}
                fields={properties}
                initialRowData={{ rowData }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
